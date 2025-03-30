import { DynamicTool } from "@langchain/core/tools";
import { modelGemini } from "../../../config/gemini-config.js";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableSequence, Runnable } from "@langchain/core/runnables";
import { AgentExecutor } from "langchain/agents";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { ElasticVectorSearch } from "@langchain/community/vectorstores/elasticsearch";
import { Client } from "@elastic/elasticsearch";
import { config, embeddingsGemini } from "../../../config/elastic-config.js";
import { z } from "zod";
import mongoose from "mongoose";
const MEMORY_KEY = "chat_history";
// MongoDB Schema for storing previous questions and answers
const QuestionAnswerSchema = new mongoose.Schema({
    question: String,
    answer: String,
    timestamp: { type: Date, default: Date.now }
});
const QuestionAnswer = mongoose.model('QuestionAnswer', QuestionAnswerSchema);
// Initialize Elasticsearch client args
const clientArgs = {
    client: new Client(config),
    indexName: process.env.ELASTIC_INDEX ?? `*`,
};
// Create ElasticSearch vector search instance with Gemini embeddings
const elasticVectorSearch = new ElasticVectorSearch(embeddingsGemini, clientArgs);
// Create Elasticsearch tool
const elasticSearchTool = new DynamicTool({
    name: 'elastic_search_tool',
    description: 'Use this tool to search for new information when the question has not been asked before or when you need additional context.',
    func: async (input) => {
        const schema = z.string();
        const filter = [{ operator: "wildcard", field: "source", value: "*" }];
        const validationResult = schema.safeParse(input);
        if (!validationResult.success) {
            throw new Error("Invalid input: " + validationResult.error.message);
        }
        const similaritySearchResults = await elasticVectorSearch.similaritySearch(input, 3, filter);
        const context = similaritySearchResults.map((result) => result.pageContent);
        return Array.isArray(context) ? context.join("\n\n") : "No relevant context found.";
    },
});
// Create MongoDB lookup tool
const mongoDBTool = new DynamicTool({
    name: 'mongodb_exact_match_tool',
    description: 'Use this tool when you detect that the question is identical to a previously asked question. It will retrieve the exact answer from the database.',
    func: async (input) => {
        try {
            // Find exact match in the database
            const exact = await QuestionAnswer.findOne({
                question: { $regex: new RegExp('^' + input.trim() + '$', 'i') }
            });
            if (exact) {
                return `EXACT MATCH FOUND: ${exact.answer}`;
            }
            else {
                return "No exact match found in the database.";
            }
        }
        catch (error) {
            console.error("Error querying MongoDB:", error);
            return "Error querying the database.";
        }
    },
});
// Create MongoDB similar question lookup tool
const mongoDBSimilarTool = new DynamicTool({
    name: 'mongodb_similar_tool',
    description: 'Use this tool when the question seems related to previous questions. It will retrieve similar questions and their answers for context.',
    func: async (input) => {
        try {
            // Use a text search to find similar questions
            // This assumes you've set up a text index on the question field
            const similar = await QuestionAnswer.find({ $text: { $search: input } }, { score: { $meta: "textScore" } })
                .sort({ score: { $meta: "textScore" } })
                .limit(2);
            if (similar && similar.length > 0) {
                const results = similar.map(qa => `SIMILAR QUESTION: "${qa.question}"\nANSWER: ${qa.answer}`).join("\n\n");
                return results;
            }
            else {
                return "No similar questions found in the database.";
            }
        }
        catch (error) {
            console.error("Error querying MongoDB for similar questions:", error);
            return "Error searching for similar questions.";
        }
    },
});
// Store answer in MongoDB tool
const tools = [elasticSearchTool, mongoDBTool, mongoDBSimilarTool];
// Create chat prompt template with detailed instructions
// Modified prompt template with system messages at the beginning
const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are an intelligent agent specializing in user interface development!
        DO NOT ANSWER AN QUESTION DID NOT RELATED TO FRONT-END DEVELOPER,
        JUST SAY "I DON'T KNOW",
        you can handle user queries in three different scenarios:
    

  1. EXACT MATCH: If the user asks a question that has been asked before word-for-word, you MUST first use the mongodb_exact_match_tool to retrieve the exact answer.
  
  2. RELATED QUESTION: If the user asks a question that seems related to previous questions, you SHOULD first use the mongodb_similar_tool to find similar questions and their answers, then supplement with the elastic_search_tool if needed.
  
  3. NEW QUESTION: If the user asks a completely new question, you MUST use the elastic_search_tool to find relevant information.
  
  Always analyze the question carefully before deciding which tool to use. After providing an answer to a new question, use the store_answer_tool to save the question and your answer for future reference.
  
  When responding to the user:
  - Be concise and directly answer their question
  - Include relevant information from your tools
  - Format your response in a clear, readable manner
  - Cite the source of your information if possible
  
  Remember: For exact matches, return the exact answer. For similar questions, build on previous answers with new context. For new questions, rely entirely on elasticsearch results.
  
  Relevant context from tools will be provided if available: {context}`],
    new MessagesPlaceholder(MEMORY_KEY),
    ["human", "{input}"],
]);
// Improved output parser for Gemini responses
class GeminiOutputParser extends Runnable {
    get lc_namespace() {
        return ["GeminiOutputParser"];
    }
    async invoke(input, config) {
        if (typeof input !== "string") {
            console.error("Invalid input to GeminiOutputParser.invoke:", input);
            input = JSON.stringify(input);
        }
        return this.parse(input);
    }
    async parse(message) {
        // Check if the response indicates final answer
        if (!message.includes("Action:") && !message.includes("Tool:")) {
            return {
                returnValues: { output: message },
                log: message,
            };
        }
        try {
            // Extract tool name and input
            let toolName = "elastic_search_tool"; // Default
            let toolInput = message;
            // Parse for specific tool selection patterns
            if (message.includes("Tool:")) {
                const toolMatch = message.match(/Tool:\s*(\w+)/);
                if (toolMatch && toolMatch[1]) {
                    toolName = toolMatch[1];
                }
            }
            else if (message.includes("Action:")) {
                const actionMatch = message.match(/Action:\s*(\w+)/);
                if (actionMatch && actionMatch[1]) {
                    toolName = actionMatch[1];
                }
            }
            // Extract tool input
            const inputMatch = message.match(/(?:Tool Input|Action Input):\s*([\s\S]+?)(?=\n\n|$)/);
            if (inputMatch && inputMatch[1]) {
                toolInput = inputMatch[1].trim();
            }
            else {
                // If no specific input format is found, use the entire message as input
                // but remove the Tool/Action part
                toolInput = message
                    .replace(/Tool:\s*\w+/, "")
                    .replace(/Action:\s*\w+/, "")
                    .replace(/(?:Tool Input|Action Input):\s*/, "")
                    .trim();
            }
            // Validate the tool name against available tools
            const validToolNames = ["elastic_search_tool", "mongodb_exact_match_tool", "mongodb_similar_tool", "store_answer_tool"];
            if (!validToolNames.includes(toolName)) {
                toolName = "elastic_search_tool"; // Default to elastic search if invalid tool name
            }
            return {
                tool: toolName,
                toolInput: toolInput,
                log: message,
            };
        }
        catch (error) {
            console.error("Error in parsing message: ", error);
            return {
                returnValues: { output: "I encountered an error processing your request. Let me try again with a different approach." },
                log: message,
            };
        }
    }
}
// Enhanced runnable sequence for the agent with tool selection logic
const runnableAgent = RunnableSequence.from([
    {
        input: (i) => i.input,
        context: async (i) => {
            // First, check if there's an exact match in MongoDB
            let hasResults = false;
            let contextResults = "";
            // Check for exact match first
            try {
                const exactResult = await mongoDBTool.func(i.input);
                if (exactResult && exactResult.includes("EXACT MATCH FOUND")) {
                    contextResults += exactResult + "\n\n";
                    hasResults = true;
                }
            }
            catch (error) {
                console.error("Error checking MongoDB for exact match:", error);
            }
            // If no exact match, check for similar questions
            if (!hasResults) {
                try {
                    const similarResult = await mongoDBSimilarTool.func(i.input);
                    if (similarResult && !similarResult.includes("No similar questions found")) {
                        contextResults += similarResult + "\n\n";
                        hasResults = true;
                    }
                }
                catch (error) {
                    console.error("Error checking MongoDB for similar questions:", error);
                }
            }
            // If no MongoDB results or if we want additional context, use ElasticSearch
            if (!hasResults || i.input.includes("more") || i.input.includes("additional") || i.input.includes("elaborate")) {
                try {
                    const elasticResult = await elasticSearchTool.func(i.input);
                    if (elasticResult) {
                        contextResults += "ELASTICSEARCH RESULTS:\n" + elasticResult;
                        hasResults = true;
                    }
                }
                catch (error) {
                    console.error("Error querying ElasticSearch:", error);
                }
            }
            return hasResults ? contextResults : "No relevant context found. This appears to be a completely new question.";
        },
        chat_history: (i) => {
            // Enhanced chat history handling
            if (i.chat_history) {
                // Ensure content field is populated
                const validHistory = i.chat_history.map(message => {
                    if (!message.content) {
                        return message.constructor === HumanMessage
                            ? new HumanMessage("User message content missing")
                            : new AIMessage("AI message content missing");
                    }
                    return message;
                });
                // Get the last 8 messages for more context
                return validHistory.slice(-8);
            }
            return [];
        },
    },
    prompt,
    modelGemini,
    new GeminiOutputParser(),
]).withConfig({
    runName: "SmartGeminiAgent",
});
// Create agent executor with enhanced configuration
const executor = AgentExecutor.fromAgentAndTools({
    agent: runnableAgent,
    tools,
    verbose: true, // Enable verbose logging for debugging
    maxIterations: 5, // Limit maximum iterations to prevent infinite loops
});
// Export the executor and the helper function
export { executor };
//# sourceMappingURL=custom-gemini-agent.js.map