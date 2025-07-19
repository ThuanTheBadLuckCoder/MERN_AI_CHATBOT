//custom-agent.ts

import { DynamicTool } from "@langchain/core/tools";
import { model } from "../../../config/openai-config.js";
import { modelGemini } from "../../../config/gemini-config.js";
import { ChatPromptTemplate, MessagesPlaceholder, } from "@langchain/core/prompts";
import { convertToOpenAIFunction } from "@langchain/core/utils/function_calling";
import { RunnableSequence } from "@langchain/core/runnables";
import { AgentExecutor, type AgentStep } from "langchain/agents";
import { formatToOpenAIFunctionMessages } from "langchain/agents/format_scratchpad";
import { OpenAIFunctionsAgentOutputParser } from "langchain/agents/openai/output_parser";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { ElasticClientArgs, ElasticVectorSearch } from "@langchain/community/vectorstores/elasticsearch";
import { Client } from "@elastic/elasticsearch";
import { config, embeddingsOpenAI, client } from "../../../config/elastic-config.js";
import { z } from "zod";
import { AgentAction, AgentFinish } from "@langchain/core/agents";
import { 
    processWithAdvancedNLP, 
    isDisambiguationResponse, 
    processDisambiguationResponse 
} from './adv-nlp-agent.js';
import { BM25Retriever } from "@langchain/community/retrievers/bm25";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";
import { createPatch, applyPatch } from 'diff';
import { parse as parseHTML } from 'node-html-parser';

const MEMORY_KEY = "chat_history";

// ElasticSearch configuration
const clientArgs: ElasticClientArgs = {
    client: new Client(config),
    indexName: process.env.ELASTIC_INDEX ?? `thesis_tailwindcss`,
}

const elasticVectorSearch = new ElasticVectorSearch(embeddingsOpenAI, clientArgs);

