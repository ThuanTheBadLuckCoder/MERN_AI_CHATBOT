import { DynamicTool } from "@langchain/core/tools";
import { model } from "../../../config/openai-config.js";
import { ChatPromptTemplate, MessagesPlaceholder, } from "@langchain/core/prompts";
import { convertToOpenAIFunction } from "@langchain/core/utils/function_calling";
import { RunnableSequence } from "@langchain/core/runnables";
import { AgentExecutor } from "langchain/agents";
import { formatToOpenAIFunctionMessages } from "langchain/agents/format_scratchpad";
import { OpenAIFunctionsAgentOutputParser } from "langchain/agents/openai/output_parser";
import { SystemMessage } from "@langchain/core/messages";
import { ElasticVectorSearch } from "@langchain/community/vectorstores/elasticsearch";
import { Client } from "@elastic/elasticsearch";
import { config, embeddingsOpenAI, client } from "../../../config/elastic-config.js";
import { z } from "zod";
import { BM25Retriever } from "@langchain/community/retrievers/bm25";
import { parse as parseHTML } from 'node-html-parser';
const MEMORY_KEY = "chat_history";
// ElasticSearch configuration
const clientArgs = {
    client: new Client(config),
    indexName: process.env.ELASTIC_INDEX ?? `thesis_tailwindcss`,
};
const elasticVectorSearch = new ElasticVectorSearch(embeddingsOpenAI, clientArgs);
// ElasticSearch tool for retrieving relevant context
const elasticSearchTool = new DynamicTool({
    name: 'elastic_search_tool',
    description: 'This tool retrieves documents using ElasticSearch vector search',
    func: async (input) => {
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
        const similaritySearchResults = await elasticVectorSearch.similaritySearch(input, 3, filter);
        const context = similaritySearchResults.map((result) => result.pageContent);
        return context.length > 0 ? context : null;
    }
});
// Helper function to perform BM25 search
async function performBM25Search(query, documents, k = 3) {
    try {
        const bm25Retriever = await BM25Retriever.fromDocuments(documents, {
            k: k
        });
        const results = await bm25Retriever.getRelevantDocuments(query);
        return results;
    }
    catch (error) {
        console.error("Error in BM25 search:", error);
        return [];
    }
}
// Merge and re-rank search results
function mergeAndRerank(vectorResults, keywordResults, query) {
    const uniqueDocuments = new Map();
    vectorResults.forEach((doc, index) => {
        const vectorScore = 1 - (index / vectorResults.length);
        const parentBonus = doc.metadata?.is_parent === true ? 0.2 : 0;
        uniqueDocuments.set(doc.pageContent, {
            doc: doc,
            score: (vectorScore * 0.7) + parentBonus
        });
    });
    keywordResults.forEach((doc, index) => {
        const keywordScore = 1 - (index / keywordResults.length);
        const key = doc.pageContent;
        const parentBonus = doc.metadata?.is_parent === true ? 0.15 : 0;
        if (uniqueDocuments.has(key)) {
            const existing = uniqueDocuments.get(key);
            existing.score += (keywordScore * 0.3) + parentBonus;
        }
        else {
            uniqueDocuments.set(key, {
                doc: doc,
                score: (keywordScore * 0.3) + parentBonus
            });
        }
    });
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    uniqueDocuments.forEach((value) => {
        const content = value.doc.pageContent.toLowerCase();
        const termMatches = queryTerms.filter(term => content.includes(term)).length;
        const termBoost = termMatches / queryTerms.length * 0.2;
        value.score += termBoost;
    });
    return Array.from(uniqueDocuments.values())
        .sort((a, b) => b.score - a.score)
        .map(item => item.doc);
}
// Updated hybrid search tool with parent document resolution
const hybridSearchTool = new DynamicTool({
    name: 'hybrid_search_tool',
    description: 'Performs hybrid search combining dense vector embeddings and sparse BM25 with parent document resolution',
    func: async (input) => {
        try {
            const schema = z.string();
            const validationResult = schema.safeParse(input);
            if (!validationResult.success) {
                throw new Error("Invalid input: " + validationResult.error.message);
            }
            console.log("Performing hybrid search for query:", input);
            const filter = [
                {
                    operator: "wildcard",
                    field: "source",
                    value: "*",
                },
            ];
            const vectorResults = await elasticVectorSearch.similaritySearch(input, 5, filter);
            console.log(`Dense vector search returned ${vectorResults.length} results`);
            const allDocuments = await elasticVectorSearch.similaritySearch("*", 30, filter);
            const keywordResults = await performEnhancedBM25Search(input, allDocuments);
            console.log(`BM25 search returned ${keywordResults.length} results`);
            let combinedResults = mergeAndRerank(vectorResults, keywordResults, input);
            console.log(`Initial hybrid search returned ${combinedResults.length} unique results after merging`);
            const resolvedResults = await resolveParentDocuments(combinedResults);
            console.log(`After parent resolution: ${resolvedResults.length} total documents`);
            const context = resolvedResults.map(doc => doc.pageContent);
            const responseWithMetadata = {
                context: context,
                metadata: {
                    vectorResultCount: vectorResults.length,
                    keywordResultCount: keywordResults.length,
                    combinedResultCount: combinedResults.length,
                    resolvedResultCount: resolvedResults.length,
                    containsFullDocuments: resolvedResults.some(doc => doc.metadata?.is_parent === true)
                }
            };
            return context.length > 0 ? JSON.stringify(responseWithMetadata) : null;
        }
        catch (error) {
            console.error("Error in hybrid search:", error);
            return null;
        }
    }
});
// Resolve parent documents for any child chunks found in search results
async function resolveParentDocuments(documents) {
    const result = [];
    const processedParentIds = new Set();
    for (const doc of documents) {
        if (!doc.metadata) {
            result.push(doc);
            continue;
        }
        if (doc.metadata.is_parent === true) {
            result.push(doc);
            if (doc.metadata.document_id) {
                processedParentIds.add(doc.metadata.document_id);
            }
            continue;
        }
        if (doc.metadata.parent_id && !processedParentIds.has(doc.metadata.parent_id)) {
            try {
                const filter = [
                    {
                        operator: "equals",
                        field: "metadata.document_id",
                        value: doc.metadata.parent_id
                    },
                    {
                        operator: "equals",
                        field: "metadata.is_parent",
                        value: true
                    }
                ];
                const parentResults = await elasticVectorSearch.similaritySearch("", 1, filter);
                if (parentResults.length > 0) {
                    result.push(parentResults[0]);
                    processedParentIds.add(doc.metadata.parent_id);
                    console.log(`Resolved parent document: ${doc.metadata.parent_id}`);
                }
                else {
                    console.log(`No parent document found for ID: ${doc.metadata.parent_id}`);
                    try {
                        const directResults = await fetchDocumentById(doc.metadata.parent_id);
                        if (directResults) {
                            result.push(directResults);
                            processedParentIds.add(doc.metadata.parent_id);
                            console.log(`Directly fetched parent document: ${doc.metadata.parent_id}`);
                        }
                    }
                    catch (directError) {
                        console.error(`Failed direct fetch for parent: ${doc.metadata.parent_id}`, directError);
                    }
                }
            }
            catch (error) {
                console.error(`Error fetching parent document ${doc.metadata.parent_id}:`, error);
            }
        }
        result.push(doc);
    }
    return result;
}
// Helper function to fetch a document directly by ID
async function fetchDocumentById(documentId) {
    try {
        const indexName = process.env.ELASTIC_INDEX || "*";
        const response = await client.search({
            index: indexName,
            body: {
                query: {
                    bool: {
                        must: [
                            { term: { "metadata.document_id": documentId } },
                            { term: { "metadata.is_parent": true } }
                        ]
                    }
                }
            }
        });
        if (response.hits.hits.length > 0) {
            const hit = response.hits.hits[0];
            const source = hit._source;
            return {
                pageContent: source.text || source.pageContent || "",
                metadata: source.metadata || {}
            };
        }
        return null;
    }
    catch (error) {
        console.error("Error in direct document fetch:", error);
        return null;
    }
}
// BALANCED: Context validation tool (replaces overly strict preservation tools)
const contextValidationTool = new DynamicTool({
    name: 'context_validation_tool',
    description: 'Validates that responses stay within the bounds of provided context while allowing intelligent modifications',
    func: async (input) => {
        try {
            const data = JSON.parse(input);
            const action = data.action; // "validate", "extract_resources", or "check_hallucination"
            const response = data.response || "";
            const originalContext = data.originalContext || "";
            if (action === "validate") {
                // Check if response stays within context bounds
                const contextResources = extractResources(originalContext);
                const responseResources = extractResources(response);
                // Check for hallucinated resources (not from context)
                const hallucinatedResources = responseResources.filter(resource => {
                    return !contextResources.some(contextResource => normalizeResource(contextResource) === normalizeResource(resource)) && isLikelyHallucinated(resource);
                });
                // Check for virtual/placeholder content
                const virtualContent = detectVirtualContent(response);
                return JSON.stringify({
                    isValid: hallucinatedResources.length === 0 && virtualContent.length === 0,
                    hallucinatedResources,
                    virtualContent,
                    contextResources: contextResources.length,
                    responseResources: responseResources.length,
                    message: hallucinatedResources.length > 0 || virtualContent.length > 0
                        ? "Response contains content not from provided context"
                        : "Response stays within context bounds"
                });
            }
            if (action === "extract_resources") {
                // Extract all resources from context for reference
                const resources = extractResources(originalContext);
                return JSON.stringify({
                    resources,
                    count: resources.length,
                    types: categorizeResources(resources)
                });
            }
            if (action === "check_hallucination") {
                // Check if specific content is likely hallucinated
                const content = data.content || "";
                const isHallucinated = !originalContext.includes(content) &&
                    isLikelyHallucinated(content);
                return JSON.stringify({
                    isHallucinated,
                    confidence: isHallucinated ? "high" : "low",
                    reason: isHallucinated ? "Content not found in context and appears generated" : "Content appears legitimate"
                });
            }
            return JSON.stringify({ error: "Invalid action specified" });
        }
        catch (error) {
            console.error("Error in context validation tool:", error);
            return JSON.stringify({ error: "Error processing validation request" });
        }
    }
});
// Helper functions for context validation
function extractResources(text) {
    const resources = [];
    // Extract URLs
    const urlRegex = /(https?:\/\/[^\s"'<>]+)/g;
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
        resources.push(match[1]);
    }
    // Extract file paths
    const pathRegex = /(?:src|href|url|path)=["']([^"']+)["']/g;
    while ((match = pathRegex.exec(text)) !== null) {
        resources.push(match[1]);
    }
    // Extract class names (for CSS frameworks)
    const classRegex = /(?:class|className)=["']([^"']*)["']/g;
    while ((match = classRegex.exec(text)) !== null) {
        resources.push(match[1]);
    }
    return [...new Set(resources)];
}
function normalizeResource(resource) {
    return resource
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/\?.*$/, '')
        .replace(/#.*$/, '');
}
function isLikelyHallucinated(resource) {
    // Check for common placeholder patterns
    const placeholderPatterns = [
        /\/api\/placeholder\//i,
        /placeholder\.(com|io|jpg|png|gif)/i,
        /example\.(com|org|net)/i,
        /sample[_\-]?image/i,
        /dummy[_\-]?image/i,
        /demo[_\-]?image/i,
        /\/(placeholder|example|sample|dummy|demo)\//i,
        /placekitten/i,
        /placehold\.it/i,
        /lorempixel/i,
        /picsum/i,
        /unsplash\.it/i,
        /dummyimage\.com/i
    ];
    return placeholderPatterns.some(pattern => pattern.test(resource));
}
function detectVirtualContent(text) {
    const virtualContent = [];
    // Detect placeholder images
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/g;
    let match;
    while ((match = imgRegex.exec(text)) !== null) {
        if (isLikelyHallucinated(match[1])) {
            virtualContent.push(match[0]);
        }
    }
    // Detect other virtual content patterns
    const virtualPatterns = [
        /\[placeholder[^\]]*\]/gi,
        /\{[^}]*placeholder[^}]*\}/gi,
        /<!--[^>]*placeholder[^>]*-->/gi
    ];
    virtualPatterns.forEach(pattern => {
        while ((match = pattern.exec(text)) !== null) {
            virtualContent.push(match[0]);
        }
    });
    return virtualContent;
}
function categorizeResources(resources) {
    const categories = {
        urls: 0,
        images: 0,
        stylesheets: 0,
        scripts: 0,
        classes: 0,
        other: 0
    };
    resources.forEach(resource => {
        if (resource.match(/^https?:\/\//)) {
            categories.urls++;
        }
        else if (resource.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
            categories.images++;
        }
        else if (resource.match(/\.css$/i)) {
            categories.stylesheets++;
        }
        else if (resource.match(/\.js$/i)) {
            categories.scripts++;
        }
        else if (resource.includes(' ')) {
            categories.classes++;
        }
        else {
            categories.other++;
        }
    });
    return categories;
}
// Greeting detection tool
const greetingDetectionTool = new DynamicTool({
    name: 'greeting_detection_tool',
    description: 'Detects if user input is a simple greeting or thanks and provides an immediate response',
    func: async (input) => {
        try {
            const greetingPatterns = [
                /^hi\b/i, /^hello\b/i, /^hey\b/i, /^greetings\b/i, /^good morning\b/i,
                /^good afternoon\b/i, /^good evening\b/i, /^howdy\b/i, /^what's up\b/i,
                /^how are you\b/i, /^how's it going\b/i
            ];
            const thanksPatterns = [
                /thank you/i, /thanks/i, /appreciate it/i, /grateful/i, /thank/i,
                /tysm/i, /thx/i, /thank u/i
            ];
            const greetingResponses = [
                "Hello! I'm your front-end development assistant. How can I help you with your web development project today?",
                "Hi there! Ready to help with your front-end development needs. What are you working on?",
                "Hey! I'm here to assist with your web development questions. What would you like help with?"
            ];
            const thanksResponses = [
                "You're welcome! I'm glad I could help. Is there anything else you'd like assistance with for your web development?",
                "Happy to help! Let me know if you need any other assistance with your project.",
                "My pleasure! If you have any other front-end development questions, I'm here to help."
            ];
            const isGreeting = greetingPatterns.some(pattern => pattern.test(input.trim()));
            const isThanks = thanksPatterns.some(pattern => pattern.test(input.trim()));
            if (input.length > 50) {
                const words = input.toLowerCase().trim().split(/\s+/);
                const greetingWordCount = words.filter(word => ['hi', 'hello', 'hey', 'greetings', 'morning', 'afternoon',
                    'evening', 'howdy', 'sup'].includes(word)).length;
                const thanksWordCount = words.filter(word => ['thank', 'thanks', 'appreciate', 'grateful', 'thx', 'tysm'].includes(word)).length;
                const greetingRatio = greetingWordCount / words.length;
                const thanksRatio = thanksWordCount / words.length;
                if (greetingRatio > 0.3) {
                    const response = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
                    return JSON.stringify({ type: "greeting", response: response });
                }
                else if (thanksRatio > 0.3) {
                    const response = thanksResponses[Math.floor(Math.random() * thanksResponses.length)];
                    return JSON.stringify({ type: "thanks", response: response });
                }
                else {
                    return JSON.stringify({ type: "substantive", response: null });
                }
            }
            else {
                if (isGreeting) {
                    const response = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
                    return JSON.stringify({ type: "greeting", response: response });
                }
                else if (isThanks) {
                    const response = thanksResponses[Math.floor(Math.random() * thanksResponses.length)];
                    return JSON.stringify({ type: "thanks", response: response });
                }
                else {
                    return JSON.stringify({ type: "substantive", response: null });
                }
            }
        }
        catch (error) {
            console.error("Error in greeting detection:", error);
            return JSON.stringify({ type: "substantive", response: null });
        }
    }
});
// Simplified code memory tool - less restrictive
const codeMemoryTool = new DynamicTool({
    name: 'code_memory_tool',
    description: 'Stores and retrieves code context to maintain continuity between related questions',
    func: async (input) => {
        try {
            const data = JSON.parse(input);
            const action = data.action;
            const conversationId = data.conversationId || "default";
            if (!global.codeStateCache) {
                global.codeStateCache = {};
            }
            if (!global.codeStateCache[conversationId]) {
                global.codeStateCache[conversationId] = { codeHistory: [] };
            }
            let codeState = global.codeStateCache[conversationId];
            if (action === "store") {
                const codeContent = data.content;
                const codeType = data.type || "full-document";
                if (codeType === "full-document" || codeContent.includes("<!DOCTYPE html>")) {
                    codeState.fullHtmlDocument = codeContent;
                }
                codeState.codeHistory.push({
                    type: codeType,
                    content: codeContent,
                    timestamp: Date.now()
                });
                if (codeState.codeHistory.length > 5) {
                    codeState.codeHistory = codeState.codeHistory.slice(-5);
                }
                global.codeStateCache[conversationId] = codeState;
                return JSON.stringify(codeState);
            }
            else if (action === "retrieve") {
                console.log(`Retrieved code state for conversation ${conversationId}:`, codeState.fullHtmlDocument ? "Has full HTML document" : "No full HTML document", `History entries: ${codeState.codeHistory.length}`);
                return JSON.stringify(codeState);
            }
            return JSON.stringify(codeState);
        }
        catch (error) {
            console.error("Error in code memory tool:", error);
            return JSON.stringify({ codeHistory: [] });
        }
    }
});
// Enhanced code handling utilities
function isCompleteHTMLDocument(code) {
    return code.includes("<!DOCTYPE html>") &&
        code.includes("<html") &&
        code.includes("</html>") &&
        code.includes("<head") &&
        code.includes("<body");
}
function hasHTMLElements(code) {
    return code.includes("<div") ||
        code.includes("<section") ||
        code.includes("<p") ||
        code.includes("<span") ||
        code.includes("<html") ||
        code.includes("<body");
}
function extractCodeBlocks(output) {
    const codeBlocks = [];
    const codeRegex = /```[\s\S]*?```/g;
    let match;
    while ((match = codeRegex.exec(output)) !== null) {
        const codeContent = match[0]
            .replace(/```[\w]*\n/, '')
            .replace(/```$/, '');
        codeBlocks.push(codeContent);
    }
    return codeBlocks;
}
function replaceCodeBlocks(output, codeBlocks) {
    let result = output;
    let index = 0;
    return result.replace(/```[\s\S]*?```/g, () => {
        const language = hasHTMLElements(codeBlocks[index]) ? 'html' : 'javascript';
        const replacement = '```' + language + '\n' + codeBlocks[index] + '\n```';
        index++;
        return replacement;
    });
}
function getDefaultTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Web Component</title>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
</head>
<body class="p-4">
    <!-- Content will be inserted here -->
</body>
</html>`;
}
function mergeWithTemplate(fragment, template) {
    if (isCompleteHTMLDocument(fragment)) {
        return fragment;
    }
    try {
        const doc = parseHTML(template);
        const body = doc.querySelector('body');
        if (body) {
            body.innerHTML = fragment;
            return doc.toString();
        }
    }
    catch (error) {
        console.error("Error merging with template:", error);
    }
    return template.replace(/<body[^>]*>([\s\S]*?)<\/body>/i, `<body class="p-4">\n${fragment}\n</body>`);
}
// BALANCED: Tools array with less restrictive validation
const tools = [
    hybridSearchTool,
    elasticSearchTool,
    codeMemoryTool,
    greetingDetectionTool,
    contextValidationTool // Replaces overly strict preservation tools
];
// BALANCED: More flexible prompt that encourages context usage without being overly restrictive
const frontEndDevPrompt = ChatPromptTemplate.fromMessages([
    ["system",
        `You are a helpful, expert front-end developer assistant. Your responses should be technically accurate, comprehensive, and maintain continuity across the conversation, especially for code examples.

        CONTEXT USAGE GUIDELINES:
        1. ALWAYS use the provided context as your primary source of information
        2. Reference and build upon the context whenever possible
        3. You may intelligently modify, improve, or adapt code from the context to better suit user requests
        4. Do NOT create information that contradicts or goes beyond what's provided in the context
        5. If you need to add something not in the context, clearly indicate it as your own addition
        
        CONTENT CREATION RULES:
        1. NO PLACEHOLDER CONTENT: Never create placeholder images, dummy links, or fake URLs
        2. RESOURCE CONSTRAINT: Only use images, CDN links, and external resources that are provided in the context
        3. INTELLIGENT ADAPTATION: You may modify code structure, styling, and functionality while staying within context bounds
        4. CLARIFY ADDITIONS: If you add elements not from context, clearly mark them as additions
        
        CODE DEVELOPMENT APPROACH:
        1. Use TailwindCSS with the correct CDN: "<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>"
        2. Build upon existing code when available, making intelligent improvements
        3. Ensure all external resources (images, fonts, etc.) come from the provided context
        4. You may restructure, optimize, or enhance code to meet user requirements
        5. Always provide complete, functional code examples
        
        RESPONSE STRATEGY:
        - Base your responses on the provided context
        - Enhance and improve upon context materials intelligently
        - Never hallucinate resources or create virtual content
        - Be helpful and creative within the bounds of what's provided
        - If context is insufficient for a request, explain what additional information you would need
        
        Context from relevant documentation: {context}
        Previous code context: {code_context}
        `],
    new MessagesPlaceholder(MEMORY_KEY),
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
]);
// Model with OpenAI functions
const modelWithFunctions = model.bind({
    functions: tools.map((tool) => convertToOpenAIFunction(tool)),
});
// Enhanced output parser
class BalancedOutputParser extends OpenAIFunctionsAgentOutputParser {
    async parse(text) {
        const standardOutput = await super.parse(text);
        return standardOutput;
    }
}
const runnableAgent = RunnableSequence.from([
    {
        input: (i) => i.input,
        agent_scratchpad: (i) => formatToOpenAIFunctionMessages(i.steps),
        context: async (i) => {
            const searchResult = await hybridSearchTool.func(i.input);
            let contextResults = [];
            if (searchResult) {
                try {
                    const parsedResult = JSON.parse(searchResult);
                    contextResults = parsedResult.context;
                    console.log("Hybrid search metadata:", parsedResult.metadata);
                }
                catch (e) {
                    console.error("Error parsing hybrid search results:", e);
                }
            }
            console.log("Context retrieved: ", contextResults ? contextResults.length : 0, "documents");
            return contextResults && contextResults.length > 0 ?
                contextResults.join("\n") :
                "No relevant context found.";
        },
        chat_history: (i) => i.chat_history || [],
        code_context: async (i) => {
            const conversationId = i.conversationId || "default";
            try {
                const codeMemoryResult = await codeMemoryTool.func(JSON.stringify({
                    action: "retrieve",
                    conversationId
                }));
                const codeState = JSON.parse(codeMemoryResult);
                if (codeState.fullHtmlDocument) {
                    return `Reference this previous HTML document. You may modify and improve it as needed:\n\n${codeState.fullHtmlDocument}`;
                }
                else if (codeState.codeHistory && codeState.codeHistory.length > 0) {
                    const relevantCode = codeState.codeHistory
                        .filter(entry => entry.type === "full-document" || entry.type === "component")
                        .pop();
                    if (relevantCode) {
                        return `Reference this previous code. You may build upon or modify it:\n\n${relevantCode.content}`;
                    }
                }
                const codeBlockRegex = /```[\s\S]*?```/g;
                const codeMatches = i.input.match(codeBlockRegex);
                if (codeMatches && codeMatches.length > 0) {
                    const userCode = codeMatches[0].replace(/```[\w]*\n/, '').replace(/```$/, '');
                    return `The user has provided this code as a starting point:\n\n${userCode}`;
                }
                return "No previous code context available. Create new code as needed.";
            }
            catch (error) {
                console.error("Error retrieving code context:", error);
                return "No previous code context available. Create new code as needed.";
            }
        }
    },
    frontEndDevPrompt,
    modelWithFunctions,
    new BalancedOutputParser(),
]);
// Enhanced BM25 search
async function performEnhancedBM25Search(query, documents, k = 3) {
    try {
        const bm25Retriever = await BM25Retriever.fromDocuments(documents, {
            k: k
        });
        const results = await bm25Retriever.getRelevantDocuments(query);
        return results;
    }
    catch (error) {
        console.error("Error in enhanced BM25 search:", error);
        return [];
    }
}
const executorGPT = AgentExecutor.fromAgentAndTools({
    agent: runnableAgent,
    tools,
    verbose: true,
    handleParsingErrors: true,
    returnIntermediateSteps: true,
});
// BALANCED: Code handling with validation but flexibility
const executeWithCodeHandling = async (input, chatHistory = [], conversationId) => {
    // Check for greetings/thanks
    try {
        const greetingResult = await greetingDetectionTool.func(input);
        const greetingData = JSON.parse(greetingResult);
        if (greetingData.type === "greeting" || greetingData.type === "thanks") {
            console.log(`Detected ${greetingData.type}, providing immediate response`);
            return {
                output: greetingData.response,
                intermediateSteps: []
            };
        }
    }
    catch (error) {
        console.error("Error in greeting detection:", error);
    }
    // Retrieve and include code context
    let codeState;
    try {
        const codeMemoryResult = await codeMemoryTool.func(JSON.stringify({
            action: "retrieve",
            conversationId
        }));
        codeState = JSON.parse(codeMemoryResult);
        const fullCodeContext = codeState.fullHtmlDocument;
        if (fullCodeContext) {
            console.log("Including code context in conversation");
            const codeContextMessage = new SystemMessage({
                content: `Available code for reference and modification:\n\n\`\`\`html\n${fullCodeContext}\n\`\`\`\n\nYou may build upon, modify, or enhance this code as needed to fulfill the user's request.`
            });
            chatHistory = [codeContextMessage, ...chatHistory];
        }
    }
    catch (error) {
        console.error("Error retrieving code context:", error);
        codeState = { codeHistory: [] };
    }
    // Execute the agent
    const result = await executorGPT.invoke({
        input,
        chat_history: chatHistory,
        conversationId
    });
    // BALANCED: Validate response stays within context bounds but allow intelligent modifications
    if (typeof result.output === 'string') {
        // Get context from chat history for validation
        let originalContext = "";
        for (const msg of chatHistory) {
            if (msg instanceof SystemMessage) {
                const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
                if (content.includes('Context from relevant documentation:')) {
                    const contextMatch = content.match(/Context from relevant documentation:(.*?)Previous code context:/s);
                    if (contextMatch && contextMatch[1]) {
                        originalContext += contextMatch[1].trim() + "\n";
                    }
                }
            }
        }
        // Validate the response
        if (originalContext) {
            try {
                const validationResult = await contextValidationTool.func(JSON.stringify({
                    action: "validate",
                    response: result.output,
                    originalContext: originalContext
                }));
                const validation = JSON.parse(validationResult);
                if (!validation.isValid) {
                    console.log("Response validation warning:", validation.message);
                    // Add a note rather than forcibly changing the response
                    if (validation.hallucinatedResources.length > 0) {
                        result.output += "\n\n[Note: Some resources in this response may need to be replaced with actual resources from your project.]";
                    }
                }
            }
            catch (error) {
                console.error("Error in response validation:", error);
            }
        }
        // Store code blocks for future reference
        const codeBlocks = extractCodeBlocks(result.output);
        if (codeBlocks.length > 0) {
            try {
                const codeContent = codeBlocks[0];
                const isFullHtml = isCompleteHTMLDocument(codeContent);
                await codeMemoryTool.func(JSON.stringify({
                    action: "store",
                    type: isFullHtml ? "full-document" : "component",
                    content: codeContent,
                    conversationId
                }));
                console.log(`Stored ${isFullHtml ? 'full HTML document' : 'component'} for conversation ${conversationId}`);
            }
            catch (error) {
                console.error("Error storing code in memory:", error);
            }
        }
        // Clean up output
        result.output = result.output.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
    }
    return result;
};
// Export the main functions
export { executorGPT, executeWithCodeHandling };
//# sourceMappingURL=custom-agent.js.map