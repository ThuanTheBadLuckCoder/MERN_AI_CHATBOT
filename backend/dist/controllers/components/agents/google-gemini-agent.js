import { DynamicTool } from "@langchain/core/tools";
import { modelGemini } from "../../../config/gemini-config.js";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableSequence, Runnable } from "@langchain/core/runnables";
import { AgentExecutor } from "langchain/agents";
import { ElasticVectorSearch } from "@langchain/community/vectorstores/elasticsearch";
import { Client } from "@elastic/elasticsearch";
import { config, embeddingsGemini } from "../../../config/elastic-config.js";
import { SerpAPI } from "@langchain/community/tools/serpapi";
import { z } from "zod";
const MEMORY_KEY = "chat_history";
const SERP_API_KEY = process.env.SERP_API_KEY ?? "";
// Initialize Elasticsearch client args
const clientArgs = {
    client: new Client(config),
    indexName: process.env.ELASTIC_INDEX ?? "",
};
const elasticVectorSearch = new ElasticVectorSearch(embeddingsGemini, clientArgs);
const serpSearchTool = new SerpAPI(SERP_API_KEY);
const searchTool = new DynamicTool({
    name: 'search_tool',
    description: 'Searches Google using SerpAPI for relevant information.',
    func: async (input) => {
        const schema = z.string();
        const validationResult = schema.safeParse(input);
        if (!validationResult.success) {
            throw new Error("Invalid input: " + validationResult.error.message);
        }
        try {
            const searchResults = await serpSearchTool.invoke(input);
            console.log("SerpAPI Raw Response:", JSON.stringify(searchResults, null, 2));
            if (!searchResults.organic_results || searchResults.organic_results.length === 0) {
                return "No relevant search results found.";
            }
            // Format search results to enforce citation structure
            const formattedResults = searchResults.organic_results.map((result, index) => ({
                id: index + 1,
                title: result.title,
                snippet: result.snippet,
                link: result.link
            }));
            // Create a formatted text with numbered references
            const formattedText = formattedResults.map(result => `[${result.id}] ${result.title}\nSummary: ${result.snippet}\nSource: ${result.link}`).join('\n\n');
            return {
                results: formattedResults,
                formattedText,
                citations: formattedResults.map(result => `[${result.id}] ${result.title} - ${result.link}`).join('\n')
            };
        }
        catch (error) {
            console.error("Search tool error:", error);
            return "Error performing search.";
        }
    },
});
const tools = [searchTool];
// Updated prompt template to enforce citation format
const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a helpful search AI assistant. Follow these strict guidelines:

    1. For EVERY piece of information you provide, you MUST cite the source using [X] notation, where X is the reference number from the search results.
    2. Your response should be structured as follows:
       - Main content with inline citations [X]
       - A blank line
       - "Sources:" header
       - Numbered list of sources with complete URLs

    3. Current search results: {context}
    4. Maintain a natural conversational flow while including citations
    5. If you need more information, you can perform another search

    Example format:
    "Dogs are known for their loyalty [1]. Recent studies show they can understand over 150 words [2].

    Sources:
    [1] Title of Article 1 - http://example.com/article1
    [2] Title of Article 2 - http://example.com/article2"

    YOU MUST ALWAYS INCLUDE SOURCES AND CITATIONS IN THIS FORMAT.`],
    new MessagesPlaceholder(MEMORY_KEY),
    ["human", "{input}"]
]);
class GeminiOutputParser extends Runnable {
    lc_namespace = ["GeminiOutputParser"];
    async invoke(input, config) {
        if (typeof input !== "string") {
            input = JSON.stringify(input);
        }
        return this.parse(input);
    }
    async parse(message) {
        if (message.toLowerCase().includes("let me search") || message.includes("Action:")) {
            return {
                tool: "search_tool",
                toolInput: message,
                log: message,
            };
        }
        return {
            returnValues: { output: message },
            log: message,
        };
    }
}
const runnableAgent = RunnableSequence.from([
    {
        input: (i) => i.input,
        context: async (i) => {
            try {
                const searchResults = await searchTool.func(i.input);
                if (searchResults && typeof searchResults === 'object' && 'citations' in searchResults) {
                    // Include both the formatted text and citations in the context
                    return `${searchResults.formattedText}\n\nCitations for your response:\n${searchResults.citations}`;
                }
                return searchResults;
            }
            catch (error) {
                console.error("Error in context gathering:", error);
                return "Unable to gather search context.";
            }
        },
        chat_history: (i) => (i.chat_history ? i.chat_history.slice(-6) : []),
    },
    prompt,
    modelGemini,
    new GeminiOutputParser(),
]).withConfig({
    runName: "GeminiAgentWithSerpAPI",
});
const googleGemini = AgentExecutor.fromAgentAndTools({
    agent: runnableAgent,
    tools,
});
export { googleGemini };
//# sourceMappingURL=google-gemini-agent.js.map