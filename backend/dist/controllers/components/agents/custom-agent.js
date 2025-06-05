import { DynamicTool } from "@langchain/core/tools";
import { model } from "../../../config/openai-config.js";
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
import { config, embeddingsOpenAI, client } from "../../../config/elastic-config.js";
import { z } from "zod";
import { processWithAdvancedNLP, isDisambiguationResponse, processDisambiguationResponse } from './adv-nlp-agent.js';
import { BM25Retriever } from "@langchain/community/retrievers/bm25";
import { Document } from "@langchain/core/documents";
import { createPatch, applyPatch } from 'diff';
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
// Helper function to perform BM25 search
async function performBM25Search(query, documents, k = 3) {
    try {
        // Initialize BM25 retriever with the documents
        const bm25Retriever = await BM25Retriever.fromDocuments(documents, {
            k: k
        });
        // Retrieve relevant documents using BM25
        const results = await bm25Retriever.getRelevantDocuments(query);
        return results;
    }
    catch (error) {
        console.error("Error in BM25 search:", error);
        return [];
    }
}
// Helper function to merge and re-rank search results
/**
 * Merges and re-ranks search results with special handling for parent/child relationships
 */
function mergeAndRerank(vectorResults, keywordResults, query) {
    // Create a map to track unique documents by content
    const uniqueDocuments = new Map();
    // Process vector results first (semantic matching)
    vectorResults.forEach((doc, index) => {
        // Calculate score based on position
        const vectorScore = 1 - (index / vectorResults.length);
        // Give bonus to parent documents to prioritize complete code
        const parentBonus = doc.metadata?.is_parent === true ? 0.2 : 0;
        uniqueDocuments.set(doc.pageContent, {
            doc: doc,
            score: (vectorScore * 0.7) + parentBonus // Weight vector results at 70% + parent bonus
        });
    });
    // Process keyword results (lexical matching)
    keywordResults.forEach((doc, index) => {
        const keywordScore = 1 - (index / keywordResults.length);
        const key = doc.pageContent;
        // Give bonus to parent documents in keyword results too
        const parentBonus = doc.metadata?.is_parent === true ? 0.15 : 0;
        if (uniqueDocuments.has(key)) {
            // If document already exists from vector search, combine scores
            const existing = uniqueDocuments.get(key);
            existing.score += (keywordScore * 0.3) + parentBonus;
        }
        else {
            // Add new document from keyword search
            uniqueDocuments.set(key, {
                doc: doc,
                score: (keywordScore * 0.3) + parentBonus
            });
        }
    });
    // Additional re-ranking based on query term presence
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    uniqueDocuments.forEach((value) => {
        const content = value.doc.pageContent.toLowerCase();
        // Count query terms present in the document
        const termMatches = queryTerms.filter(term => content.includes(term)).length;
        const termBoost = termMatches / queryTerms.length * 0.2; // 20% boost for term matches
        value.score += termBoost;
    });
    // Convert to array, sort by score, and return just the documents
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
            // Validate input
            const schema = z.string();
            const validationResult = schema.safeParse(input);
            if (!validationResult.success) {
                throw new Error("Invalid input: " + validationResult.error.message);
            }
            console.log("Performing hybrid search for query:", input);
            // Basic filter for documents
            const filter = [
                {
                    operator: "wildcard",
                    field: "source",
                    value: "*",
                },
            ];
            // Step 1: Perform dense vector search
            const vectorResults = await elasticVectorSearch.similaritySearch(input, 5, filter);
            console.log(`Dense vector search returned ${vectorResults.length} results`);
            // Step 2: Collect documents for BM25 search
            const allDocuments = await elasticVectorSearch.similaritySearch("*", 30, filter);
            // Step 3: Perform BM25 search
            const keywordResults = await performEnhancedBM25Search(input, allDocuments);
            console.log(`BM25 search returned ${keywordResults.length} results`);
            // Step 4: Merge and re-rank results
            let combinedResults = mergeAndRerank(vectorResults, keywordResults, input);
            console.log(`Initial hybrid search returned ${combinedResults.length} unique results after merging`);
            // Step 5: Resolve parent documents when chunks are returned
            const resolvedResults = await resolveParentDocuments(combinedResults);
            console.log(`After parent resolution: ${resolvedResults.length} total documents`);
            // Extract page content for response
            const context = resolvedResults.map(doc => doc.pageContent);
            // Add debug info in metadata
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
/**
 * Resolves parent documents for any child chunks found in search results
 * This ensures complete code is always available when needed
 */
async function resolveParentDocuments(documents) {
    // Create an array for results and keep track of processed parent IDs
    const result = [];
    const processedParentIds = new Set();
    // Check each document to see if it's a child that needs parent resolution
    for (const doc of documents) {
        // Skip documents without metadata
        if (!doc.metadata) {
            result.push(doc);
            continue;
        }
        // If this is a parent document, add it directly and mark it as processed
        if (doc.metadata.is_parent === true) {
            result.push(doc);
            if (doc.metadata.document_id) {
                processedParentIds.add(doc.metadata.document_id);
            }
            continue;
        }
        // This is a child document, check if we need to fetch its parent
        if (doc.metadata.parent_id && !processedParentIds.has(doc.metadata.parent_id)) {
            try {
                // Create a filter for ElasticSearch
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
                // Search for the parent document
                // Note: Don't use minScore as it's not a valid parameter
                const parentResults = await elasticVectorSearch.similaritySearch("", 1, filter);
                if (parentResults.length > 0) {
                    // Add parent document to results and mark it as processed
                    result.push(parentResults[0]);
                    processedParentIds.add(doc.metadata.parent_id);
                    console.log(`Resolved parent document: ${doc.metadata.parent_id}`);
                }
                else {
                    console.log(`No parent document found for ID: ${doc.metadata.parent_id}`);
                    // Try an alternative approach: direct fetch by ID if supported
                    try {
                        // Use the direct fetch method
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
        // Always add the child document
        result.push(doc);
    }
    return result;
}
/**
 * Helper function to fetch a document directly by ID
 * This is a fallback method if filters don't work as expected
 */
async function fetchDocumentById(documentId) {
    try {
        // This is a direct ElasticSearch query using the client
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
        // Extract the document from the response
        if (response.hits.hits.length > 0) {
            const hit = response.hits.hits[0];
            const source = hit._source; // Using 'any' for flexibility
            // Convert to Document format
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
// NEW: Greeting and thanks detection tool
// NEW: Greeting and thanks detection tool with direct response templates
const greetingDetectionTool = new DynamicTool({
    name: 'greeting_detection_tool',
    description: 'Detects if user input is a simple greeting or thanks and provides an immediate response',
    func: async (input) => {
        try {
            // Simple pattern matching for common greetings and thanks
            const greetingPatterns = [
                /^hi\b/i, /^hello\b/i, /^hey\b/i, /^greetings\b/i, /^good morning\b/i,
                /^good afternoon\b/i, /^good evening\b/i, /^howdy\b/i, /^what's up\b/i,
                /^how are you\b/i, /^how's it going\b/i
            ];
            const thanksPatterns = [
                /thank you/i, /thanks/i, /appreciate it/i, /grateful/i, /thank/i,
                /tysm/i, /thx/i, /thank u/i
            ];
            // Predefined response templates - no need to call LLM
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
            // Check if input is primarily a greeting or thanks
            const isGreeting = greetingPatterns.some(pattern => pattern.test(input.trim()));
            const isThanks = thanksPatterns.some(pattern => pattern.test(input.trim()));
            // For longer messages (>50 chars), likely not just a greeting/thanks
            if (input.length > 50) {
                // For longer messages, do more careful checking
                // Count the words and see if greeting/thanks words dominate
                const words = input.toLowerCase().trim().split(/\s+/);
                const greetingWordCount = words.filter(word => ['hi', 'hello', 'hey', 'greetings', 'morning', 'afternoon',
                    'evening', 'howdy', 'sup'].includes(word)).length;
                const thanksWordCount = words.filter(word => ['thank', 'thanks', 'appreciate', 'grateful', 'thx', 'tysm'].includes(word)).length;
                // If greeting/thanks words make up more than 30% of the message, treat as greeting/thanks
                const greetingRatio = greetingWordCount / words.length;
                const thanksRatio = thanksWordCount / words.length;
                if (greetingRatio > 0.3) {
                    // Select a random greeting response
                    const response = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
                    return JSON.stringify({
                        type: "greeting",
                        response: response
                    });
                }
                else if (thanksRatio > 0.3) {
                    // Select a random thanks response
                    const response = thanksResponses[Math.floor(Math.random() * thanksResponses.length)];
                    return JSON.stringify({
                        type: "thanks",
                        response: response
                    });
                }
                else {
                    return JSON.stringify({
                        type: "substantive",
                        response: null
                    });
                }
            }
            else {
                // For shorter messages, use simple pattern matching
                if (isGreeting) {
                    // Select a random greeting response
                    const response = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
                    return JSON.stringify({
                        type: "greeting",
                        response: response
                    });
                }
                else if (isThanks) {
                    // Select a random thanks response
                    const response = thanksResponses[Math.floor(Math.random() * thanksResponses.length)];
                    return JSON.stringify({
                        type: "thanks",
                        response: response
                    });
                }
                else {
                    return JSON.stringify({
                        type: "substantive",
                        response: null
                    });
                }
            }
        }
        catch (error) {
            console.error("Error in greeting detection:", error);
            return JSON.stringify({
                type: "substantive",
                response: null
            });
        }
    }
});
function hasRequestedChanges(input) {
    // Look for explicit change requests in the input
    const changePatterns = [
        /can you (change|modify|update|edit|alter)/i,
        /please (change|modify|update|edit|alter)/i,
        /would you (change|modify|update|edit|alter)/i,
        /(change|modify|update|edit|alter) the (code|html|css|tailwind)/i,
        /make (changes|modifications|updates|edits|alterations)/i,
        /i want (changes|modifications|updates|edits|alterations)/i,
        /i need (changes|modifications|updates|edits|alterations)/i
    ];
    return changePatterns.some(pattern => pattern.test(input));
}
// NEW: Implement PersistentCodeManager class
class PersistentCodeManager {
    storage;
    activeDocuments;
    constructor(storageProvider) {
        this.storage = storageProvider;
        this.activeDocuments = new Map();
    }
    async getFullDocument(conversationId) {
        if (!this.activeDocuments.has(conversationId)) {
            const stored = await this.storage.retrieve(conversationId);
            if (stored)
                this.activeDocuments.set(conversationId, stored);
        }
        return this.activeDocuments.get(conversationId);
    }
    async storeDocument(conversationId, document, type = "full-html", userRequestedChanges = false) {
        // Verify and correct the document if needed
        const verifiedDocument = await this.verifyAndCorrectDocument(conversationId, document, userRequestedChanges);
        this.activeDocuments.set(conversationId, verifiedDocument);
        await this.storage.store(conversationId, verifiedDocument, type);
        return true;
    }
    async updateDocument(conversationId, newDocument) {
        const currentDocument = await this.getFullDocument(conversationId);
        if (currentDocument && newDocument) {
            // Use diff to create a more manageable update if both documents exist
            try {
                const diff = createPatch('code.html', currentDocument, newDocument);
                const updatedCode = applyPatch(currentDocument, diff);
                // Verify the update is valid
                if (this.isValidHTML(updatedCode)) {
                    return await this.storeDocument(conversationId, updatedCode);
                }
            }
            catch (error) {
                console.error("Error during document patch:", error);
                // Fall back to full replacement
            }
        }
        // If diff fails or no current document, do a full replacement
        return await this.storeDocument(conversationId, newDocument);
    }
    isValidHTML(html) {
        try {
            // Simple validation - check for balanced tags
            const root = parseHTML(html);
            return root !== null && html.includes("<!DOCTYPE html>") && html.includes("</html>");
        }
        catch (e) {
            return false;
        }
    }
    async verifyAndCorrectDocument(conversationId, newDocument, userRequestedChanges = false) {
        const currentDocument = await this.getFullDocument(conversationId);
        // If no changes requested and we have a current document, verify preservation
        if (!userRequestedChanges && currentDocument) {
            try {
                // Use the exactContextPreservationTool for verification
                const verificationResult = JSON.parse(await exactContextPreservationTool.func(JSON.stringify({
                    action: "verify",
                    content: newDocument,
                    originalContext: currentDocument
                })));
                // If verification fails, enforce preservation
                if (!verificationResult.preserved) {
                    console.log("Document verification failed - enforcing exact preservation");
                    const enforcementResult = JSON.parse(await exactContextPreservationTool.func(JSON.stringify({
                        action: "enforce",
                        content: newDocument,
                        originalContext: currentDocument
                    })));
                    return enforcementResult.correctedContent;
                }
            }
            catch (error) {
                console.error("Error during document verification:", error);
            }
        }
        return newDocument;
    }
}
// Create a storage adapter for the PersistentCodeManager
const codeStorageAdapter = {
    async store(conversationId, document, type) {
        // Use the existing global cache for now
        if (!global.codeStateCache) {
            global.codeStateCache = {};
        }
        if (!global.codeStateCache[conversationId]) {
            global.codeStateCache[conversationId] = { codeHistory: [] };
        }
        // Update the document in the cache
        if (type === "full-html") {
            global.codeStateCache[conversationId].fullHtmlDocument = document;
        }
        // Add to history
        global.codeStateCache[conversationId].codeHistory.push({
            type: type,
            content: document,
            timestamp: Date.now()
        });
        // Limit history size
        if (global.codeStateCache[conversationId].codeHistory.length > 5) {
            global.codeStateCache[conversationId].codeHistory =
                global.codeStateCache[conversationId].codeHistory.slice(-5);
        }
        return true;
    },
    async retrieve(conversationId) {
        if (!global.codeStateCache || !global.codeStateCache[conversationId]) {
            return null;
        }
        return global.codeStateCache[conversationId].fullHtmlDocument || null;
    }
};
// Create persistent code manager instance
const persistentCodeManager = new PersistentCodeManager(codeStorageAdapter);
// NEW: HTML Document Stitcher class for DOM-aware document manipulations
class HTMLDocumentStitcher {
    insertOrUpdate(fullDocument, fragment, targetSelector) {
        try {
            // Parse the full document
            const doc = parseHTML(fullDocument);
            const target = doc.querySelector(targetSelector);
            if (target) {
                // Parse the fragment
                const fragmentDoc = parseHTML(`<div>${fragment}</div>`);
                // Replace the target content with the fragment
                target.innerHTML = fragmentDoc.innerHTML;
            }
            return doc.toString();
        }
        catch (error) {
            console.error("Error in HTML document stitching:", error);
            return fullDocument; // Return original if stitching fails
        }
    }
    findRelevantElements(document, query) {
        try {
            const doc = parseHTML(document);
            const elements = [];
            // Find elements that might match the query keywords
            const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            // Look for elements with relevant attributes or content
            ['div', 'section', 'nav', 'header', 'footer', 'main', 'aside'].forEach(tag => {
                doc.querySelectorAll(tag).forEach(element => {
                    const innerHTML = element.innerHTML.toLowerCase();
                    const id = element.getAttribute('id') || '';
                    const className = element.getAttribute('class') || '';
                    // Check if this element contains any of the query words
                    const relevantToQuery = queryWords.some(word => innerHTML.includes(word) ||
                        id.includes(word) ||
                        className.includes(word));
                    if (relevantToQuery) {
                        // Create a selector for this element
                        let selector = tag;
                        if (id)
                            selector += `#${id}`;
                        else if (className)
                            selector += `.${className.split(' ')[0]}`;
                        elements.push({
                            selector,
                            html: element.toString()
                        });
                    }
                });
            });
            return elements;
        }
        catch (error) {
            console.error("Error finding relevant elements:", error);
            return [];
        }
    }
}
const documentStitcher = new HTMLDocumentStitcher();
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
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  </head>
  <body class="p-4">
    <!-- Content will be inserted here -->
  </body>
  </html>`;
}
function mergeWithTemplate(fragment, template) {
    if (isCompleteHTMLDocument(fragment)) {
        return fragment; // Already complete
    }
    try {
        // Parse the template
        const doc = parseHTML(template);
        const body = doc.querySelector('body');
        if (body) {
            // Insert the fragment into the body
            body.innerHTML = fragment;
            return doc.toString();
        }
    }
    catch (error) {
        console.error("Error merging with template:", error);
    }
    // Fallback: manual string replacement
    return template.replace(/<body[^>]*>([\s\S]*?)<\/body>/i, `<body class="p-4">\n${fragment}\n</body>`);
}
// Code memory tool to retain full code context between queries
// Modify the codeMemoryTool to ensure reliable caching by conversation ID
const codeMemoryTool = new DynamicTool({
    name: 'code_memory_tool',
    description: 'Stores and retrieves code context to maintain continuity between related questions',
    func: async (input) => {
        try {
            const data = JSON.parse(input);
            const action = data.action; // "store", "retrieve", "update", "analyze"
            const conversationId = data.conversationId || "default";
            // Initialize codeState structure if needed
            if (!global.codeStateCache) {
                global.codeStateCache = {};
            }
            if (!global.codeStateCache[conversationId]) {
                global.codeStateCache[conversationId] = { codeHistory: [] };
            }
            // Get current code state
            let codeState = global.codeStateCache[conversationId];
            if (action === "store") {
                // Store new code
                const codeContent = data.content;
                const codeType = data.type || "full-document";
                // Use PersistentCodeManager for storage
                if (codeType === "full-document" || codeContent.includes("<!DOCTYPE html>")) {
                    await persistentCodeManager.storeDocument(conversationId, codeContent, "full-html");
                    codeState.fullHtmlDocument = codeContent;
                }
                // Add to history
                codeState.codeHistory.push({
                    type: codeType,
                    content: codeContent,
                    timestamp: Date.now()
                });
                // Limit history size
                if (codeState.codeHistory.length > 5) {
                    codeState.codeHistory = codeState.codeHistory.slice(-5);
                }
                // Update the cache
                global.codeStateCache[conversationId] = codeState;
                return JSON.stringify(codeState);
            }
            else if (action === "retrieve") {
                // Log retrieval for debugging
                console.log(`Retrieved code state for conversation ${conversationId}:`, codeState.fullHtmlDocument ? "Has full HTML document" : "No full HTML document", `History entries: ${codeState.codeHistory.length}`);
                return JSON.stringify(codeState);
            }
            else if (action === "update") {
                // Update existing code with DOM-aware modifications
                const selector = data.selector; // CSS selector for element to update
                const newContent = data.content;
                const operation = data.operation || "replace"; // "replace", "add", "modify"
                if (codeState.fullHtmlDocument && selector && newContent) {
                    // Use HTMLDocumentStitcher for intelligent DOM updates
                    const updatedDocument = documentStitcher.insertOrUpdate(codeState.fullHtmlDocument, newContent, selector);
                    // Update the full document
                    codeState.fullHtmlDocument = updatedDocument;
                    codeState.lastModifiedElement = selector;
                    // Store the modification info
                    codeState.codeHistory.push({
                        type: "modification",
                        content: JSON.stringify({ selector, newContent, operation }),
                        timestamp: Date.now()
                    });
                    // Limit history size
                    if (codeState.codeHistory.length > 5) {
                        codeState.codeHistory = codeState.codeHistory.slice(-5);
                    }
                }
                // Update the cache
                global.codeStateCache[conversationId] = codeState;
                return JSON.stringify(codeState);
            }
            else if (action === "analyze") {
                // Enhanced document analysis with DOM awareness
                const query = data.query;
                // Find relevant elements in the document
                const relevantElements = codeState.fullHtmlDocument ?
                    documentStitcher.findRelevantElements(codeState.fullHtmlDocument, query) : [];
                // Create an enhanced analysis object
                const analysis = {
                    hasFullDocument: !!codeState.fullHtmlDocument,
                    needsToMaintainFullDocument: true,
                    modificationTarget: codeState.lastModifiedElement || "Unknown",
                    lastChangeType: codeState.codeHistory.length > 0
                        ? codeState.codeHistory[codeState.codeHistory.length - 1].type
                        : "none",
                    relevantElements: relevantElements
                };
                return JSON.stringify(analysis);
            }
            return JSON.stringify(codeState);
        }
        catch (error) {
            console.error("Error in code memory tool:", error);
            return JSON.stringify({
                codeHistory: []
            });
        }
    }
});
// Enhanced conversation analyzer tool with code context awareness
const conversationAnalyzerTool = new DynamicTool({
    name: 'conversation_analyzer_tool',
    description: 'Analyzes the conversation and code context to maintain continuity',
    func: async (inputStr) => {
        try {
            // Parse the input as JSON
            const input = JSON.parse(inputStr);
            // If no chat history, it's definitely a new question
            if (!input.chatHistory || input.chatHistory.length === 0) {
                return JSON.stringify({
                    type: "new-question",
                    codeContext: "none",
                    requiresFullHtml: true
                });
            }
            // Get code context if available
            let codeContext = "none";
            let hasFullHtml = false;
            let lastModificationType = "none";
            if (input.codeState) {
                hasFullHtml = !!input.codeState.fullHtmlDocument;
                if (input.codeState.codeHistory && input.codeState.codeHistory.length > 0) {
                    lastModificationType = input.codeState.codeHistory[input.codeState.codeHistory.length - 1].type;
                }
            }
            // Format the chat history and current question for the model
            const messages = [
                new SystemMessage({
                    content: `You are an expert conversation analyzer focusing on front-end development questions.
                    
                    Analyze the conversation to determine:
                    1. If the current question is a follow-up that builds on previous code
                    2. If the user is requesting a modification to previous code
                    3. If the response should include a complete HTML document or just a component
                    4. What specific part of the previous code needs to be modified
                    
                    Code context information:
                    - Has complete HTML document: ${hasFullHtml}
                    - Last modification type: ${lastModificationType}
                    
                    Provide your analysis as JSON with this structure:
                    {
                      "type": "new-question" or "follow-up",
                      "codeContext": "none" or "modification" or "extension" or "complete-rewrite",
                      "requiresFullHtml": true or false,
                      "specificElement": "description of the element to modify, if applicable",
                      "preserveStructure": true or false
                    }`
                }),
                ...input.chatHistory.slice(-6),
                new HumanMessage({
                    content: `Current question: ${input.currentQuestion}`
                })
            ];
            // Use the model to analyze
            const response = await modelGemini.invoke(messages);
            // Get response content
            const responseContent = typeof response.content === 'string'
                ? response.content
                : JSON.stringify(response.content);
            // Extract the JSON from the response
            const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : '{"type":"new-question","codeContext":"none","requiresFullHtml":true}';
            try {
                // Validate and ensure defaults
                const analysis = JSON.parse(jsonStr);
                return JSON.stringify({
                    type: analysis.type || "new-question",
                    codeContext: analysis.codeContext || "none",
                    requiresFullHtml: analysis.requiresFullHtml !== false, // Default to true
                    specificElement: analysis.specificElement || null,
                    preserveStructure: analysis.preserveStructure !== false // Default to true
                });
            }
            catch (parseError) {
                console.error("Error parsing JSON from model response:", parseError);
                return JSON.stringify({
                    type: "new-question",
                    codeContext: "none",
                    requiresFullHtml: true
                });
            }
        }
        catch (error) {
            console.error("Error analyzing conversation:", error);
            return JSON.stringify({
                type: "new-question",
                codeContext: "none",
                requiresFullHtml: true
            });
        }
    }
});
// Define a dedicated tool for context preservation
// Enhanced exact context preservation tool
const exactContextPreservationTool = new DynamicTool({
    name: 'exact_context_preservation_tool',
    description: 'Ensures that provided context is preserved exactly without any modifications',
    func: async (input) => {
        try {
            // Parse the input JSON
            const data = JSON.parse(input);
            const action = data.action; // "verify", "extract", or "enforce"
            const content = data.content || "";
            const originalContext = data.originalContext || "";
            if (action === "verify") {
                // Verify that context is preserved exactly
                const links = extractLinks(originalContext);
                const paths = extractPaths(originalContext);
                const icons = extractIcons(originalContext);
                const tailwindClasses = extractTailwindClasses(originalContext);
                // Perform detailed verification
                const linkPreservation = verifyExactArrayPreservation(links, content);
                const pathPreservation = verifyExactArrayPreservation(paths, content);
                const iconPreservation = verifyExactArrayPreservation(icons, content);
                const tailwindPreservation = verifyTailwindClassPreservation(tailwindClasses, content);
                const isPreserved = linkPreservation.preserved &&
                    pathPreservation.preserved &&
                    iconPreservation.preserved &&
                    tailwindPreservation.preserved;
                return JSON.stringify({
                    preserved: isPreserved,
                    details: {
                        links: linkPreservation,
                        paths: pathPreservation,
                        icons: iconPreservation,
                        tailwind: tailwindPreservation
                    },
                    message: isPreserved
                        ? "Context preserved exactly"
                        : "Context has been modified - correction needed"
                });
            }
            else if (action === "extract") {
                // Extract content that needs to be preserved exactly
                const extractedContent = {
                    codeBlocks: extractCodeBlocks(content),
                    links: extractLinks(content),
                    paths: extractPaths(content),
                    icons: extractIcons(content),
                    tailwindClasses: extractTailwindClasses(content),
                    quotedText: extractQuotedText(content)
                };
                return JSON.stringify(extractedContent);
            }
            else if (action === "enforce") {
                // Force preservation by replacing modified elements with originals
                const correctedContent = enforceExactPreservation(originalContext, content);
                return JSON.stringify({
                    originalContent: content,
                    correctedContent: correctedContent,
                    message: "Context preservation enforced"
                });
            }
            return JSON.stringify({ error: "Invalid action specified" });
        }
        catch (error) {
            console.error("Error in context preservation tool:", error);
            return JSON.stringify({ error: "Error processing context preservation request" });
        }
    }
});
// Helper function to extract paths from text
function extractPaths(text) {
    // Match both absolute and relative paths
    const pathRegex = /(?:src|href|url|path)=["']([^"']+)["']/g;
    const paths = [];
    let match;
    while ((match = pathRegex.exec(text)) !== null) {
        paths.push(match[1]);
    }
    return paths;
}
// Helper function to extract icon references
function extractIcons(text) {
    // Match icon class names and references
    const iconRegex = /(?:class|className)=["']([^"']*(?:icon|fa-|material-|mdi-)[^"']*)["']/g;
    const icons = [];
    let match;
    while ((match = iconRegex.exec(text)) !== null) {
        icons.push(match[1]);
    }
    return icons;
}
// Helper function to extract Tailwind classes
function extractTailwindClasses(text) {
    // Match class attributes that contain Tailwind classes
    const classRegex = /(?:class|className)=["']([^"']*)["']/g;
    const classes = [];
    let match;
    while ((match = classRegex.exec(text)) !== null) {
        classes.push(match[1]);
    }
    return classes;
}
// Verify exact preservation of array elements
function verifyExactArrayPreservation(original, current) {
    const missing = [];
    const modified = [];
    for (const item of original) {
        if (!current.includes(item)) {
            // Check if it's missing completely or just modified
            const similarItems = findSimilarStrings(item, current);
            if (similarItems.length > 0) {
                modified.push({
                    original: item,
                    current: similarItems[0]
                });
            }
            else {
                missing.push(item);
            }
        }
    }
    return {
        preserved: missing.length === 0 && modified.length === 0,
        missing,
        modified
    };
}
// Verify Tailwind class preservation (allowing rearrangement)
function verifyTailwindClassPreservation(original, current) {
    const issues = [];
    for (const classSet of original) {
        // Split class names and check if all are present
        const classes = classSet.split(/\s+/).filter(c => c.length > 0);
        for (const cls of classes) {
            // Special handling for Tailwind - it's valid if the class exists, even if order changes
            const classRegex = new RegExp(`\\b${cls}\\b`);
            if (!classRegex.test(current)) {
                issues.push({
                    original: cls,
                    type: "missing_class"
                });
            }
        }
    }
    return {
        preserved: issues.length === 0,
        details: issues
    };
}
// Find similar strings (to detect minor modifications)
function findSimilarStrings(target, text) {
    // Simple implementation - could be enhanced with Levenshtein distance
    const results = [];
    // Create a regex that allows for small variations
    const escapedTarget = target.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const pattern = escapedTarget.split('').join('[^a-zA-Z0-9]*');
    const flexibleRegex = new RegExp(pattern, 'i');
    // Extract potential matches
    const words = text.split(/\s+/);
    for (const word of words) {
        if (flexibleRegex.test(word) && !results.includes(word)) {
            results.push(word);
        }
    }
    return results;
}
// Enforce exact preservation by correcting the content
function enforceExactPreservation(original, modified) {
    let corrected = modified;
    // Extract elements from original that must be preserved
    const originalLinks = extractLinks(original);
    const originalPaths = extractPaths(original);
    const originalIcons = extractIcons(original);
    // Extract potentially modified elements
    const modifiedLinks = extractLinks(modified);
    const modifiedPaths = extractPaths(modified);
    const modifiedIcons = extractIcons(modified);
    // Replace modified links with original links
    for (let i = 0; i < modifiedLinks.length && i < originalLinks.length; i++) {
        if (modifiedLinks[i] !== originalLinks[i]) {
            corrected = corrected.replace(modifiedLinks[i], originalLinks[i]);
        }
    }
    // Replace modified paths with original paths
    for (let i = 0; i < modifiedPaths.length && i < originalPaths.length; i++) {
        if (modifiedPaths[i] !== originalPaths[i]) {
            // Create a regex that handles the path in attribute context
            const regex = new RegExp(`((?:src|href|url|path)=["'])${escapeRegExp(modifiedPaths[i])}(["'])`, 'g');
            corrected = corrected.replace(regex, `$1${originalPaths[i]}$2`);
        }
    }
    // Replace modified icons with original icons
    for (let i = 0; i < modifiedIcons.length && i < originalIcons.length; i++) {
        if (modifiedIcons[i] !== originalIcons[i]) {
            // Create a regex that handles the class in attribute context
            const regex = new RegExp(`((?:class|className)=["'])${escapeRegExp(modifiedIcons[i])}(["'])`, 'g');
            corrected = corrected.replace(regex, `$1${originalIcons[i]}$2`);
        }
    }
    return corrected;
}
// Helper function to escape special characters in regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// const tools = [elasticSearchTool, conversationAnalyzerTool, codeMemoryTool, greetingDetectionTool];
// const tools = [hybridSearchTool, elasticSearchTool, conversationAnalyzerTool, codeMemoryTool, greetingDetectionTool];
const tools = [
    hybridSearchTool,
    elasticSearchTool,
    conversationAnalyzerTool,
    codeMemoryTool,
    greetingDetectionTool,
    exactContextPreservationTool // Add the new tool here
];
// Modify the frontEndDevPrompt in custom-agent.ts by adding this section
// to the system message part:
const frontEndDevPrompt = ChatPromptTemplate.fromMessages([
    ["system",
        `You are a helpful, expert front-end developer assistant. Your responses should be technically accurate, comprehensive, and maintain continuity across the conversation, especially for code examples.
        NOTE: Since all your code will use the TailwindCSS library, you will always have to specify the correct path like this : "<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>"
        CONVERSATION AND CODE ANALYSIS:
        {conversation_analysis}
        
        CRITICAL CODE PRESERVATION DIRECTIVES:
        1. 1. NEVER, UNDER ANY CIRCUMSTANCES, MODIFY ANY EXISTING CODE (UNLESS IT IS ADMITTED, ABSOLUTELY DO NOT ADD, REMOVE, DELETE CODE) unless the user EXPRESSLY requests a change.
        2. ALL paths, links, CDN references, and TailwindCSS classes MUST be preserved EXACTLY as they appear in the original code.
        3. When the user does NOT explicitly request changes, you MUST return the EXACT SAME CODE with no modifications whatsoever.
        4. If the user does request changes, you may modify ONLY the specific elements they mentioned, while preserving everything else exactly.
        5. ALL external resource paths (CDN links, image sources, fonts, etc.) must be preserved EXACTLY as they appear in the original code.
        6. NEVER "improve" or "fix" code unless specifically asked to do so.
        7. When getting context from the system, if the user has no EXPLICIT request to change the code, PROVIDE THE EXACT SAME CODE with no edits.
        
        EXACT CONTEXT PRESERVATION DIRECTIVES:
        1. PRESERVE ALL CONTEXT: When context or information is provided, use it EXACTLY as provided without any changes, modifications, substitutions, or interpretations. This includes preserving all formatting, spacing, capitalization, and punctuation.
        2. QUOTE LINKS PRECISELY: All links must be quoted VERBATIM without any modifications. Do not change URLs in any way, do not add or remove characters, and do not modify protocols (http vs https).
        3. NO CORRECTIONS: Do not attempt to "fix" or "improve" any information that is provided. If you believe there is an error in the provided context, you must still reproduce it exactly as given.
        4. NO CONTENT EDITING: Do not add, remove, or modify any content from the provided context unless explicitly instructed to do so.
        5. VERIFICATION: Before sending your final response, verify that all content from the original context is preserved exactly as provided.
        
        TAILWINDCSS PRESERVATION RULES:
        1. ALL TailwindCSS class names must be preserved EXACTLY as they appear in the original code.
        2. Do not reorder, reformat, or "improve" TailwindCSS classes.
        3. Do not convert utility classes to component classes or vice versa.
        4. Preserve all spacing, formatting, and organization of class attributes.
        
        RESPONSE GUIDELINES:
        - When answering questions about existing code, reference the code exactly as it appears.
        - Only suggest modifications if the user explicitly asks for changes.
        - When the user asks for changes, clearly state what you are changing and why.
        - Verify that your response preserves all required elements before sending.
        
        Context from relevant documentation: {context}
        Previous code context: {code_context}
        `],
    new MessagesPlaceholder(MEMORY_KEY),
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
]);
// Function to ensure context is preserved exactly
function verifyExactContextPreservation(originalContext, responseOutput, links = []) {
    // Check if all original context is preserved exactly
    const contextIncluded = originalContext.split('\n')
        .filter(line => line.trim().length > 0)
        .every(line => responseOutput.includes(line));
    // Check if all links are preserved exactly
    const linksPreserved = links.every(link => {
        // Count occurrences in original vs response
        const originalOccurrences = countOccurrences(originalContext, link);
        const responseOccurrences = countOccurrences(responseOutput, link);
        // Links should appear at least the same number of times
        return responseOccurrences >= originalOccurrences;
    });
    return contextIncluded && linksPreserved;
}
// Helper function to count string occurrences
function countOccurrences(text, searchString) {
    let count = 0;
    let position = text.indexOf(searchString);
    while (position !== -1) {
        count++;
        position = text.indexOf(searchString, position + 1);
    }
    return count;
}
// Add this to the executeWithCodeHandling function to enforce context preservation
const executeWithExactContext = async (input, chatHistory = [], conversationId = "default") => {
    // Extract links from input for verification
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    const links = input.match(linkRegex) || [];
    // Normal execution
    const result = await executeWithCodeHandling(input, chatHistory, conversationId);
    // Verify context preservation in the output
    if (typeof result.output === 'string' && !verifyExactContextPreservation(input, result.output, links)) {
        // If verification fails, add a warning
        result.output = `[WARNING: Some context may not be preserved exactly as provided. Please verify all information.]\n\n${result.output}`;
    }
    return result;
};
// Model with OpenAI functions
const modelWithFunctions = model.bind({
    functions: tools.map((tool) => convertToOpenAIFunction(tool)),
});
// Enhanced code continuity output parser with improved validation
class CodeContinuityOutputParser extends OpenAIFunctionsAgentOutputParser {
    async parse(text) {
        // First let the original parser handle function calling and standard outputs
        const standardOutput = await super.parse(text);
        // Keep chainOfThought for debugging if it exists
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
        // context: async (i: { input: string; steps: AgentStep[] }) => {
        //     const contextResults = await elasticSearchTool.func(i.input);
        //     console.log("Context retrieved: ", contextResults ? contextResults.length : 0, "documents");
        //     return contextResults ? contextResults.join("\n") : "No relevant context found.";
        // },
        context: async (i) => {
            // Use hybrid search instead of just elasticSearchTool
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
        conversation_analysis: async (i) => {
            // First retrieve code state
            let codeState = { codeHistory: [] };
            const conversationId = i.conversationId || "default";
            try {
                const codeMemoryResult = await codeMemoryTool.func(JSON.stringify({
                    action: "retrieve",
                    conversationId
                }));
                codeState = JSON.parse(codeMemoryResult);
                console.log(`Retrieved code state for conversation ${conversationId}`);
                // Extract any code from the current user input
                const codeBlockRegex = /```[\s\S]*?```/g;
                const codeMatches = i.input.match(codeBlockRegex);
                if (codeMatches && codeMatches.length > 0) {
                    console.log("Found user-provided code, storing in memory");
                    // Store each code block the user provided
                    for (const codeMatch of codeMatches) {
                        const codeContent = codeMatch.replace(/```[\w]*\n/, '').replace(/```$/, '');
                        const isFullHtml = codeContent.includes("<!DOCTYPE html>") ||
                            (codeContent.includes("<html") && codeContent.includes("<body"));
                        // Store the user-provided code
                        await codeMemoryTool.func(JSON.stringify({
                            action: "store",
                            type: isFullHtml ? "full-document" : "component",
                            content: codeContent,
                            conversationId
                        }));
                        // If it's a full HTML document, make sure we set it as such
                        if (isFullHtml) {
                            console.log("User provided a full HTML document");
                            codeState.fullHtmlDocument = codeContent;
                        }
                    }
                    // Refresh our code state after storing user code
                    const updatedMemoryResult = await codeMemoryTool.func(JSON.stringify({
                        action: "retrieve",
                        conversationId
                    }));
                    codeState = JSON.parse(updatedMemoryResult);
                }
            }
            catch (error) {
                console.error("Error retrieving code state:", error);
            }
            // Then analyze the conversation with the code context
            if (!i.chat_history || i.chat_history.length === 0) {
                return "This is a new conversation. Provide a comprehensive and complete response with properly structured code.";
            }
            // Create input for the conversation analyzer
            const analyzerInput = JSON.stringify({
                currentQuestion: i.input,
                chatHistory: i.chat_history,
                codeState: codeState
            });
            try {
                const analysisResultStr = await conversationAnalyzerTool.func(analyzerInput);
                const analysisResult = JSON.parse(analysisResultStr);
                console.log("Conversation analysis: ", analysisResult);
                // Create detailed instructions based on the analysis
                let analysisInstructions = "";
                if (analysisResult.type === "follow-up") {
                    analysisInstructions = `This is a follow-up question about code you previously provided.`;
                    if (analysisResult.codeContext === "modification") {
                        analysisInstructions += ` The user wants you to MODIFY the existing code.`;
                    }
                    else if (analysisResult.codeContext === "extension") {
                        analysisInstructions += ` The user wants you to EXTEND the existing code with new features.`;
                    }
                    if (analysisResult.specificElement) {
                        analysisInstructions += ` Focus on modifying: ${analysisResult.specificElement}.`;
                    }
                    if (analysisResult.requiresFullHtml) {
                        analysisInstructions += ` IMPORTANT: You MUST provide a COMPLETE HTML document in your response, not just fragments.`;
                    }
                    if (analysisResult.preserveStructure) {
                        analysisInstructions += ` Maintain the overall document structure and only change what's needed.`;
                    }
                }
                else {
                    analysisInstructions = "This appears to be a new question requiring a fresh response.";
                    if (analysisResult.requiresFullHtml) {
                        analysisInstructions += ` Provide a COMPLETE HTML document with proper DOCTYPE, html, head, and body tags.`;
                    }
                }
                // Add specific instructions about user-provided code
                if (i.input.includes("```")) {
                    analysisInstructions += " IMPORTANT: The user has provided code in their message. You MUST incorporate this code into your response.";
                }
                return analysisInstructions;
            }
            catch (error) {
                console.error("Error processing conversation analysis:", error);
                return "Provide a complete and comprehensive response. For HTML code, always include the full document structure.";
            }
        },
        code_context: async (i) => {
            const conversationId = i.conversationId || "default";
            try {
                const codeMemoryResult = await codeMemoryTool.func(JSON.stringify({
                    action: "retrieve",
                    conversationId
                }));
                const codeState = JSON.parse(codeMemoryResult);
                if (codeState.fullHtmlDocument) {
                    return `You have previously provided a full HTML document. When modifying or updating code, use this as your starting point and provide a complete updated document:\n\n${codeState.fullHtmlDocument}`;
                }
                else if (codeState.codeHistory && codeState.codeHistory.length > 0) {
                    // Find the most recent full document or component
                    const relevantCode = codeState.codeHistory
                        .filter(entry => entry.type === "full-document" || entry.type === "component")
                        .pop();
                    if (relevantCode) {
                        return `Reference this previous code when responding:\n\n${relevantCode.content}`;
                    }
                }
                // Extract any code from the current user input to use as context
                const codeBlockRegex = /```[\s\S]*?```/g;
                const codeMatches = i.input.match(codeBlockRegex);
                if (codeMatches && codeMatches.length > 0) {
                    const userCode = codeMatches[0].replace(/```[\w]*\n/, '').replace(/```$/, '');
                    return `The user has provided this code that you should use as your starting point:\n\n${userCode}`;
                }
                return "No previous code context available. Provide complete code in your response.";
            }
            catch (error) {
                console.error("Error retrieving code context:", error);
                return "No previous code context available. Provide complete code in your response.";
            }
        }
    },
    frontEndDevPrompt,
    modelWithFunctions,
    new CodeContinuityOutputParser(),
]);
// Utility function to preprocess documents for better search quality
function preprocessDocumentForSearch(doc) {
    // Remove excessive whitespace
    let content = doc.pageContent.replace(/\s+/g, ' ').trim();
    // Extract keywords if possible (simple implementation)
    let keywords = [];
    // Look for common patterns like headers or emphasized text
    const headerMatches = content.match(/<h[1-6]>(.*?)<\/h[1-6]>/gi);
    if (headerMatches) {
        headerMatches.forEach(match => {
            const headerText = match.replace(/<\/?h[1-6]>/gi, '').trim();
            keywords.push(headerText);
        });
    }
    // Look for strong/emphasized text
    const strongMatches = content.match(/<(strong|b|em|i)>(.*?)<\/(strong|b|em|i)>/gi);
    if (strongMatches) {
        strongMatches.forEach(match => {
            const strongText = match.replace(/<\/?(?:strong|b|em|i)>/gi, '').trim();
            keywords.push(strongText);
        });
    }
    // Add keywords to metadata
    const metadata = {
        ...doc.metadata,
        keywords: keywords.join(' ')
    };
    return new Document({
        pageContent: content,
        metadata: metadata
    });
}
// Function to perform BM25 search with improved parameters
async function performEnhancedBM25Search(query, documents, k = 3) {
    try {
        // Preprocess documents for better BM25 performance
        const processedDocs = documents.map(preprocessDocumentForSearch);
        // Initialize BM25 retriever with the documents and custom parameters
        const bm25Retriever = await BM25Retriever.fromDocuments(processedDocs, {
            k: k,
            // bm25Params: {
            //     k1: 1.5,  // Term frequency saturation parameter
            //     b: 0.75,  // Document length normalization parameter
            // }
        });
        // Retrieve relevant documents using BM25
        const results = await bm25Retriever.getRelevantDocuments(query);
        return results;
    }
    catch (error) {
        console.error("Error in enhanced BM25 search:", error);
        return [];
    }
}
// Add a callback handler to log the chain of thought
const executorGPT = AgentExecutor.fromAgentAndTools({
    agent: runnableAgent,
    tools,
    verbose: true,
    handleParsingErrors: true,
    returnIntermediateSteps: true,
});
// NEW: Code state verification middleware
function codeStateVerificationMiddleware(result, codeState) {
    if (typeof result.output !== 'string')
        return result;
    const codeBlocks = extractCodeBlocks(result.output);
    if (codeBlocks.length > 0) {
        for (let i = 0; i < codeBlocks.length; i++) {
            // Verify code completeness
            if (!isCompleteHTMLDocument(codeBlocks[i]) && hasHTMLElements(codeBlocks[i])) {
                // Find the most relevant template to use
                const baseTemplate = codeState?.fullHtmlDocument || getDefaultTemplate();
                // Intelligently merge the code block with the template
                codeBlocks[i] = mergeWithTemplate(codeBlocks[i], baseTemplate);
            }
        }
        // Replace the code blocks in the output
        result.output = replaceCodeBlocks(result.output, codeBlocks);
    }
    return result;
}
const executeWithCodeHandling = async (input, chatHistory = [], conversationId) => {
    // First check for greetings/thanks
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
    // Check if user explicitly requests changes
    const requestsChanges = /change|modify|update|customize|edit|alter/i.test(input);
    // Retrieve full code context and force it into the conversation
    let codeState;
    try {
        const codeMemoryResult = await codeMemoryTool.func(JSON.stringify({
            action: "retrieve",
            conversationId
        }));
        codeState = JSON.parse(codeMemoryResult);
        // Force the code context into the conversation
        const fullCodeContext = codeState.fullHtmlDocument;
        if (fullCodeContext) {
            console.log("Forcing full code context into conversation");
            // Create system message with the full code and STRICT preservation instructions
            const preservationFlag = requestsChanges ?
                "User has requested changes to this code. You may make modifications." :
                "CRITICAL: This code must be preserved EXACTLY as is, including all paths, links, and Tailwind classes. DO NOT CHANGE ANY PART OF THIS CODE unless explicitly requested.";
            const codeContextMessage = new SystemMessage({
                content: `The current full HTML document is:\n\n\`\`\`html\n${fullCodeContext}\n\`\`\`\n\n${preservationFlag}`
            });
            // Add at the beginning of chat history
            chatHistory = [codeContextMessage, ...chatHistory];
        }
    }
    catch (error) {
        console.error("Error retrieving code context:", error);
        codeState = { codeHistory: [] };
    }
    // Perform hybrid search for context
    try {
        console.log("Performing hybrid search before agent execution");
        await hybridSearchTool.func(input);
    }
    catch (error) {
        console.error("Error performing pre-agent hybrid search:", error);
    }
    // Add explicit preservation instructions based on user request
    if (!requestsChanges && codeState.fullHtmlDocument) {
        // Extract critical elements to preserve
        const preservationData = await exactContextPreservationTool.func(JSON.stringify({
            action: "extract",
            content: codeState.fullHtmlDocument
        }));
        // Add preservation instructions
        const preservationMessage = new SystemMessage({
            content: `PRESERVATION REQUIREMENT: Unless the user EXPLICITLY requests changes, you must preserve ALL elements of the code EXACTLY as they appear. This includes:
            1. All paths in src, href, and url attributes
            2. All TailwindCSS classes EXACTLY as written
            3. All icon references and class names
            4. All external library references and CDN links
            
            DO NOT modify ANY of these elements unless the user EXPLICITLY asks for changes. If you're unsure, return the EXACT same code.`
        });
        chatHistory = [preservationMessage, ...chatHistory];
    }
    // Execute the agent with conversation ID
    const result = await executorGPT.invoke({
        input,
        chat_history: chatHistory,
        conversationId
    });
    // Post-process with STRICT verification - if not requested changes
    if (!requestsChanges && codeState.fullHtmlDocument && typeof result.output === 'string') {
        // Extract code blocks from the output
        const codeBlocks = extractCodeBlocks(result.output);
        if (codeBlocks.length > 0) {
            // Verify preservation of critical elements in first code block
            const verificationResult = await exactContextPreservationTool.func(JSON.stringify({
                action: "verify",
                content: codeBlocks[0],
                originalContext: codeState.fullHtmlDocument
            }));
            const verification = JSON.parse(verificationResult);
            // If preservation failed, enforce it
            if (!verification.preserved) {
                console.log("Context preservation verification failed. Enforcing preservation.");
                // Force preservation
                const enforcementResult = await exactContextPreservationTool.func(JSON.stringify({
                    action: "enforce",
                    content: codeBlocks[0],
                    originalContext: codeState.fullHtmlDocument
                }));
                const enforcement = JSON.parse(enforcementResult);
                // Replace the non-preserved code with the corrected version
                result.output = result.output.replace(codeBlocks[0], enforcement.correctedContent);
                // Add a note explaining the enforcement
                result.output += "\n\n[System Note: As per requirements, all original paths, links, and elements have been preserved exactly as in the original code.]";
            }
        }
    }
    // Apply the standard code state verification
    const verifiedResult = codeStateVerificationMiddleware(result, codeState);
    // Process the output to ensure code completeness
    if (typeof verifiedResult.output === 'string') {
        let modifiedOutput = verifiedResult.output;
        // Remove any thinking tags
        modifiedOutput = modifiedOutput.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
        // Extract code blocks for storage
        const codeBlocks = extractCodeBlocks(modifiedOutput);
        // Store the code in memory for future reference
        try {
            if (codeBlocks.length > 0) {
                // Get the main code block (first one)
                const codeContent = codeBlocks[0];
                const isFullHtml = isCompleteHTMLDocument(codeContent);
                // Use the persistent code manager
                if (isFullHtml) {
                    await persistentCodeManager.storeDocument(conversationId, codeContent, "full-html");
                    console.log(`Stored full HTML document for conversation ${conversationId}`);
                }
                else {
                    await codeMemoryTool.func(JSON.stringify({
                        action: "store",
                        type: "component",
                        content: codeContent,
                        conversationId
                    }));
                    console.log(`Stored component for conversation ${conversationId}`);
                }
            }
        }
        catch (error) {
            console.error("Error storing code in memory:", error);
        }
        verifiedResult.output = modifiedOutput;
    }
    return verifiedResult;
};
const enhancedCodeMemoryTool = async (action, data, conversationId = "default") => {
    try {
        // Create a properly formatted request to the code memory tool
        const requestData = {
            action,
            conversationId,
            ...data
        };
        const result = await codeMemoryTool.func(JSON.stringify(requestData));
        return JSON.parse(result);
    }
    catch (error) {
        console.error(`Error in enhanced code memory (${action}):`, error);
        return { codeHistory: [] };
    }
};
// Enhanced executeWithNLP with improved code handling
const executeWithNLP = async (input, chatHistory = [], conversationId = "default") => {
    // Check if user has explicitly requested changes
    const userRequestedChanges = hasRequestedChanges(input);
    // Retrieve code context for NLP processing
    let codeState;
    try {
        const codeMemoryResult = await codeMemoryTool.func(JSON.stringify({
            action: "retrieve",
            conversationId
        }));
        codeState = JSON.parse(codeMemoryResult);
        // Force the code context into the conversation if available
        const fullCodeContext = codeState.fullHtmlDocument;
        if (fullCodeContext) {
            // Create stronger preservation instructions based on user request
            const preservationFlag = userRequestedChanges ?
                "User has requested changes to this code. You may modify it as requested." :
                "CRITICAL PRESERVATION REQUIREMENT: You MUST preserve this code EXACTLY as shown, including ALL paths, links, class names, and formatting. Make NO changes unless explicitly instructed.";
            // Create system message with the full code
            const codeContextMessage = new SystemMessage({
                content: [{
                        type: "text",
                        text: `The current full HTML document is:\n\n\`\`\`html\n${fullCodeContext}\n\`\`\`\n\n${preservationFlag}`
                    }]
            });
            // Add at the beginning of chat history to ensure it's always used
            chatHistory = [codeContextMessage, ...chatHistory.filter(msg => !(msg instanceof SystemMessage &&
                    Array.isArray(msg.content) &&
                    msg.content.some(item => item.type === "text" &&
                        item.text.includes("full HTML document"))))];
        }
    }
    catch (error) {
        console.error("Error retrieving code state for NLP:", error);
        codeState = { codeHistory: [] };
    }
    // Handle disambiguation responses
    if (isDisambiguationResponse(input, chatHistory, conversationId)) {
        return processDisambiguationResponse(input, chatHistory, codeState, conversationId, executeWithCodeHandling);
    }
    // Extract and store code from user input
    const extractedCode = extractCodeBlocks(input);
    if (extractedCode.length > 0) {
        for (const codeContent of extractedCode) {
            const isFullHtml = isCompleteHTMLDocument(codeContent);
            if (isFullHtml) {
                await persistentCodeManager.storeDocument(conversationId, codeContent, "full-html", userRequestedChanges // Pass the flag to indicate if changes are requested
                );
                console.log("User provided a full HTML document - storing as primary document");
                codeState.fullHtmlDocument = codeContent;
            }
            else {
                await codeMemoryTool.func(JSON.stringify({
                    action: "store",
                    type: "component",
                    content: codeContent,
                    conversationId
                }));
            }
        }
    }
    // Add a system message reinforcing preservation requirements if no changes requested
    if (!userRequestedChanges && codeState.fullHtmlDocument) {
        const enforcementMessage = new SystemMessage({
            content: [{
                    type: "text",
                    text: `CRITICAL ENFORCEMENT: The user has NOT explicitly requested any changes to the code. You MUST preserve the EXACT same code in your response, including ALL paths, links, class names, and formatting. NO modifications are allowed unless explicitly requested.`
                }]
        });
        chatHistory = [enforcementMessage, ...chatHistory];
    }
    // Process with advanced NLP
    const nlpResult = await processWithAdvancedNLP(input.replace(/```[\s\S]*?```/g, match => "```CODE_BLOCK```"), chatHistory, codeState, conversationId, executeWithCodeHandling);
    // Apply strict verification if no changes requested
    if (!userRequestedChanges && codeState.fullHtmlDocument && typeof nlpResult.output === 'string') {
        const extractedBlocks = extractCodeBlocks(nlpResult.output);
        if (extractedBlocks.length > 0) {
            // Verify that the code hasn't been modified
            const verificationResult = JSON.parse(await exactContextPreservationTool.func(JSON.stringify({
                action: "verify",
                content: extractedBlocks[0],
                originalContext: codeState.fullHtmlDocument
            })));
            if (!verificationResult.preserved) {
                console.log("NLP result failed verification - enforcing preservation");
                // Force preservation
                const enforcementResult = JSON.parse(await exactContextPreservationTool.func(JSON.stringify({
                    action: "enforce",
                    content: extractedBlocks[0],
                    originalContext: codeState.fullHtmlDocument
                })));
                // Replace the modified code with exact original
                nlpResult.output = nlpResult.output.replace(extractedBlocks[0], enforcementResult.correctedContent);
                // Add a note explaining what happened
                nlpResult.output += "\n\n[System Note: As no changes were requested, the original code has been preserved exactly.]";
            }
        }
    }
    // Apply code state verification to ensure complete code
    const verifiedResult = codeStateVerificationMiddleware(nlpResult, codeState);
    return verifiedResult;
};
// Helper function to extract links from text
function extractLinks(text) {
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(linkRegex) || [];
}
// Helper function to extract quoted text
function extractQuotedText(text) {
    const quoteRegex = /"([^"]*)"/g;
    const matches = [];
    let match;
    while ((match = quoteRegex.exec(text)) !== null) {
        matches.push(match[1]);
    }
    return matches;
}
// Add this tool to your tools array
// Export the executor and the code handling function
export { executorGPT, executeWithCodeHandling, executeWithNLP, executeWithExactContext };
//# sourceMappingURL=custom-agent.js.map