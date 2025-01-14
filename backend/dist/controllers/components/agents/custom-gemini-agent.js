import { DynamicTool } from "@langchain/core/tools";
import { model } from "../../../config/gemini-config.js";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableSequence, Runnable } from "@langchain/core/runnables";
import { AgentExecutor } from "langchain/agents";
import { ElasticVectorSearch } from "@langchain/community/vectorstores/elasticsearch";
import { Client } from "@elastic/elasticsearch";
import { config, embeddingsGemini } from "../../../config/elastic-config.js";
import { z } from "zod";
const MEMORY_KEY = "chat_history";
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
    description: 'This tool retrieves documents using ElasticSearch vector search',
    func: async (input) => {
        const schema = z.string();
        const filter = [{ operator: "wildcard", field: "source", value: "*" }];
        const validationResult = schema.safeParse(input);
        if (!validationResult.success) {
            throw new Error("Invalid input: " + validationResult.error.message);
        }
        const similaritySearchResults = await elasticVectorSearch.similaritySearch(input, 3, filter);
        const context = similaritySearchResults.map((result) => result.pageContent);
        return Array.isArray(context) ? context : [];
    },
});
const tools = [elasticSearchTool];
// Create chat prompt template
const prompt = ChatPromptTemplate.fromMessages([
    ["system",
        `Say Hi`],
    new MessagesPlaceholder(MEMORY_KEY),
    ["human", "{input}"],
]);
// Custom output parser for Gemini responses
class GeminiOutputParser extends Runnable {
    get lc_namespace() {
        return ["GeminiOutputParser"];
    }
    async invoke(input, config) {
        if (typeof input !== "string") {
            console.error("Invalid input to GeminiOutputParser.invoke:", input);
            input = JSON.stringify(input); // Convert input to string
        }
        return this.parse(input);
    }
    async parse(message) {
        if (!message.includes("Action:")) {
            return {
                returnValues: { output: message || "No valid context provided." },
                log: message,
            };
        }
        try {
            return {
                tool: "elastic_search_tool",
                toolInput: message,
                log: message,
            };
        }
        catch (error) {
            console.error("Error in parsing message: ", error);
            return {
                returnValues: { output: "Error processing message." },
                log: message,
            };
        }
    }
}
// Create runnable sequence for the agent
const runnableAgent = RunnableSequence.from([
    {
        input: (i) => i.input,
        context: async (i) => {
            const contextResults = await elasticSearchTool.func(i.input);
            // console.log("contextResults: ", contextResults);
            if (Array.isArray(contextResults) && contextResults.every((item) => typeof item === "string")) {
                return contextResults.join("\n");
            }
            console.error("Invalid contextResults: Expected an array of strings.");
            return "No relevant context found.";
        },
        chat_history: (i) => {
            // Ensure that the `content` field is always populated for each chat history message
            if (i.chat_history) {
                i.chat_history.forEach((message) => {
                    if (!message.content) {
                        message.content = "No content available"; // Set a default content if missing
                    }
                });
                // Limit chat history to the last 6 messages
                return i.chat_history.slice(-6);
            }
            return [];
        },
    },
    prompt,
    model,
    new GeminiOutputParser(), // Now compatible with Runnable
]).withConfig({
    runName: "GeminiAgent",
});
// Create agent executor
const executor = AgentExecutor.fromAgentAndTools({
    agent: runnableAgent,
    tools,
});
export { executor };
//# sourceMappingURL=custom-gemini-agent.js.map