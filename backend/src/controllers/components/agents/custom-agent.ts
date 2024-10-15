import { DynamicTool } from "@langchain/core/tools";
import { model } from "../../../config/openai-config.js";
import { ChatPromptTemplate, MessagesPlaceholder, } from "@langchain/core/prompts";
import { convertToOpenAIFunction } from "@langchain/core/utils/function_calling";
import { RunnableSequence } from "@langchain/core/runnables";
import { AgentExecutor, type AgentStep } from "langchain/agents";
import { formatToOpenAIFunctionMessages } from "langchain/agents/format_scratchpad";
import { OpenAIFunctionsAgentOutputParser } from "langchain/agents/openai/output_parser";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { ElasticClientArgs, ElasticVectorSearch } from "@langchain/community/vectorstores/elasticsearch";
import { Client, type ClientOptions } from "@elastic/elasticsearch";
import { client, config, embeddingsOpenAI } from "../../../config/elastic-config.js";
import { z } from "zod";

const MEMORY_KEY = "chat_history";
const chatHistory: BaseMessage[] = [];

const clientArgs: ElasticClientArgs = {
    client: new Client(config),
    indexName: process.env.ELASTIC_INDEX ?? `*`,
}

const elasticVectorSearch = new ElasticVectorSearch(embeddingsOpenAI, clientArgs);

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
        const similaritySearchResults = await elasticVectorSearch.similaritySearch(input, 3, filter); // Example search for top 5 similar documents
        const context = similaritySearchResults.map((result) => result.pageContent);
        return context.length > 0 ? context : null;
    }
});

const tools = [elasticSearchTool];

const prompt = ChatPromptTemplate.fromMessages([
    ["system", 
        `You are a ChatBot that ONLY supports IT users, DO NOT ANSWER ANY QUESTION not 
        RELATED TO INFORMATION TECHNOlOGY, COMPUTER, JUST SAY I DON'T KNOW. You can reply to greetings as usual. 
          You must answer BASED ON the given context: {context}.
          Check for spelling errors, if it is incorrect based on context, 
          based on the context return ask the user 
          if this is what the user meant?`],
    new MessagesPlaceholder(MEMORY_KEY),
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
]);

// Model with OpenAI functions
const modelWithFunctions = model.bind({
    functions: tools.map((tool) => convertToOpenAIFunction(tool)),
});

const runnableAgent = RunnableSequence.from([
    {
        input: (i: { input: string; steps: AgentStep[] }) => i.input,
        agent_scratchpad: (i: { input: string; steps: AgentStep[] }) =>
            formatToOpenAIFunctionMessages(i.steps),
        context: async (i: { input: string; steps: AgentStep[] }) => {  // Add 'i' as an argument here
            const contextResults = await elasticSearchTool.func(i.input);
            console.log("contextResults: ", contextResults);
            return contextResults ? contextResults.join("\n") : null;
        },
        chat_history: (i: { input: string; steps: AgentStep[], chat_history: BaseMessage[] }) => i.chat_history,
    },
    prompt,
    modelWithFunctions,
    new OpenAIFunctionsAgentOutputParser(),
]);
  

  const executor = AgentExecutor.fromAgentAndTools({
    agent: runnableAgent,
    tools,
  });

export { executor }