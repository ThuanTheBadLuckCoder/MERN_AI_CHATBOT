import { DynamicTool } from "@langchain/core/tools";
import { model } from "../../../config/openai-config.js";
// import { modelGemini } from "../../../config/gemini-config.js";
import { modelGemini } from "../../../config/gemini-config.js";
import { ChatPromptTemplate, MessagesPlaceholder, } from "@langchain/core/prompts";
import { convertToOpenAIFunction } from "@langchain/core/utils/function_calling";
import { RunnableSequence } from "@langchain/core/runnables";
import { AgentExecutor } from "langchain/agents";
import { formatToOpenAIFunctionMessages } from "langchain/agents/format_scratchpad";
import { OpenAIFunctionsAgentOutputParser } from "langchain/agents/openai/output_parser";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ElasticVectorSearch } from "@langchain/community/vectorstores/elasticsearch";
import { Client } from "@elastic/elasticsearch";
import { config, embeddingsOpenAI } from "../../../config/elastic-config.js";
import { z } from "zod";
const MEMORY_KEY = "chat_history";
// ElasticSearch configuration
const clientArgs = {
    client: new Client(config),
    indexName: process.env.ELASTIC_INDEX ?? `*`,
};
const elasticVectorSearch = new ElasticVectorSearch(embeddingsOpenAI, clientArgs);
// ElasticSearch tool for retrieving relevant context
const elasticSearchTool = new DynamicTool({
    name: 'elastic_search_tool',
    description: 'This tool retrieves documents using ElasticSearch vector search',
    func: async (input) => {
        // Validate the input using Zod schema (expecting input to be a string)
        const schema = z.string();
        const filter = [
            {
                operator: "wildcard",
                field: "source",
                value: "*",
            },
        ];
        const validationResult = schema.safeParse(input);
        if (!validationResult.success) {
            throw new Error("Invalid input: " + validationResult.error.message);
        }
        // Use input directly as the query string
        const similaritySearchResults = await elasticVectorSearch.similaritySearch(input, 3, filter);
        const context = similaritySearchResults.map((result) => result.pageContent);
        return context.length > 0 ? context : null;
    }
});
// Question type analyzer tool
const questionAnalyzerTool = new DynamicTool({
    name: 'question_analyzer_tool',
    description: 'Analyzes if the current question is a new question or a follow-up to previous questions',
    func: async (inputStr) => {
        try {
            // Parse the input as JSON
            const input = JSON.parse(inputStr);
            // If no chat history, it's definitely a new question
            if (!input.chatHistory || input.chatHistory.length === 0) {
                return "new-question";
            }
            // Format the chat history and current question for the model
            const messages = [
                new SystemMessage({
                    content: `You are a question analyzer. You need to determine if the given question is a new question 
                    or a follow-up question related to the previous conversation. 
                    
                    Reply with ONLY one of these two keywords:
                    - "new-question": if it's a completely new topic not directly related to previous questions
                    - "follow-up": if it builds upon, refines, or refers to previous questions/answers
                    
                    Do not include any other text in your response.`
                }),
                ...input.chatHistory,
                new HumanMessage({
                    content: `Current question: ${input.currentQuestion}
                    
                    Is this a new question or a follow-up to our previous conversation? Answer with only "new-question" or "follow-up".`
                })
            ];
            // Use the model to analyze
            const response = await modelGemini.invoke(messages);
            // Check if response.content is a string and get its value
            const responseContent = typeof response.content === 'string'
                ? response.content
                : JSON.stringify(response.content);
            const analysisResult = responseContent.toLowerCase();
            // Ensure we only return one of the two expected values
            return analysisResult.includes("follow-up") ? "follow-up" : "new-question";
        }
        catch (error) {
            console.error("Error analyzing question:", error);
            return "new-question"; // Default to new question on error
        }
    }
});
const tools = [elasticSearchTool, questionAnalyzerTool];
// Front-end development prompt with Chain of Thought reasoning
const frontEndDevPrompt = ChatPromptTemplate.fromMessages([
    ["system",
        `You are a chatbot for front-end developers. 
        Respond only to technical questions about front-end 
        development or programming. Do not discuss unrelated 
        or sensitive topics. If the input is ambiguous or 
        irrelevant, respond with "I don't know."
        
        Question type: {question_type}
        
        If this is a follow-up question, make sure your answer builds upon the previous conversation
        and addresses the specific follow-up aspects of the question.
        
        If this is a new question, provide a comprehensive answer based on the context.
        
        IMPORTANT: Implement Chain of Thought reasoning by following these steps:
        1. Think through the problem step by step before answering.
        2. Break down complex problems into smaller parts.
        3. Explicitly show your reasoning process by describing your thought process.
        4. First understand what the user is asking for, then search for relevant information.
        5. Synthesize the information to provide a coherent answer.
        6. When providing code examples, never cut any code even by a single line.
        7. Display your full thinking process with <thinking> tags before providing the final answer.

        Context from relevant documentation: {context}
        Input: {input}`],
    new MessagesPlaceholder(MEMORY_KEY),
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
]);
// Model with OpenAI functions - Now configured for chain of thought
const modelWithFunctions = model.bind({
    functions: tools.map((tool) => convertToOpenAIFunction(tool)),
});
// Implement a custom output parser that preserves chain of thought
class ChainOfThoughtOutputParser extends OpenAIFunctionsAgentOutputParser {
    async parse(text) {
        // First let the original parser handle function calling and standard outputs
        const standardOutput = await super.parse(text);
        // Preserve any thinking process in the output
        if (text.includes("<thinking>") && text.includes("</thinking>")) {
            const thinkingContent = text.split("<thinking>")[1].split("</thinking>")[0].trim();
            standardOutput.chainOfThought = thinkingContent;
        }
        return standardOutput;
    }
}
const runnableAgent = RunnableSequence.from([
    {
        input: (i) => i.input,
        agent_scratchpad: (i) => formatToOpenAIFunctionMessages(i.steps),
        context: async (i) => {
            const contextResults = await elasticSearchTool.func(i.input);
            console.log("contextResults: ", contextResults);
            return contextResults ? contextResults.join("\n") : "No relevant context found.";
        },
        chat_history: (i) => i.chat_history || [],
        question_type: async (i) => {
            if (!i.chat_history || i.chat_history.length === 0) {
                return "new-question";
            }
            // Create a JSON string to pass to the question analyzer tool
            const analyzerInput = JSON.stringify({
                currentQuestion: i.input,
                chatHistory: i.chat_history
            });
            const analysisResult = await questionAnalyzerTool.func(analyzerInput);
            console.log("Question type analysis: ", analysisResult);
            return analysisResult;
        }
    },
    frontEndDevPrompt,
    modelWithFunctions,
    new ChainOfThoughtOutputParser(), // Use custom parser that preserves chain of thought
]);
// Add a callback handler to log the chain of thought
const executorGPT = AgentExecutor.fromAgentAndTools({
    agent: runnableAgent,
    tools,
    verbose: true, // Enable verbose mode to see the agent's thinking
    handleParsingErrors: true, // Better handle errors
    returnIntermediateSteps: true, // Return all steps for debugging and transparency
});
// Add middleware to handle code formatting and ensure no code is cut
const executeWithCodeHandling = async (input, chatHistory = []) => {
    // Execute the agent
    const result = await executorGPT.invoke({
        input,
        chat_history: chatHistory
    });
    // Post-process to ensure code blocks are intact
    if (typeof result.output === 'string') {
        // If the result contains code blocks, ensure they're not truncated
        const codeRegex = /```[\s\S]*?```/g;
        let modifiedOutput = result.output;
        // Replace each code block with a clean version that ensures no lines are cut
        modifiedOutput = modifiedOutput.replace(codeRegex, (match) => {
            // Remove the backticks to get just the content
            const codeContent = match.replace(/```[\w]*\n/, '').replace(/```$/, '');
            // Return properly formatted code block
            return '```\n' + codeContent + '\n```';
        });
        result.output = modifiedOutput;
    }
    return result;
};
// Export the executor and the code handling function
export { executorGPT, executeWithCodeHandling };
//# sourceMappingURL=custom-agent.js.map