// ElasticSearch tool for retrieving relevant context
const elasticSearchTool = new DynamicTool({
    name: 'elastic_search_tool',
    description: 'This tool retrieves documents using ElasticSearch vector search',
    func: async (input: string) => {
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
async function performBM25Search(query: string, documents: Document[], k: number = 3): Promise<Document[]> {
    try {
        const bm25Retriever = await BM25Retriever.fromDocuments(documents, {
            k: k
        });
        
        const results = await bm25Retriever.getRelevantDocuments(query);
        return results;
    } catch (error) {
        console.error("Error in BM25 search:", error);
        return [];
    }
}

// Merge and re-rank search results
function mergeAndRerank(
    vectorResults: Document[], 
    keywordResults: Document[], 
    query: string
): Document[] {
    const uniqueDocuments = new Map<string, { doc: Document; score: number }>();
    
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
            const existing = uniqueDocuments.get(key)!;
            existing.score += (keywordScore * 0.3) + parentBonus;
        } else {
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

// Enhanced hybrid search tool with intelligent parent document resolution
const hybridSearchTool = new DynamicTool({
    name: 'hybrid_search_tool',
    description: 'Performs hybrid search with intelligent parent document resolution to ensure complete context',
    func: async (input: string) => {
        try {
            const schema = z.string();
            const validationResult = schema.safeParse(input);
            if (!validationResult.success) {
                throw new Error("Invalid input: " + validationResult.error.message);
            }
            
            console.log("Performing enhanced hybrid search for query:", input);
            
            const filter = [
                {
                    operator: "wildcard",
                    field: "source",
                    value: "*",
                },
            ];
            
            // Step 1: Perform vector search to find relevant documents
            const vectorResults = await elasticVectorSearch.similaritySearch(input, 3, filter);
            console.log(`Vector search returned ${vectorResults.length} results`);
            
            // Step 2: Perform keyword search for broader coverage
            const allDocuments = await elasticVectorSearch.similaritySearch("*", 5, filter);
            const keywordResults = await performEnhancedBM25Search(input, allDocuments);
            console.log(`Keyword search returned ${keywordResults.length} results`);
            
            // Step 3: Merge and rank results
            let combinedResults = mergeAndRerank(vectorResults, keywordResults, input);
            console.log(`Combined search returned ${combinedResults.length} unique results`);
            
            // Step 4: Enhanced parent document resolution
            const resolvedResults = await enhancedResolveParentDocuments(combinedResults);
            console.log(`After enhanced parent resolution: ${resolvedResults.length} documents`);
            
            // Step 5: Prioritize parent documents and remove duplicates
            const finalResults = prioritizeAndDeduplicate(resolvedResults);
            console.log(`Final results after deduplication: ${finalResults.length} documents`);
            
            const context = finalResults.map(doc => doc.pageContent);
            console.log("Final context length:", context.join('\n').length, "characters");
            
            const responseWithMetadata = {
                context: context,
                metadata: {
                    vectorResultCount: vectorResults.length,
                    keywordResultCount: keywordResults.length,
                    combinedResultCount: combinedResults.length,
                    resolvedResultCount: resolvedResults.length,
                    finalResultCount: finalResults.length,
                    containsFullDocuments: finalResults.some(doc => 
                        doc.metadata?.is_parent === true),
                    parentDocumentsFound: finalResults.filter(doc => 
                        doc.metadata?.is_parent === true).length,
                    childDocumentsResolved: finalResults.filter(doc => 
                        doc.metadata?.parent_id && !doc.metadata?.is_parent).length
                }
            };
            
            return context.length > 0 ? JSON.stringify(responseWithMetadata) : null;
        } catch (error) {
            console.error("Error in enhanced hybrid search:", error);
            return null;
        }
    }
});

// Enhanced parent document resolution with intelligent prioritization
async function enhancedResolveParentDocuments(documents: Document[]): Promise<Document[]> {
    const result: Document[] = [];
    const processedParentIds = new Set<string>();
    const processedChildIds = new Set<string>();
    
    console.log("Starting enhanced parent document resolution...");
    
    for (const doc of documents) {
        if (!doc.metadata) {
            result.push(doc);
            continue;
        }
        
        // If this is a parent document, add it directly
        if (doc.metadata.is_parent === true) {
            result.push(doc);
            if (doc.metadata.document_id) {
                processedParentIds.add(doc.metadata.document_id);
            }
            console.log(`Added parent document: ${doc.metadata.document_id || 'unknown'}`);
            continue;
        }
        
        // If this is a child document, try to find its parent
        if (doc.metadata.parent_id && !processedParentIds.has(doc.metadata.parent_id)) {
            try {
                console.log(`Found child document, searching for parent: ${doc.metadata.parent_id}`);
                
                // First try vector search with specific filters
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
                    const parentDoc = parentResults[0];
                    result.push(parentDoc);
                    processedParentIds.add(doc.metadata.parent_id);
                    processedChildIds.add(doc.metadata.document_id || '');
                    console.log(`Successfully resolved parent document: ${doc.metadata.parent_id}`);
                } else {
                    // Fallback to direct document fetch
                    console.log(`Vector search failed, trying direct fetch for parent: ${doc.metadata.parent_id}`);
                    try {
                        const directResults = await fetchDocumentById(doc.metadata.parent_id);
                        if (directResults) {
                            result.push(directResults);
                            processedParentIds.add(doc.metadata.parent_id);
                            processedChildIds.add(doc.metadata.document_id || '');
                            console.log(`Direct fetch successful for parent: ${doc.metadata.parent_id}`);
                        } else {
                            console.log(`Direct fetch failed for parent: ${doc.metadata.parent_id}, keeping child document`);
                            result.push(doc);
                        }
                    } catch (directError) {
                        console.error(`Failed direct fetch for parent: ${doc.metadata.parent_id}`, directError);
                        result.push(doc);
                    }
                }
            } catch (error) {
                console.error(`Error fetching parent document ${doc.metadata.parent_id}:`, error);
                result.push(doc);
            }
        } else if (doc.metadata.parent_id && processedParentIds.has(doc.metadata.parent_id)) {
            // Parent already processed, skip this child
            console.log(`Skipping child document, parent already processed: ${doc.metadata.document_id}`);
            continue;
        } else {
            // Not a child document, add it directly
            result.push(doc);
        }
    }
    
    console.log(`Enhanced resolution complete. Processed ${result.length} documents.`);
    console.log(`Parent documents found: ${processedParentIds.size}`);
    console.log(`Child documents resolved: ${processedChildIds.size}`);
    
    return result;
}

// Legacy function for backward compatibility
async function resolveParentDocuments(documents: Document[]): Promise<Document[]> {
    return enhancedResolveParentDocuments(documents);
}

// Prioritize parent documents and remove duplicates
function prioritizeAndDeduplicate(documents: Document[]): Document[] {
    console.log("Starting prioritization and deduplication...");
    
    const uniqueDocuments = new Map<string, Document>();
    const parentDocuments: Document[] = [];
    const childDocuments: Document[] = [];
    const otherDocuments: Document[] = [];
    
    // Categorize documents
    documents.forEach(doc => {
        if (!doc.metadata) {
            otherDocuments.push(doc);
            return;
        }
        
        const docId = doc.metadata.document_id || doc.pageContent.slice(0, 100);
        
        if (doc.metadata.is_parent === true) {
            parentDocuments.push(doc);
            uniqueDocuments.set(docId, doc);
        } else if (doc.metadata.parent_id) {
            childDocuments.push(doc);
            // Only add child if we don't have its parent
            if (!uniqueDocuments.has(doc.metadata.parent_id)) {
                uniqueDocuments.set(docId, doc);
            }
        } else {
            otherDocuments.push(doc);
            uniqueDocuments.set(docId, doc);
        }
    });
    
    // Prioritize parent documents over children
    const result: Document[] = [];
    
    // Add parent documents first (they contain complete information)
    parentDocuments.forEach(doc => {
        const docId = doc.metadata?.document_id || doc.pageContent.slice(0, 100);
        if (uniqueDocuments.has(docId)) {
            result.push(doc);
        }
    });
    
    // Add other documents (non-parent, non-child)
    otherDocuments.forEach(doc => {
        const docId = doc.metadata?.document_id || doc.pageContent.slice(0, 100);
        if (uniqueDocuments.has(docId)) {
            result.push(doc);
        }
    });
    
    // Add child documents only if their parent is not already included
    childDocuments.forEach(doc => {
        if (doc.metadata?.parent_id) {
            const parentExists = result.some(resultDoc => 
                resultDoc.metadata?.document_id === doc.metadata?.parent_id
            );
            
            if (!parentExists) {
                const docId = doc.metadata?.document_id || doc.pageContent.slice(0, 100);
                if (uniqueDocuments.has(docId)) {
                    result.push(doc);
                }
            }
        }
    });
    
    console.log(`Deduplication complete. Input: ${documents.length}, Output: ${result.length}`);
    console.log(`Parent documents: ${parentDocuments.length}, Child documents: ${childDocuments.length}, Other documents: ${otherDocuments.length}`);
    
    return result;
}

// Enhanced helper function to fetch a document directly by ID
async function fetchDocumentById(documentId: string): Promise<Document | null> {
    try {
        console.log(`Attempting direct fetch for document ID: ${documentId}`);
        
        const indexName = process.env.ELASTIC_INDEX || "*";
        
        // First try to find the document with parent flag
        const parentResponse = await client.search({
            index: indexName,
            body: {
                query: {
                    bool: {
                        must: [
                            { term: { "metadata.document_id": documentId } },
                            { term: { "metadata.is_parent": true } }
                        ]
                    }
                },
                size: 1
            }
        });
        
        if (parentResponse.hits.hits.length > 0) {
            const hit = parentResponse.hits.hits[0];
            const source = hit._source as any;
            
            console.log(`Successfully fetched parent document: ${documentId}`);
            
            return {
                pageContent: source.text || source.pageContent || "",
                metadata: source.metadata || {}
            };
        }
        
        // If not found as parent, try without the parent filter (fallback)
        console.log(`Parent document not found, trying without parent filter: ${documentId}`);
        
        const fallbackResponse = await client.search({
            index: indexName,
            body: {
                query: {
                    term: { "metadata.document_id": documentId }
                },
                size: 1
            }
        });
        
        if (fallbackResponse.hits.hits.length > 0) {
            const hit = fallbackResponse.hits.hits[0];
            const source = hit._source as any;
            
            console.log(`Found document without parent filter: ${documentId}`);
            
            return {
                pageContent: source.text || source.pageContent || "",
                metadata: source.metadata || {}
            };
        }
        
        console.log(`Document not found: ${documentId}`);
        return null;
    } catch (error) {
        console.error(`Error in direct document fetch for ${documentId}:`, error);
        return null;
    }
}

// STRICT: Context validation tool that enforces exact context adherence
const contextValidationTool = new DynamicTool({
    name: 'context_validation_tool',
    description: 'STRICT validation that enforces exact context adherence with zero tolerance for deviations',
    func: async (input: string) => {
        try {
            const data = JSON.parse(input);
            const action = data.action; // "validate", "extract_resources", or "check_hallucination"
            const response = data.response || "";
            const originalContext = data.originalContext || "";
            
            if (action === "validate") {
                // STRICT: Check if response follows context EXACTLY
                const contextResources = extractResources(originalContext);
                const responseResources = extractResources(response);
                
                // Check for ANY resources not from context (zero tolerance)
                const hallucinatedResources = responseResources.filter(resource => {
                    return !contextResources.some(contextResource => 
                        normalizeResource(contextResource) === normalizeResource(resource)
                    );
                });
                
                // Check for virtual/placeholder content
                const virtualContent = detectVirtualContent(response);
                
                // STRICT: Check for structural deviations from context
                const structuralDeviations = detectStructuralDeviations(response, originalContext);
                
                // STRICT: Check for code modifications
                const codeModifications = detectCodeModifications(response, originalContext);
                
                const hasAnyDeviations = hallucinatedResources.length > 0 || 
                                        virtualContent.length > 0 || 
                                        structuralDeviations.length > 0 || 
                                        codeModifications.length > 0;
                
                return JSON.stringify({
                    isValid: !hasAnyDeviations,
                    hallucinatedResources,
                    virtualContent,
                    structuralDeviations,
                    codeModifications,
                    contextResources: contextResources.length,
                    responseResources: responseResources.length,
                    message: hasAnyDeviations 
                        ? "STRICT MODE: Response deviates from provided context - REJECTED"
                        : "Response follows context exactly"
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
        } catch (error) {
            console.error("Error in context validation tool:", error);
            return JSON.stringify({ error: "Error processing validation request" });
        }
    }
});

// Helper functions for context validation
function extractResources(text: string): string[] {
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

function normalizeResource(resource: string): string {
    return resource
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/\?.*$/, '')
        .replace(/#.*$/, '');
}

function isLikelyHallucinated(resource: string): boolean {
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

function detectVirtualContent(text: string): string[] {
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

function categorizeResources(resources: string[]): { [key: string]: number } {
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
        } else if (resource.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
            categories.images++;
        } else if (resource.match(/\.css$/i)) {
            categories.stylesheets++;
        } else if (resource.match(/\.js$/i)) {
            categories.scripts++;
        } else if (resource.includes(' ')) {
            categories.classes++;
        } else {
            categories.other++;
        }
    });
    
    return categories;
}

// STRICT: Detect structural deviations from context
function detectStructuralDeviations(response: string, context: string): string[] {
    const deviations = [];
    
    // Extract HTML tags from context and response
    const contextTags = extractHTMLTags(context);
    const responseTags = extractHTMLTags(response);
    
    // Check for tags not present in context
    responseTags.forEach(tag => {
        if (!contextTags.includes(tag)) {
            deviations.push(`Unexpected HTML tag: ${tag}`);
        }
    });
    
    // Check for CSS classes not in context
    const contextClasses = extractCSSClasses(context);
    const responseClasses = extractCSSClasses(response);
    
    responseClasses.forEach(className => {
        if (!contextClasses.includes(className)) {
            deviations.push(`Unexpected CSS class: ${className}`);
        }
    });
    
    return deviations;
}

// STRICT: Detect code modifications from context
function detectCodeModifications(response: string, context: string): string[] {
    const modifications = [];
    
    // Extract code blocks from both
    const contextCodeBlocks = extractCodeBlocks(context);
    const responseCodeBlocks = extractCodeBlocks(response);
    
    // If context has code but response doesn't match exactly
    if (contextCodeBlocks.length > 0 && responseCodeBlocks.length > 0) {
        contextCodeBlocks.forEach((contextCode, index) => {
            if (responseCodeBlocks[index] && responseCodeBlocks[index] !== contextCode) {
                modifications.push(`Code block ${index + 1} modified from context`);
            }
        });
    }
    
    // Check for structural changes in HTML
    const contextStructure = extractHTMLStructure(context);
    const responseStructure = extractHTMLStructure(response);
    
    if (contextStructure !== responseStructure) {
        modifications.push("HTML structure modified from context");
    }
    
    return modifications;
}

// Helper function to extract HTML tags
function extractHTMLTags(text: string): string[] {
    const tagRegex = /<(\w+)[^>]*>/g;
    const tags = [];
    let match;
    
    while ((match = tagRegex.exec(text)) !== null) {
        tags.push(match[1].toLowerCase());
    }
    
    return [...new Set(tags)];
}

// Helper function to extract CSS classes
function extractCSSClasses(text: string): string[] {
    const classRegex = /(?:class|className)=["']([^"']*)["']/g;
    const classes = [];
    let match;
    
    while ((match = classRegex.exec(text)) !== null) {
        const classList = match[1].split(/\s+/).filter(c => c.trim());
        classes.push(...classList);
    }
    
    return [...new Set(classes)];
}

// Helper function to extract HTML structure (simplified)
function extractHTMLStructure(text: string): string {
    return text
        .replace(/\s+/g, ' ')
        .replace(/<[^>]*>/g, (match) => {
            const tag = match.match(/<(\w+)/);
            return tag ? `<${tag[1]}>` : match;
        })
        .trim();
}

// Greeting detection tool
const greetingDetectionTool = new DynamicTool({
    name: 'greeting_detection_tool',
    description: 'Detects if user input is a simple greeting or thanks and provides an immediate response',
    func: async (input: string) => {
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
                const greetingWordCount = words.filter(word => 
                    ['hi', 'hello', 'hey', 'greetings', 'morning', 'afternoon', 
                     'evening', 'howdy', 'sup'].includes(word)).length;
                
                const thanksWordCount = words.filter(word => 
                    ['thank', 'thanks', 'appreciate', 'grateful', 'thx', 'tysm'].includes(word)).length;
                
                const greetingRatio = greetingWordCount / words.length;
                const thanksRatio = thanksWordCount / words.length;
                
                if (greetingRatio > 0.3) {
                    const response = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
                    return JSON.stringify({ type: "greeting", response: response });
                } else if (thanksRatio > 0.3) {
                    const response = thanksResponses[Math.floor(Math.random() * thanksResponses.length)];
                    return JSON.stringify({ type: "thanks", response: response });
                } else {
                    return JSON.stringify({ type: "substantive", response: null });
                }
            } else {
                if (isGreeting) {
                    const response = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
                    return JSON.stringify({ type: "greeting", response: response });
                } else if (isThanks) {
                    const response = thanksResponses[Math.floor(Math.random() * thanksResponses.length)];
                    return JSON.stringify({ type: "thanks", response: response });
                } else {
                    return JSON.stringify({ type: "substantive", response: null });
                }
            }
        } catch (error) {
            console.error("Error in greeting detection:", error);
            return JSON.stringify({ type: "substantive", response: null });
        }
    }
});

// Simplified code memory tool - less restrictive
const codeMemoryTool = new DynamicTool({
    name: 'code_memory_tool',
    description: 'Stores and retrieves code context to maintain continuity between related questions',
    func: async (input: string) => {
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
                console.log(`Retrieved code state for conversation ${conversationId}:`,
                    codeState.fullHtmlDocument ? "Has full HTML document" : "No full HTML document",
                    `History entries: ${codeState.codeHistory.length}`);

                return JSON.stringify(codeState);
            }

            return JSON.stringify(codeState);
        } catch (error) {
            console.error("Error in code memory tool:", error);
            return JSON.stringify({ codeHistory: [] });
        }
    }
});

// Enhanced code handling utilities
function isCompleteHTMLDocument(code: string): boolean {
    return code.includes("<!DOCTYPE html>") && 
           code.includes("<html") && 
           code.includes("</html>") &&
           code.includes("<head") &&
           code.includes("<body");
}

function hasHTMLElements(code: string): boolean {
    return code.includes("<div") || 
           code.includes("<section") || 
           code.includes("<p") || 
           code.includes("<span") ||
           code.includes("<html") ||
           code.includes("<body");
}

function extractCodeBlocks(output: string): string[] {
    const codeBlocks: string[] = [];
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

function replaceCodeBlocks(output: string, codeBlocks: string[]): string {
    let result = output;
    let index = 0;
    
    return result.replace(/```[\s\S]*?```/g, () => {
      const language = hasHTMLElements(codeBlocks[index]) ? 'html' : 'javascript';
      const replacement = '```' + language + '\n' + codeBlocks[index] + '\n```';
      index++;
      return replacement;
    });
}

function getDefaultTemplate(): string {
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

function mergeWithTemplate(fragment: string, template: string): string {
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
    } catch (error) {
      console.error("Error merging with template:", error);
    }
    
    return template.replace(/<body[^>]*>([\s\S]*?)<\/body>/i, `<body class="p-4">\n${fragment}\n</body>`);
}

// STRICT: Tools array with zero-tolerance context adherence
const tools = [
    hybridSearchTool, 
    elasticSearchTool, 
    codeMemoryTool, 
    greetingDetectionTool,
    contextValidationTool  // STRICT validation with zero tolerance for deviations
];

// STRICT: Force LLM to follow context code exactly without any modifications
const frontEndDevPrompt = ChatPromptTemplate.fromMessages([
    ["system",
        `You are a front-end development assistant that MUST follow the provided context code EXACTLY.

        🚨 CRITICAL RULE - 100% CONTEXT ADHERENCE:
        You MUST copy and use the code from the provided context EXACTLY as it appears
        NO modifications, NO improvements, NO adaptations, NO changes whatsoever
        If the context contains code, you MUST reproduce it character-for-character
        If the context shows specific HTML structure, CSS classes, or JavaScript, use them EXACTLY
        DO NOT add your own styling, DO NOT change class names, DO NOT modify structure
        DO NOT use different frameworks or libraries than what's shown in the context
        DO NOT create variations or "improved" versions of the context code

        CONTEXT USAGE MANDATE:
        1. ALWAYS prioritize the provided context as the SOLE source of truth
        2. The context contains COMPLETE parent documents - use the FULL content provided
        3. When context contains code examples, reproduce them EXACTLY as written
        4. If context shows specific TailwindCSS classes, use those EXACT classes
        5. If context shows specific HTML structure, maintain that EXACT structure
        6. If context shows specific JavaScript/TypeScript code, use it EXACTLY
        7. DO NOT substitute similar libraries or frameworks
        8. DO NOT add additional features not present in the context
        9. DO NOT modify colors, spacing, or styling unless explicitly shown in context
        10. The context includes complete documents - use ALL the information provided

        FORBIDDEN ACTIONS:
        ❌ Modifying or "improving" context code
        ❌ Substituting different CSS frameworks or libraries
        ❌ Adding features not present in the context
        ❌ Changing class names, IDs, or structure
        ❌ Using different color schemes or styling
        ❌ Adding animations or effects not in context
        ❌ Creating "enhanced" or "better" versions
        ❌ Using different HTML tags or attributes
        ❌ Adding JavaScript functionality not in context

        REQUIRED ACTIONS:
        ✅ Copy context code exactly as provided
        ✅ Use the same HTML structure and tags
        ✅ Use the same CSS classes and styling
        ✅ Use the same JavaScript/TypeScript code
        ✅ Maintain the same file organization
        ✅ Keep the same naming conventions
        ✅ Preserve all comments and formatting
        ✅ Use the same external resources and CDN links

        RESPONSE STRATEGY:
        - If context provides complete code, deliver it EXACTLY as shown
        - If context provides partial code, use ONLY what's provided
        - If context shows specific examples, reproduce them precisely
        - If no context is available, clearly state that you cannot proceed
        - Never create code that deviates from the provided context
        - Always acknowledge when you're following context exactly

        QUALITY ASSURANCE:
        ✅ Is the code identical to what's in the context?
        ✅ Are all class names, IDs, and attributes preserved?
        ✅ Is the HTML structure exactly the same?
        ✅ Are the CSS styles unchanged?
        ✅ Is the JavaScript code unmodified?
        ✅ Are external resources the same?

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
    async parse(text: string): Promise<AgentAction | AgentFinish> {
        const standardOutput = await super.parse(text);
        return standardOutput;
    }
}

const runnableAgent = RunnableSequence.from([
    {
        input: (i: { input: string; steps: AgentStep[]; conversationId?: string }) => i.input,
        agent_scratchpad: (i: { input: string; steps: AgentStep[] }) =>
            formatToOpenAIFunctionMessages(i.steps),
        context: async (i: { input: string; steps: AgentStep[] }) => {
            const searchResult = await hybridSearchTool.func(i.input);
            let contextResults = [];
            
            if (searchResult) {
                try {
                    const parsedResult = JSON.parse(searchResult);
                    contextResults = parsedResult.context;
                    // console.log("Hybrid search metadata:", parsedResult.metadata);
                } catch (e) {
                    console.error("Error parsing hybrid search results:", e);
                }
            }
            
            // console.log("Context retrieved: ", contextResults ? contextResults.length : 0, "documents");
            return contextResults && contextResults.length > 0 ? 
                contextResults.join("\n") : 
                "No relevant context found.";
        },
        chat_history: (i: { input: string; steps: AgentStep[]; chat_history: BaseMessage[]; conversationId?: string }) =>
            i.chat_history || [],
        code_context: async (i: {
            input: string;
            steps: AgentStep[];
            conversationId?: string
        }) => {
            const conversationId = i.conversationId || "default";
            try {
                const codeMemoryResult = await codeMemoryTool.func(JSON.stringify({
                    action: "retrieve",
                    conversationId
                }));

                const codeState = JSON.parse(codeMemoryResult);

                if (codeState.fullHtmlDocument) {
                    return `STRICT CONTEXT ADHERENCE REQUIRED - Previous HTML document for EXACT reproduction:\n\n${codeState.fullHtmlDocument}`;
                } else if (codeState.codeHistory && codeState.codeHistory.length > 0) {
                    const relevantCode = codeState.codeHistory
                        .filter(entry => entry.type === "full-document" || entry.type === "component")
                        .pop();

                    if (relevantCode) {
                        return `STRICT CONTEXT ADHERENCE REQUIRED - Previous code for EXACT reproduction:\n\n${relevantCode.content}`;
                    }
                }

                const codeBlockRegex = /```[\s\S]*?```/g;
                const codeMatches = i.input.match(codeBlockRegex);

                if (codeMatches && codeMatches.length > 0) {
                    const userCode = codeMatches[0].replace(/```[\w]*\n/, '').replace(/```$/, '');
                    return `STRICT CONTEXT ADHERENCE REQUIRED - User provided code for EXACT reproduction:\n\n${userCode}`;
                }

                return "No previous code context available. Cannot proceed without context.";
            } catch (error) {
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
async function performEnhancedBM25Search(query: string, documents: Document[], k: number = 3): Promise<Document[]> {
    try {
        const bm25Retriever = await BM25Retriever.fromDocuments(documents, {
            k: k
        });
        
        const results = await bm25Retriever.getRelevantDocuments(query);
        return results;
    } catch (error) {
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

// STRICT: Code handling that enforces exact context adherence
const executeWithCodeHandling = async (
    input: string,
    chatHistory: BaseMessage[] = [],
    conversationId: string
) => {
    // Check for greetings/thanks
    try {
        const greetingResult = await greetingDetectionTool.func(input);
        const greetingData = JSON.parse(greetingResult);

        if (greetingData.type === "greeting" || greetingData.type === "thanks") {
            // console.log(`Detected ${greetingData.type}, providing immediate response`);
            return {
                output: greetingData.response,
                intermediateSteps: []
            };
        }
    } catch (error) {
        console.error("Error in greeting detection:", error);
    }

    // Retrieve and include code context with STRICT adherence instructions
    let codeState;
    try {
        const codeMemoryResult = await codeMemoryTool.func(JSON.stringify({
            action: "retrieve",
            conversationId
        }));
        codeState = JSON.parse(codeMemoryResult);
        
        const fullCodeContext = codeState.fullHtmlDocument;
        if (fullCodeContext) {
            // console.log("Including code context in conversation");
            
            const codeContextMessage = new SystemMessage({
                content: `STRICT CONTEXT ADHERENCE REQUIRED - Available code for EXACT reproduction:\n\n\`\`\`html\n${fullCodeContext}\n\`\`\`\n\nYou MUST reproduce this code EXACTLY as shown. NO modifications, NO improvements, NO changes whatsoever.`
            });
            
            chatHistory = [codeContextMessage, ...chatHistory];
        }
    } catch (error) {
        console.error("Error retrieving code context:", error);
        codeState = { codeHistory: [] };
    }

    // Execute the agent
    const result = await executorGPT.invoke({
        input,
        chat_history: chatHistory,
        conversationId
    });

    // STRICT: Validate response follows context exactly with zero tolerance for deviations
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

        // STRICT validation - reject any response that deviates from context
        if (originalContext) {
            try {
                const validationResult = await contextValidationTool.func(JSON.stringify({
                    action: "validate",
                    response: result.output,
                    originalContext: originalContext
                }));

                const validation = JSON.parse(validationResult);
                
                if (!validation.isValid) {
                    console.log("STRICT MODE: Response deviates from context, rejecting");
                    // Force the response to acknowledge context adherence failure
                    result.output = `I cannot provide this response as it deviates from the provided context. The context contains specific code that must be followed exactly. Please ensure your request aligns with the available context materials.`;
                }
            } catch (error) {
                console.error("Error in strict response validation:", error);
            }
        }

        // Store code blocks for future reference (only if they match context exactly)
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
                
                // console.log(`Stored ${isFullHtml ? 'full HTML document' : 'component'} for conversation ${conversationId}`);
            } catch (error) {
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