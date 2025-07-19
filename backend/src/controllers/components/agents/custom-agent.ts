//custom-agent.ts

import { DynamicTool } from "@langchain/core/tools";
import { model } from "../../../config/openai-config.js";
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
import { randomUUID } from "crypto";

// Global type declarations
declare global {
  var referenceTracker: { [conversationId: string]: Reference[] };
  var currentReferences: { [conversationId: string]: Reference[] };
  var codeStateCache: { [conversationId: string]: any };
}

const MEMORY_KEY = "chat_history";

// Token management constants
const MAX_CONTEXT_TOKENS = 8000; // Reserve space for system prompt and chat history
const MAX_CHAT_HISTORY_TOKENS = 4000; // Limit chat history tokens
const MAX_CODE_CONTEXT_TOKENS = 2000; // Limit code context tokens
const MAX_CONTEXT_ANALYSIS_TOKENS = 500; // Limit context analysis tokens
const TOKENS_PER_CHAR = 0.25; // Rough estimate: 1 token ≈ 4 characters

// Global reference tracking storage
if (!global.referenceTracker) {
    global.referenceTracker = {};
}

// Token management utilities
function estimateTokens(text: string): number {
    return Math.ceil(text.length * TOKENS_PER_CHAR);
}

function truncateText(text: string, maxTokens: number): string {
    const maxChars = Math.floor(maxTokens / TOKENS_PER_CHAR);
    if (text.length <= maxChars) {
        return text;
    }
    return text.substring(0, maxChars) + "...";
}

function truncateContext(context: string[]): string[] {
    let totalTokens = 0;
    const maxTokensPerDocument = Math.floor(MAX_CONTEXT_TOKENS / 3); // Distribute tokens across 3 documents
    
    return context.filter(doc => {
        const docTokens = estimateTokens(doc);
        if (totalTokens + docTokens <= MAX_CONTEXT_TOKENS && docTokens <= maxTokensPerDocument) {
            totalTokens += docTokens;
            return true;
        }
        return false;
    }).map(doc => truncateText(doc, maxTokensPerDocument));
}

function truncateChatHistory(chatHistory: BaseMessage[]): BaseMessage[] {
    // Keep only the last 10 messages and limit their content
    const recentMessages = chatHistory.slice(-10);
    let totalTokens = 0;
    
    return recentMessages.filter(msg => {
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        const msgTokens = estimateTokens(content);
        
        if (totalTokens + msgTokens <= MAX_CHAT_HISTORY_TOKENS) {
            totalTokens += msgTokens;
            return true;
        }
        return false;
    }).map(msg => {
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        const truncatedContent = truncateText(content, 500); // Limit each message to ~500 tokens
        
        if (msg instanceof HumanMessage) {
            return new HumanMessage(truncatedContent);
        } else if (msg instanceof AIMessage) {
            return new AIMessage(truncatedContent);
        } else if (msg instanceof SystemMessage) {
            return new SystemMessage(truncatedContent);
        }
        return msg;
    });
}

function truncateCodeContext(codeContext: string): string {
    return truncateText(codeContext, MAX_CODE_CONTEXT_TOKENS);
}

function truncateContextAnalysis(analysis: string): string {
    return truncateText(analysis, MAX_CONTEXT_ANALYSIS_TOKENS);
}

// Total token estimation and monitoring
function estimateTotalTokens(context: string, chatHistory: BaseMessage[], codeContext: string, analysis: string): {
    contextTokens: number;
    historyTokens: number;
    codeTokens: number;
    analysisTokens: number;
    totalTokens: number;
    breakdown: string;
} {
    const contextTokens = estimateTokens(context);
    const historyTokens = chatHistory.reduce((sum, msg) => {
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        return sum + estimateTokens(content);
    }, 0);
    const codeTokens = estimateTokens(codeContext);
    const analysisTokens = estimateTokens(analysis);
    const totalTokens = contextTokens + historyTokens + codeTokens + analysisTokens;
    
    const breakdown = `
📊 TOTAL TOKEN BREAKDOWN:
   • Context: ${contextTokens}/${MAX_CONTEXT_TOKENS} (${Math.round(contextTokens/MAX_CONTEXT_TOKENS*100)}%)
   • Chat History: ${historyTokens}/${MAX_CHAT_HISTORY_TOKENS} (${Math.round(historyTokens/MAX_CHAT_HISTORY_TOKENS*100)}%)
   • Code Context: ${codeTokens}/${MAX_CODE_CONTEXT_TOKENS} (${Math.round(codeTokens/MAX_CODE_CONTEXT_TOKENS*100)}%)
   • Analysis: ${analysisTokens}/${MAX_CONTEXT_ANALYSIS_TOKENS} (${Math.round(analysisTokens/MAX_CONTEXT_ANALYSIS_TOKENS*100)}%)
   • TOTAL: ${totalTokens}/16385 (${Math.round(totalTokens/16385*100)}%)
   • Remaining: ${16385 - totalTokens} tokens
`;
    
    return {
        contextTokens,
        historyTokens,
        codeTokens,
        analysisTokens,
        totalTokens,
        breakdown
    };
}

// Emergency token management - apply additional truncation if approaching limits
function applyEmergencyTruncation(context: string, chatHistory: BaseMessage[], codeContext: string, analysis: string): {
    context: string;
    chatHistory: BaseMessage[];
    codeContext: string;
    analysis: string;
    wasTruncated: boolean;
} {
    const tokenEstimate = estimateTotalTokens(context, chatHistory, codeContext, analysis);
    const SAFETY_MARGIN = 2000; // Keep 2000 tokens for system prompt and safety
    
    if (tokenEstimate.totalTokens <= (16385 - SAFETY_MARGIN)) {
        return { context, chatHistory, codeContext, analysis, wasTruncated: false };
    }
    
    console.log(`⚠️  EMERGENCY TOKEN TRUNCATION NEEDED! Current: ${tokenEstimate.totalTokens}, Target: ${16385 - SAFETY_MARGIN}`);
    
    // Apply aggressive truncation
    const targetTokens = 16385 - SAFETY_MARGIN;
    const currentTokens = tokenEstimate.totalTokens;
    const reductionRatio = targetTokens / currentTokens;
    
    // Truncate each component proportionally
    const newContext = truncateText(context, Math.floor(tokenEstimate.contextTokens * reductionRatio));
    const newCodeContext = truncateText(codeContext, Math.floor(tokenEstimate.codeTokens * reductionRatio));
    const newAnalysis = truncateText(analysis, Math.floor(tokenEstimate.analysisTokens * reductionRatio));
    
    // For chat history, keep only the most recent messages
    const maxHistoryTokens = Math.floor(tokenEstimate.historyTokens * reductionRatio);
    let historyTokens = 0;
    const newChatHistory = chatHistory.slice(-5).filter(msg => {
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        const msgTokens = estimateTokens(content);
        if (historyTokens + msgTokens <= maxHistoryTokens) {
            historyTokens += msgTokens;
            return true;
        }
        return false;
    }).map(msg => {
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        const truncatedContent = truncateText(content, 200); // Very aggressive truncation
        
        if (msg instanceof HumanMessage) {
            return new HumanMessage(truncatedContent);
        } else if (msg instanceof AIMessage) {
            return new AIMessage(truncatedContent);
        } else if (msg instanceof SystemMessage) {
            return new SystemMessage(truncatedContent);
        }
        return msg;
    });
    
    const finalEstimate = estimateTotalTokens(newContext, newChatHistory, newCodeContext, newAnalysis);
    console.log(`✅ Emergency truncation applied. New total: ${finalEstimate.totalTokens}/${16385 - SAFETY_MARGIN}`);
    
    return {
        context: newContext,
        chatHistory: newChatHistory,
        codeContext: newCodeContext,
        analysis: newAnalysis,
        wasTruncated: true
    };
}

// Reference interface for type safety
interface Reference {
    id?: string;
    type: 'documentation' | 'code_example' | 'component' | 'api_reference' | 'style_guide' | 'best_practice';
    title: string;
    description: string;
    originalCode?: string;
    source?: string;
    relevanceScore?: number;
    usedAt: Date;
    documentId?: string; // Elasticsearch document ID
    summarizedContent?: string; // Truncated content (first 150 characters)
}

// Reference tracking tool
const referenceTrackingTool = new DynamicTool({
    name: 'reference_tracking_tool',
    description: 'Tracks and stores references used during response generation',
    func: async (input: string) => {
        try {
            const data = JSON.parse(input);
            const action = data.action;
            const conversationId = data.conversationId || "default";
            
            if (!global.referenceTracker[conversationId]) {
                global.referenceTracker[conversationId] = [];
            }
            
            if (action === "add") {
                const reference: Reference = {
                    id: randomUUID(),
                    type: data.type,
                    title: data.title,
                    description: data.description,
                    originalCode: data.originalCode,
                    source: data.source,
                    relevanceScore: data.relevanceScore || 0,
                    usedAt: new Date(),
                    documentId: data.documentId,
                    summarizedContent: data.summarizedContent
                };
                
                global.referenceTracker[conversationId].push(reference);
                
                return JSON.stringify({
                    success: true,
                    reference: reference,
                    totalReferences: global.referenceTracker[conversationId].length
                });
            }
            
            if (action === "get") {
                return JSON.stringify({
                    references: global.referenceTracker[conversationId] || [],
                    count: global.referenceTracker[conversationId]?.length || 0
                });
            }
            
            if (action === "clear") {
                global.referenceTracker[conversationId] = [];
                return JSON.stringify({ success: true, message: "References cleared" });
            }
            
            return JSON.stringify({ error: "Invalid action" });
        } catch (error) {
            console.error("Error in reference tracking tool:", error);
            return JSON.stringify({ error: "Error tracking references" });
        }
    }
});

// Simple truncation function for reference descriptions
function truncateDescription(content: string, maxLength: number = 150): string {
    if (!content || content.length <= maxLength) {
        return content;
    }
    return content.substring(0, maxLength) + "...";
}

// Helper functions for reference tracking
function determineReferenceType(document: Document): Reference['type'] {
    const content = document.pageContent.toLowerCase();
    const metadata = document.metadata || {};
    
    if (content.includes('html') || content.includes('css') || content.includes('javascript')) {
        return 'code_example';
    }
    if (content.includes('component') || content.includes('react') || content.includes('vue')) {
        return 'component';
    }
    if (content.includes('api') || content.includes('endpoint') || content.includes('method')) {
        return 'api_reference';
    }
    if (content.includes('style') || content.includes('design') || content.includes('ui')) {
        return 'style_guide';
    }
    if (content.includes('best practice') || content.includes('recommendation') || content.includes('guideline')) {
        return 'best_practice';
    }
    
    return 'documentation';
}

function extractTitle(document: Document): string {
    const metadata = document.metadata || {};
    
    // Try to extract title from metadata first
    if (metadata.title) {
        return metadata.title;
    }
    
    if (metadata.document_id) {
        return metadata.document_id.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Extract from content
    const content = document.pageContent;
    const firstLine = content.split('\n')[0].trim();
    
    if (firstLine.length > 10 && firstLine.length < 100) {
        return firstLine;
    }
    
    // Generate a title from the first few words
    const words = content.split(/\s+/).slice(0, 5).join(' ');
    return words.length > 3 ? words + '...' : 'Document Reference';
}

function extractCode(content: string): string | undefined {
    const codeBlockRegex = /```[\s\S]*?```/g;
    const matches = content.match(codeBlockRegex);
    
    if (matches && matches.length > 0) {
        return matches[0].replace(/```[\w]*\n/, '').replace(/```$/, '');
    }
    
    // Look for HTML-like content
    if (content.includes('<') && content.includes('>')) {
        const htmlMatch = content.match(/<[^>]*>[\s\S]*?<\/[^>]*>/);
        if (htmlMatch) {
            return htmlMatch[0];
        }
    }
    
    return undefined;
}

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

        const similaritySearchResults = await elasticVectorSearch.similaritySearch(input, 2, filter);
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

// Enhanced hybrid search tool with intelligent parent document resolution and reference tracking
const hybridSearchTool = new DynamicTool({
    name: 'hybrid_search_tool',
    description: 'Performs hybrid search with intelligent parent document resolution to ensure complete context and tracks references',
    func: async (input: string) => {
        const schema = z.object({
            query: z.string(),
            conversationId: z.string().optional()
        });
        
        let query: string;
        let conversationId: string = "default";
        
        // Handle both string input (backward compatibility) and object input
        try {
            const parsedInput = JSON.parse(input);
            if (typeof parsedInput === 'string') {
                query = parsedInput;
            } else {
                query = parsedInput.query;
                conversationId = parsedInput.conversationId || "default";
            }
        } catch {
            query = input;
        }
        
        const validationResult = schema.safeParse({ query, conversationId });
        if (!validationResult.success) {
            throw new Error("Invalid input: " + validationResult.error.message);
        }
        
        try {
            const filter = [
                {
                    operator: "wildcard",
                    field: "source",
                    value: "*",
                },
            ];
            
            // Step 1: Perform vector search to find relevant documents (reduced from 3 to 2)
            const vectorResults = await elasticVectorSearch.similaritySearch(query, 2, filter);
            
            // Step 2: Perform keyword search for broader coverage (reduced from 5 to 3)
            const allDocuments = await elasticVectorSearch.similaritySearch("*", 3, filter);
            let keywordResults: Document[] = [];
            try {
                keywordResults = await performEnhancedBM25Search(query, allDocuments);
            } catch (bm25Error) {
                console.error("Error in enhanced BM25 search:", bm25Error);
                keywordResults = [];
            }
            
            // Step 3: Merge and rank results
            let combinedResults = mergeAndRerank(vectorResults, keywordResults, query);
            
            // Step 4: Enhanced parent document resolution
            let resolvedResults: Document[] = [];
            try {
                resolvedResults = await enhancedResolveParentDocuments(combinedResults);
            } catch (error) {
                console.error("Error in parent document resolution, using original results:", error);
                resolvedResults = combinedResults;
            }
            
            // Step 5: Prioritize parent documents and remove duplicates
            const finalResults = prioritizeAndDeduplicate(resolvedResults);
            
            // Step 6: Track references and generate summaries
            const references = [];
            for (const doc of finalResults) {
                try {
                    const referenceType = determineReferenceType(doc);
                    const title = extractTitle(doc);
                    const originalCode = extractCode(doc.pageContent);
                    
                    // Generate truncated description (first 150 characters)
                    const summarizedContent = truncateDescription(doc.pageContent, 150);
                    
                    // Add reference to tracking
                    try {
                        await referenceTrackingTool.func(JSON.stringify({
                            action: "add",
                            conversationId: conversationId,
                            type: referenceType,
                            title: title,
                            description: summarizedContent,
                            originalCode: originalCode,
                            source: doc.metadata?.source || "ElasticSearch",
                            relevanceScore: doc.metadata?.score || 0.8,
                            documentId: doc.metadata?.document_id,
                            summarizedContent: summarizedContent
                        }));
                    } catch (trackingError) {
                        console.error("Error tracking reference:", trackingError);
                    }
                    
                    references.push({
                        type: referenceType,
                        title: title,
                        description: summarizedContent,
                        documentId: doc.metadata?.document_id
                    });
                    
                } catch (refError) {
                    console.error("Error processing reference:", refError);
                }
            }
            
            const context = finalResults.map(doc => doc.pageContent);
            
            // Enhanced logging for reference IDs and parent/child relationships
            console.log(`\n📊 SEARCH RESULTS SUMMARY:`);
            console.log(`   • Vector results: ${vectorResults.length}`);
            console.log(`   • Keyword results: ${keywordResults.length}`);
            console.log(`   • Combined results: ${combinedResults.length}`);
            console.log(`   • Final results: ${finalResults.length}`);
            console.log(`   • References tracked: ${references.length}`);
            
            // Log reference IDs
            if (references.length > 0) {
                console.log(`\n🔗 REFERENCE IDs for conversation ${conversationId}:`);
                references.forEach((ref, index) => {
                    console.log(`   ${index + 1}. ${ref.title} (${ref.type}) - ID: ${ref.documentId || 'N/A'}`);
                });
            }
            
            // Log parent/child relationships
            const parentDocs = finalResults.filter(doc => doc.metadata?.is_parent === true);
            const childDocs = finalResults.filter(doc => doc.metadata?.parent_id && !doc.metadata?.is_parent);
            
            if (parentDocs.length > 0) {
                console.log(`\n📋 PARENT DOCUMENTS:`);
                parentDocs.forEach((doc, index) => {
                    console.log(`   ${index + 1}. ID: ${doc.metadata?.document_id || 'N/A'} - Type: Parent`);
                });
            }
            
            if (childDocs.length > 0) {
                console.log(`\n👶 CHILD DOCUMENTS:`);
                childDocs.forEach((doc, index) => {
                    console.log(`   ${index + 1}. ID: ${doc.metadata?.document_id || 'N/A'} → Parent: ${doc.metadata?.parent_id || 'N/A'}`);
                });
            }
            
            console.log(`\n📝 Context length: ${context.join('\n').length} characters\n`);
            
            const responseWithMetadata = {
                context: context,
                references: references,
                metadata: {
                    vectorResultCount: vectorResults.length,
                    keywordResultCount: keywordResults.length,
                    combinedResultCount: combinedResults.length,
                    resolvedResultCount: resolvedResults.length,
                    finalResultCount: finalResults.length,
                    referencesCount: references.length,
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
            
            // Fallback: try a simple search without complex processing
            try {
                const fallbackResults = await elasticVectorSearch.similaritySearch(query || input, 2);
                const fallbackContext = fallbackResults.map(doc => doc.pageContent);
                
                if (fallbackContext.length > 0) {
                    console.log(`⚠️  Fallback search successful: ${fallbackContext.length} results`);
                    return JSON.stringify({
                        context: fallbackContext,
                        references: [],
                        metadata: {
                            fallback: true,
                            resultCount: fallbackContext.length
                        }
                    });
                }
            } catch (fallbackError) {
                console.error("Fallback search also failed:", fallbackError);
            }
            
            return null;
        }
    }
});

// Test function to verify parent document logic
function testParentDocumentLogic() {
    const testDocuments = [
        {
            metadata: {
                document_id: "parent1",
                is_parent: true,
                parent_id: null
            },
            pageContent: "Parent document 1"
        },
        {
            metadata: {
                document_id: "parent2",
                is_parent: false,
                parent_id: null
            },
            pageContent: "Parent document 2 (no parent_id)"
        },
        {
            metadata: {
                document_id: "child1",
                is_parent: false,
                parent_id: "parent1"
            },
            pageContent: "Child document 1"
        },
        {
            metadata: {
                document_id: "child2",
                is_parent: false,
                parent_id: "parent2"
            },
            pageContent: "Child document 2"
        }
    ];
    
    testDocuments.forEach((doc, index) => {
        const isParent = doc.metadata.is_parent === true || !doc.metadata.parent_id;
        console.log(`📄 Document ${index + 1} (${doc.metadata.document_id}): ${isParent ? "PARENT" : "CHILD"}`);
    });
}

// Enhanced parent document resolution with intelligent prioritization
async function enhancedResolveParentDocuments(documents: Document[]): Promise<Document[]> {
    const result: Document[] = [];
    const processedParentIds = new Set<string>();
    const processedChildIds = new Set<string>();
    
    // Test the parent document logic
    testParentDocumentLogic();
    
    // Log document information for debugging
    console.log(`\n🔍 RESOLVING ${documents.length} DOCUMENTS:`);
    documents.forEach((doc, index) => {
        const docId = doc.metadata?.document_id || 'unknown';
        const isParent = doc.metadata?.is_parent === true || !doc.metadata?.parent_id;
        const parentId = doc.metadata?.parent_id || 'none';
        console.log(`   ${index + 1}. ${docId} (${isParent ? 'PARENT' : 'CHILD'}${parentId !== 'none' ? ` → ${parentId}` : ''})`);
    });
    
    for (const doc of documents) {
        if (!doc.metadata) {
            result.push(doc);
            continue;
        }
        
        // If this is a parent document (either explicitly marked or has no parent_id), add it directly
        if (doc.metadata.is_parent === true || !doc.metadata.parent_id) {
            result.push(doc);
            if (doc.metadata.document_id) {
                processedParentIds.add(doc.metadata.document_id);
            }
            console.log(`   ✅ Added PARENT: ${doc.metadata.document_id || 'unknown'}`);
            continue;
        }
        
        // If this is a child document (has parent_id), try to find its parent
        if (doc.metadata.parent_id && !processedParentIds.has(doc.metadata.parent_id)) {
            try {
                console.log(`   🔍 Resolving CHILD: ${doc.metadata.document_id} → Parent: ${doc.metadata.parent_id}`);
                
                // Try direct document fetch first (more reliable)
                try {
                    const directResults = await fetchDocumentById(doc.metadata.parent_id);
                    if (directResults) {
                        result.push(directResults);
                        processedParentIds.add(doc.metadata.parent_id);
                        processedChildIds.add(doc.metadata.document_id || '');
                        console.log(`   ✅ Direct fetch successful for parent: ${doc.metadata.parent_id}`);
                        continue;
                    }
                } catch (directError) {
                    console.error(`   ❌ Failed direct fetch for parent: ${doc.metadata.parent_id}`);
                }
                
                // Fallback to vector search (simplified approach)
                try {
                    // Use a simple search without complex filters
                    const parentResults = await elasticVectorSearch.similaritySearch(doc.metadata.parent_id, 1);
                    
                    if (parentResults.length > 0) {
                        const parentDoc = parentResults[0];
                        // Check if this is actually the parent we're looking for
                        if (parentDoc.metadata?.document_id === doc.metadata.parent_id && 
                            parentDoc.metadata?.is_parent === true) {
                            result.push(parentDoc);
                            processedParentIds.add(doc.metadata.parent_id);
                            processedChildIds.add(doc.metadata.document_id || '');
                            console.log(`   ✅ Vector search successful for parent: ${doc.metadata.parent_id}`);
                            continue;
                        }
                    }
                } catch (vectorError) {
                    console.error(`   ❌ Vector search failed for parent: ${doc.metadata.parent_id}`);
                }
                
                // If all methods failed, keep the child document
                console.log(`   ⚠️  All methods failed for parent: ${doc.metadata.parent_id}, keeping child document`);
                result.push(doc);
                
            } catch (error) {
                console.error(`   ❌ Error fetching parent document ${doc.metadata.parent_id}:`, error);
                result.push(doc);
            }
        } else if (doc.metadata.parent_id && processedParentIds.has(doc.metadata.parent_id)) {
            // Parent already processed, skip this child
            console.log(`   ⏭️  Skipping child document, parent already processed: ${doc.metadata.document_id}`);
            continue;
        } else {
            // Not a child document, add it directly
            result.push(doc);
        }
    }
    
    console.log(`\n📊 RESOLUTION SUMMARY:`);
    console.log(`   • Total processed: ${result.length} documents`);
    console.log(`   • Parent documents found: ${processedParentIds.size}`);
    console.log(`   • Child documents resolved: ${processedChildIds.size}`);
    
    // Log final result summary
    console.log(`\n📋 FINAL DOCUMENTS:`);
    result.forEach((doc, index) => {
        const docId = doc.metadata?.document_id || 'unknown';
        const isParent = doc.metadata?.is_parent === true || !doc.metadata?.parent_id;
        const contentLength = doc.pageContent.length;
        console.log(`   ${index + 1}. ${docId} (${isParent ? 'PARENT' : 'CHILD'}) - ${contentLength} chars`);
    });
    
    return result;
}

// Legacy function for backward compatibility
async function resolveParentDocuments(documents: Document[]): Promise<Document[]> {
    return enhancedResolveParentDocuments(documents);
}

// Prioritize parent documents and remove duplicates
function prioritizeAndDeduplicate(documents: Document[]): Document[] {
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
        
        if (doc.metadata.is_parent === true || !doc.metadata.parent_id) {
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
    
    console.log(`\n🔄 DEDUPLICATION: ${documents.length} → ${result.length} documents`);
    console.log(`   • Parents: ${parentDocuments.length}, Children: ${childDocuments.length}, Others: ${otherDocuments.length}`);
    
    return result;
}

// Enhanced helper function to fetch a document directly by ID
async function fetchDocumentById(documentId: string): Promise<Document | null> {
    try {
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
            
            return {
                pageContent: source.text || source.pageContent || "",
                metadata: source.metadata || {}
            };
        }
        
        // If not found as parent, try without the parent filter (fallback)
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
            
            return {
                pageContent: source.text || source.pageContent || "",
                metadata: source.metadata || {}
            };
        }
        
        return null;
    } catch (error) {
        console.error(`Error in direct document fetch for ${documentId}:`, error);
        return null;
    }
}

// STRICT: Context validation tool that enforces exact context adherence
const contextValidationTool = new DynamicTool({
    name: 'context_validation_tool',
    description: 'INTELLIGENT validation that enforces context adherence while allowing legitimate TailwindCSS customizations',
    func: async (input: string) => {
        try {
            const data = JSON.parse(input);
            const action = data.action; // "validate", "extract_resources", or "check_hallucination"
            const response = data.response || "";
            const originalContext = data.originalContext || "";
            
            if (action === "validate") {
                // IMPROVED: Intelligent context adherence with customization allowance
                const contextResources = extractResources(originalContext);
                const responseResources = extractResources(response);
                const codeContext = data.codeContext || "";
                const isNewSession = data.isNewSession || false;
                const userRequest = data.userRequest || "";
                
                // Check for ANY resources not from context (zero tolerance for external resources)
                const hallucinatedResources = responseResources.filter(resource => {
                    return !contextResources.some(contextResource => 
                        normalizeResource(contextResource) === normalizeResource(resource)
                    );
                });
                
                // Check for virtual/placeholder content
                const virtualContent = detectVirtualContent(response);
                
                // IMPROVED: Check for structural deviations from context (more flexible)
                const structuralDeviations = detectStructuralDeviations(response, originalContext);
                
                // IMPROVED: Check for code modifications (allow legitimate customizations)
                const codeModifications = detectCodeModifications(response, originalContext, userRequest);
                
                // IMPROVED: For new sessions with code context, check for exact code reproduction
                let codeReproductionCheck = { isValid: true, reason: "" };
                if (isNewSession && codeContext && !userRequest.includes("customize") && !userRequest.includes("change") && !userRequest.includes("modify")) {
                    const extractedCode = extractCodeBlocks(response);
                    if (extractedCode.length > 0) {
                        const providedCode = extractedCode[0];
                        const normalizedProvided = providedCode.replace(/\s+/g, ' ').trim();
                        const normalizedContext = codeContext.replace(/\s+/g, ' ').trim();
                        
                        if (normalizedProvided !== normalizedContext) {
                            codeReproductionCheck = {
                                isValid: false,
                                reason: "Code does not match context exactly for new session without customization requests"
                            };
                        }
                    } else {
                        codeReproductionCheck = {
                            isValid: false,
                            reason: "No code blocks found in response"
                        };
                    }
                }
                
                // IMPROVED: For follow-up questions, check for TailwindCSS framework adherence (more flexible)
                let tailwindFrameworkCheck = { isValid: true, reason: "" };
                if (!isNewSession && codeContext) {
                    const extractedCode = extractCodeBlocks(response);
                    if (extractedCode.length > 0) {
                        const providedCode = extractedCode[0];
                        
                        // Check for non-TailwindCSS frameworks (only external libraries)
                        const forbiddenFrameworks = [
                            'bootstrap', 'material-ui', 'mui', 'antd', 'chakra-ui', 'semantic-ui',
                            'foundation', 'bulma', 'pure.css', 'skeleton', 'milligram'
                        ];
                        
                        const forbiddenCDNs = [
                            'bootstrap', 'material-ui', 'mui', 'antd', 'chakra-ui'
                        ];
                        
                        const lowerCode = providedCode.toLowerCase();
                        
                        // Check for forbidden frameworks in class names or imports
                        const hasForbiddenFramework = forbiddenFrameworks.some(framework => 
                            lowerCode.includes(framework) || 
                            lowerCode.includes(`class="${framework}`) ||
                            lowerCode.includes(`className="${framework}`)
                        );
                        
                        // Check for forbidden CDN links
                        const hasForbiddenCDN = forbiddenCDNs.some(framework => 
                            lowerCode.includes(`cdn.${framework}`) ||
                            lowerCode.includes(`unpkg.com/${framework}`) ||
                            lowerCode.includes(`jsdelivr.net/${framework}`)
                        );
                        
                        // Check for custom CSS files (but allow TailwindCSS)
                        const hasCustomCSS = lowerCode.includes('.css') && 
                                           !lowerCode.includes('tailwind') &&
                                           !lowerCode.includes('@tailwindcss');
                        
                        if (hasForbiddenFramework || hasForbiddenCDN || hasCustomCSS) {
                            tailwindFrameworkCheck = {
                                isValid: false,
                                reason: `Forbidden framework detected: ${hasForbiddenFramework ? 'framework' : ''}${hasForbiddenCDN ? ' CDN' : ''}${hasCustomCSS ? ' custom CSS' : ''}`
                            };
                        }
                    }
                }
                
                // IMPROVED: More intelligent validation logic
                const hasCriticalDeviations = hallucinatedResources.length > 0 || 
                                            virtualContent.length > 0 || 
                                            !codeReproductionCheck.isValid ||
                                            !tailwindFrameworkCheck.isValid;
                
                // Allow structural deviations and code modifications if they're legitimate customizations
                const hasLegitimateCustomizations = detectLegitimateCustomizations(userRequest, response, originalContext);
                const structuralDeviationsAreLegitimate = structuralDeviations.length > 0 && hasLegitimateCustomizations;
                const codeModificationsAreLegitimate = codeModifications.length > 0 && hasLegitimateCustomizations;
                
                const hasAnyDeviations = hasCriticalDeviations || 
                                       (structuralDeviations.length > 0 && !structuralDeviationsAreLegitimate) ||
                                       (codeModifications.length > 0 && !codeModificationsAreLegitimate);
                
                return JSON.stringify({
                    isValid: !hasAnyDeviations,
                    hallucinatedResources,
                    virtualContent,
                    structuralDeviations: structuralDeviationsAreLegitimate ? [] : structuralDeviations,
                    codeModifications: codeModificationsAreLegitimate ? [] : codeModifications,
                    codeReproduction: codeReproductionCheck,
                    tailwindFrameworkCheck: tailwindFrameworkCheck,
                    contextResources: contextResources.length,
                    responseResources: responseResources.length,
                    isNewSession: isNewSession,
                    hasLegitimateCustomizations,
                    message: hasAnyDeviations 
                        ? `${isNewSession ? 'ABSOLUTE' : 'INTELLIGENT'} MODE: Response deviates from provided context - REJECTED`
                        : "Response follows context appropriately"
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
function detectCodeModifications(response: string, context: string, userRequest: string = ""): string[] {
    const modifications = [];
    
    // Extract code blocks from both
    const contextCodeBlocks = extractCodeBlocks(context);
    const responseCodeBlocks = extractCodeBlocks(response);
    
    // If context has code but response doesn't match exactly
    if (contextCodeBlocks.length > 0 && responseCodeBlocks.length > 0) {
        contextCodeBlocks.forEach((contextCode, index) => {
            if (responseCodeBlocks[index] && responseCodeBlocks[index] !== contextCode) {
                // Check if this is a legitimate customization
                const isLegitimateCustomization = detectLegitimateCustomizations(userRequest, response, context);
                if (!isLegitimateCustomization) {
                    modifications.push(`Code block ${index + 1} modified from context`);
                }
            }
        });
    }
    
    // Check for structural changes in HTML
    const contextStructure = extractHTMLStructure(context);
    const responseStructure = extractHTMLStructure(response);
    
    if (contextStructure !== responseStructure) {
        // Check if this is a legitimate customization
        const isLegitimateCustomization = detectLegitimateCustomizations(userRequest, response, context);
        if (!isLegitimateCustomization) {
            modifications.push("HTML structure modified from context");
        }
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

// Context analysis tool to determine if current question is related to previous questions
const contextAnalysisTool = new DynamicTool({
    name: 'context_analysis_tool',
    description: 'Analyzes chat history to determine if the current question is related to previous questions and provides context switching guidance',
    func: async (input: string) => {
        try {
            const data = JSON.parse(input);
            const currentQuestion = data.currentQuestion || "";
            const chatHistory = data.chatHistory || [];
            
            if (chatHistory.length === 0) {
                return JSON.stringify({
                    isRelated: false,
                    contextType: "new_topic",
                    recommendation: "create_new_code",
                    reason: "No previous conversation history"
                });
            }
            
            // Extract key concepts from current question
            const currentConcepts = extractKeyConcepts(currentQuestion);
            
            // Extract key concepts from previous questions
            const previousConcepts = [];
            for (const message of chatHistory) {
                if (message.role === "user") {
                    const concepts = extractKeyConcepts(message.content);
                    previousConcepts.push(...concepts);
                }
            }
            
            // Calculate similarity score
            const similarityScore = calculateConceptSimilarity(currentConcepts, previousConcepts);
            
            // Determine if this is a follow-up question
            const isFollowUp = detectFollowUpQuestion(currentQuestion, chatHistory);
            
            // Determine context type
            let contextType = "new_topic";
            let recommendation = "create_new_code";
            let reason = "";
            
            if (similarityScore > 0.6 || isFollowUp) {
                contextType = "follow_up";
                recommendation = "modify_existing_code";
                reason = "Question appears to be related to previous conversation";
            } else if (similarityScore > 0.3) {
                contextType = "related_topic";
                recommendation = "create_new_code_with_reference";
                reason = "Question is somewhat related but may need new implementation";
            } else {
                contextType = "new_topic";
                recommendation = "create_new_code";
                reason = "Question appears to be a completely new topic";
            }
            
            return JSON.stringify({
                isRelated: similarityScore > 0.6 || isFollowUp,
                contextType,
                recommendation,
                reason,
                similarityScore,
                currentConcepts,
                previousConcepts: [...new Set(previousConcepts)],
                isFollowUp
            });
            
        } catch (error) {
            console.error("Error in context analysis:", error);
            return JSON.stringify({
                isRelated: false,
                contextType: "new_topic",
                recommendation: "create_new_code",
                reason: "Error analyzing context"
            });
        }
    }
});

// Helper function to extract key concepts from text
function extractKeyConcepts(text: string): string[] {
    const concepts = [];
    const lowerText = text.toLowerCase();
    
    // Extract UI components
    const uiComponents = [
        'hero', 'section', 'card', 'button', 'form', 'input', 'navigation', 'header', 'footer',
        'sidebar', 'modal', 'dropdown', 'carousel', 'slider', 'tabs', 'accordion', 'pricing',
        'testimonial', 'gallery', 'grid', 'flexbox', 'layout', 'responsive', 'mobile', 'desktop'
    ];
    
    // Extract styling concepts
    const stylingConcepts = [
        'animation', 'transition', 'hover', 'focus', 'fade', 'slide', 'bounce', 'scale',
        'transform', 'opacity', 'shadow', 'border', 'rounded', 'gradient', 'color',
        'background', 'text', 'font', 'spacing', 'padding', 'margin', 'width', 'height'
    ];
    
    // Extract framework concepts
    const frameworkConcepts = [
        'tailwind', 'css', 'html', 'javascript', 'react', 'vue', 'angular', 'bootstrap',
        'foundation', 'bulma', 'semantic', 'material', 'antd', 'chakra'
    ];
    
    // Check for UI components
    uiComponents.forEach(component => {
        if (lowerText.includes(component)) {
            concepts.push(component);
        }
    });
    
    // Check for styling concepts
    stylingConcepts.forEach(concept => {
        if (lowerText.includes(concept)) {
            concepts.push(concept);
        }
    });
    
    // Check for framework concepts
    frameworkConcepts.forEach(framework => {
        if (lowerText.includes(framework)) {
            concepts.push(framework);
        }
    });
    
    return concepts;
}

// Helper function to calculate similarity between concept sets
function calculateConceptSimilarity(currentConcepts: string[], previousConcepts: string[]): number {
    if (currentConcepts.length === 0 || previousConcepts.length === 0) {
        return 0;
    }
    
    const currentSet = new Set(currentConcepts);
    const previousSet = new Set(previousConcepts);
    
    const intersection = new Set([...currentSet].filter(x => previousSet.has(x)));
    const union = new Set([...currentSet, ...previousSet]);
    
    return intersection.size / union.size;
}

// Helper function to detect follow-up questions
function detectFollowUpQuestion(currentQuestion: string, chatHistory: any[]): boolean {
    const lowerQuestion = currentQuestion.toLowerCase();
    
    // Follow-up indicators
    const followUpIndicators = [
        'add', 'modify', 'change', 'update', 'edit', 'improve', 'enhance', 'fix',
        'adjust', 'tweak', 'refine', 'optimize', 'customize', 'personalize',
        'can you', 'could you', 'would you', 'help me', 'assist me',
        'also', 'too', 'as well', 'in addition', 'furthermore', 'moreover',
        'next', 'then', 'after', 'following', 'subsequent', 'additional'
    ];
    
    // Check for follow-up indicators
    const hasFollowUpIndicator = followUpIndicators.some(indicator => 
        lowerQuestion.includes(indicator)
    );
    
    // Check if question references previous content
    const referencesPrevious = lowerQuestion.includes('previous') || 
                              lowerQuestion.includes('above') || 
                              lowerQuestion.includes('that') ||
                              lowerQuestion.includes('it') ||
                              lowerQuestion.includes('this');
    
    return hasFollowUpIndicator || referencesPrevious;
}

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

// IMPROVED: Intelligent code reproduction tool for new sessions
const exactCodeReproductionTool = new DynamicTool({
    name: 'exact_code_reproduction_tool',
    description: 'Intelligently reproduces code from context, allowing customizations when requested',
    func: async (input: string) => {
        try {
            const { action, codeContext, userRequest } = JSON.parse(input);
            
            if (action === "reproduce") {
                const lowerRequest = userRequest.toLowerCase();
                
                // Check if user is requesting customizations
                const customizationKeywords = [
                    'customize', 'change', 'modify', 'adjust', 'tweak', 'update', 'improve',
                    'color', 'colors', 'background', 'text', 'hover', 'focus', 'animation',
                    'transition', 'effect', 'style', 'styling', 'theme', 'palette'
                ];
                
                const isCustomizationRequest = customizationKeywords.some(keyword => 
                    lowerRequest.includes(keyword)
                );
                
                if (isCustomizationRequest) {
                    return JSON.stringify({
                        action: "customization_allowed",
                        code: codeContext,
                        message: "Customization requested - code can be modified using TailwindCSS classes",
                        reason: "User requested specific customizations"
                    });
                } else {
                    // For new sessions without customization requests, return exact code
                    return JSON.stringify({
                        action: "exact_reproduction",
                        code: codeContext,
                        message: "This is the exact code from the provided context. No modifications have been made to ensure 100% adherence.",
                        reason: "New session without customization requests - enforcing exact code reproduction"
                    });
                }
            }
            
            return JSON.stringify({ error: "Invalid action specified" });
        } catch (error) {
            console.error("Error in exact code reproduction tool:", error);
            return JSON.stringify({ error: "Error processing reproduction request" });
        }
    }
});

// IMPROVED: TailwindCSS framework validation tool for customizations
const tailwindFrameworkValidationTool = new DynamicTool({
    name: 'tailwind_framework_validation_tool',
    description: 'Validates that customizations use ONLY TailwindCSS framework and no other frameworks or libraries',
    func: async (input: string) => {
        try {
            const { action, code, isFollowUp, userRequest } = JSON.parse(input);
            
            if (action === "validate" && isFollowUp) {
                const lowerCode = code.toLowerCase();
                const lowerRequest = userRequest.toLowerCase();
                
                // Check if this is a legitimate customization request
                const customizationKeywords = [
                    'customize', 'change', 'modify', 'adjust', 'tweak', 'update', 'improve',
                    'color', 'colors', 'background', 'text', 'hover', 'focus', 'animation',
                    'transition', 'effect', 'style', 'styling', 'theme', 'palette'
                ];
                
                const isCustomizationRequest = customizationKeywords.some(keyword => 
                    lowerRequest.includes(keyword)
                );
                
                // Only validate framework restrictions if it's a customization request
                if (!isCustomizationRequest) {
                    return JSON.stringify({
                        isValid: true,
                        message: "No customization requested - framework validation skipped"
                    });
                }
                
                // Check for non-TailwindCSS frameworks (only external libraries)
                const forbiddenFrameworks = [
                    'bootstrap', 'material-ui', 'mui', 'antd', 'chakra-ui', 'semantic-ui',
                    'foundation', 'bulma', 'pure.css', 'skeleton', 'milligram'
                ];
                
                const forbiddenCDNs = [
                    'bootstrap', 'material-ui', 'mui', 'antd', 'chakra-ui'
                ];
                
                // Check for forbidden frameworks in class names or imports
                const detectedFrameworks = forbiddenFrameworks.filter(framework => 
                    lowerCode.includes(framework) || 
                    lowerCode.includes(`class="${framework}`) ||
                    lowerCode.includes(`className="${framework}`)
                );
                
                // Check for forbidden CDN links
                const detectedCDNs = forbiddenCDNs.filter(framework => 
                    lowerCode.includes(`cdn.${framework}`) ||
                    lowerCode.includes(`unpkg.com/${framework}`) ||
                    lowerCode.includes(`jsdelivr.net/${framework}`)
                );
                
                // Check for custom CSS files (but allow TailwindCSS)
                const hasCustomCSS = lowerCode.includes('.css') && 
                                   !lowerCode.includes('tailwind') &&
                                   !lowerCode.includes('@tailwindcss');
                
                const isValid = detectedFrameworks.length === 0 && detectedCDNs.length === 0 && !hasCustomCSS;
                
                return JSON.stringify({
                    isValid: isValid,
                    detectedFrameworks: detectedFrameworks,
                    detectedCDNs: detectedCDNs,
                    hasCustomCSS: hasCustomCSS,
                    isCustomizationRequest: isCustomizationRequest,
                    message: isValid 
                        ? "Code uses only TailwindCSS framework for customizations - VALID"
                        : `Forbidden frameworks detected: ${detectedFrameworks.join(', ')} ${detectedCDNs.join(', ')} ${hasCustomCSS ? 'custom CSS' : ''}`
                });
            }
            
            return JSON.stringify({ error: "Invalid action or not a follow-up question" });
        } catch (error) {
            console.error("Error in TailwindCSS framework validation tool:", error);
            return JSON.stringify({ error: "Error processing validation request" });
        }
    }
});

// IMPROVED: Tools array with intelligent context adherence
const tools = [
    hybridSearchTool, 
    elasticSearchTool, 
    codeMemoryTool, 
    greetingDetectionTool,
    contextAnalysisTool, // New tool for context analysis
    contextValidationTool,  // IMPROVED validation with customization awareness
    exactCodeReproductionTool,  // Intelligently reproduces code with customization allowance
    tailwindFrameworkValidationTool,  // Validates TailwindCSS framework adherence for customizations
    referenceTrackingTool
];

// STRICT: Force LLM to follow context code exactly without any modifications
const frontEndDevPrompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a front-end development assistant with ABSOLUTE context adherence.

🚨 ABSOLUTE CONTEXT ADHERENCE RULE:
- If context contains code, you MUST reproduce it EXACTLY character-for-character
- NO modifications, NO improvements, NO changes whatsoever
- If context shows HTML/CSS/JS, use it EXACTLY as provided
- DO NOT add features, change styling, or modify structure
- DO NOT use different frameworks than what's in context
- DO NOT create "enhanced" versions
- IGNORE user requests for customizations when context is provided

CONTEXT HANDLING:
1. NEW TOPIC: Create completely new code based on user description
2. FOLLOW-UP: Reproduce context code EXACTLY (no modifications)
3. RELATED: Create new code but reference context if helpful
4. NO CONTEXT: Create new code based on user description

FORBIDDEN (when context provided):
❌ Modifying context code (regardless of user requests)
❌ Substituting different frameworks
❌ Adding features not in context
❌ Changing class names, IDs, structure
❌ Using different styling or colors
❌ Adding animations not in context
❌ Responding to customization requests when context exists

FORBIDDEN (for follow-up questions):
❌ Using frameworks other than TailwindCSS
❌ Adding external CSS libraries (Bootstrap, Material-UI, etc.)
❌ Using custom CSS files or external stylesheets
❌ Adding JavaScript frameworks (React, Vue, Angular, etc.)
❌ Using different CDN links than TailwindCSS
❌ Adding non-TailwindCSS components or utilities

REQUIRED (when context provided):
✅ Copy context code exactly (ALWAYS)
✅ Use same HTML structure and tags (ALWAYS)
✅ Use same CSS classes and styling (ALWAYS)
✅ Use same JavaScript/TypeScript (ALWAYS)
✅ Maintain same file organization
✅ Keep same naming conventions
✅ Preserve all comments and formatting
✅ Use same external resources

REQUIRED (for follow-up questions):
✅ Use ONLY TailwindCSS classes and utilities
✅ Modify code within TailwindCSS framework constraints
✅ Keep same HTML structure and tags
✅ Maintain same JavaScript/TypeScript approach
✅ Use same TailwindCSS CDN link
✅ Preserve existing TailwindCSS setup

RESPONSE STRATEGY:
- If context provides code: Deliver EXACTLY as shown (ALWAYS)
- If context provides partial code: Use ONLY what's provided (ALWAYS)
- If no context: Create new code based on user description
- ALWAYS provide FULL code - never cut any lines
- For new topics: Complete HTML document with all elements
- For follow-ups: Show modifications using ONLY TailwindCSS
- NEVER provide incomplete or partial snippets
- For follow-ups: NEVER introduce non-TailwindCSS frameworks or libraries
- IGNORE customization requests when context is provided

QUALITY CHECK:
✅ Is code identical to context?
✅ Are all class names preserved?
✅ Is HTML structure exact?
✅ Are CSS styles unchanged?
✅ Is JavaScript unmodified?
✅ Are external resources same?
✅ Is this complete implementation?

Context from relevant documentation: {context}
Previous code context: {code_context}
Context analysis: {context_analysis}`],
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
        context: async (i: { input: string; steps: AgentStep[]; conversationId?: string }) => {
            const conversationId = i.conversationId || "default";
            const searchResult = await hybridSearchTool.func(JSON.stringify({
                query: i.input,
                conversationId: conversationId
            }));
            let contextResults = [];
            let references = [];
            
            if (searchResult) {
                try {
                    const parsedResult = JSON.parse(searchResult);
                    contextResults = parsedResult.context;
                    references = parsedResult.references || [];
                } catch (e) {
                    console.error("Error parsing hybrid search results:", e);
                }
            }
            
            // Store references in global context for later access
            if (references.length > 0) {
                if (!global.currentReferences) {
                    global.currentReferences = {};
                }
                global.currentReferences[conversationId] = references;
            }
            
            // Apply token management to context
            const truncatedContext = truncateContext(contextResults);
            const totalTokens = estimateTokens(truncatedContext.join("\n"));
            
            console.log(`\n📊 CONTEXT TOKEN MANAGEMENT:`);
            console.log(`   • Original context: ${contextResults.length} documents`);
            console.log(`   • Truncated context: ${truncatedContext.length} documents`);
            console.log(`   • Context tokens: ${totalTokens}/${MAX_CONTEXT_TOKENS}`);
            
            return truncatedContext.length > 0 ? 
                truncatedContext.join("\n") : 
                "No relevant context found in the knowledge base. Creating new code based on user description.";
        },
        chat_history: (i: { input: string; steps: AgentStep[]; chat_history: BaseMessage[]; conversationId?: string }) => {
            const truncatedHistory = truncateChatHistory(i.chat_history || []);
            const totalTokens = truncatedHistory.reduce((sum, msg) => {
                const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
                return sum + estimateTokens(content);
            }, 0);
            
            console.log(`   • Chat history: ${i.chat_history?.length || 0} → ${truncatedHistory.length} messages`);
            console.log(`   • History tokens: ${totalTokens}/${MAX_CHAT_HISTORY_TOKENS}`);
            
            return truncatedHistory;
        },
        context_analysis: async (i: { input: string; steps: AgentStep[]; chat_history: BaseMessage[]; conversationId?: string }) => {
            const conversationId = i.conversationId || "default";
            try {
                // Convert chat history to the format expected by context analysis tool
                const chatHistoryForAnalysis = i.chat_history.map(msg => ({
                    role: msg instanceof HumanMessage ? "user" : "assistant",
                    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
                }));
                
                const analysisResult = await contextAnalysisTool.func(JSON.stringify({
                    currentQuestion: i.input,
                    chatHistory: chatHistoryForAnalysis
                }));
                
                const analysis = JSON.parse(analysisResult);
                
                // Provide guidance based on analysis
                let guidance = "";
                if (analysis.contextType === "new_topic") {
                    guidance = "NEW TOPIC DETECTED: This question is unrelated to previous conversation. Create a complete new implementation.";
                } else if (analysis.contextType === "follow_up") {
                    guidance = "FOLLOW-UP QUESTION DETECTED: This question relates to previous conversation. Modify existing code appropriately.";
                } else if (analysis.contextType === "related_topic") {
                    guidance = "RELATED TOPIC DETECTED: This question is somewhat related. Create new code but reference previous context if helpful.";
                }
                
                const analysisText = `${guidance}\n\nAnalysis Details:\n- Context Type: ${analysis.contextType}\n- Similarity Score: ${analysis.similarityScore}\n- Is Follow-up: ${analysis.isFollowUp}\n- Recommendation: ${analysis.recommendation}\n- Reason: ${analysis.reason}`;
                const truncatedAnalysis = truncateContextAnalysis(analysisText);
                
                console.log(`   • Analysis tokens: ${estimateTokens(truncatedAnalysis)}/${MAX_CONTEXT_ANALYSIS_TOKENS}`);
                
                return truncatedAnalysis;
            } catch (error) {
                console.error("Error in context analysis:", error);
                return "Context analysis failed. Proceed with creating new code based on user description.";
            }
        },
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
                    const codeContext = `STRICT CONTEXT ADHERENCE REQUIRED - Previous HTML document for EXACT reproduction:\n\n${codeState.fullHtmlDocument}`;
                    const truncatedCode = truncateCodeContext(codeContext);
                    console.log(`   • Code context tokens: ${estimateTokens(truncatedCode)}/${MAX_CODE_CONTEXT_TOKENS}`);
                    return truncatedCode;
                } else if (codeState.codeHistory && codeState.codeHistory.length > 0) {
                    const relevantCode = codeState.codeHistory
                        .filter(entry => entry.type === "full-document" || entry.type === "component")
                        .pop();

                    if (relevantCode) {
                        const codeContext = `STRICT CONTEXT ADHERENCE REQUIRED - Previous code for EXACT reproduction:\n\n${relevantCode.content}`;
                        const truncatedCode = truncateCodeContext(codeContext);
                        console.log(`   • Code context tokens: ${estimateTokens(truncatedCode)}/${MAX_CODE_CONTEXT_TOKENS}`);
                        return truncatedCode;
                    }
                }

                const codeBlockRegex = /```[\s\S]*?```/g;
                const codeMatches = i.input.match(codeBlockRegex);

                if (codeMatches && codeMatches.length > 0) {
                    const userCode = codeMatches[0].replace(/```[\w]*\n/, '').replace(/```$/, '');
                    const codeContext = `STRICT CONTEXT ADHERENCE REQUIRED - User provided code for EXACT reproduction:\n\n${userCode}`;
                    const truncatedCode = truncateCodeContext(codeContext);
                    console.log(`   • Code context tokens: ${estimateTokens(truncatedCode)}/${MAX_CODE_CONTEXT_TOKENS}`);
                    return truncatedCode;
                }

                return "No previous code context available. Creating new code based on user description.";
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
async function performEnhancedBM25Search(query: string, documents: Document[], k: number = 2): Promise<Document[]> {
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

// STRICT: Code handling that enforces exact context adherence and returns references
const executeWithCodeHandling = async (
    input: string,
    chatHistory: BaseMessage[] = [],
    conversationId: string
): Promise<{
    output: string;
    intermediateSteps: any[];
    references: Reference[];
}> => {
    // Check for greetings/thanks
    try {
        const greetingResult = await greetingDetectionTool.func(input);
        const greetingData = JSON.parse(greetingResult);

        if (greetingData.type === "greeting" || greetingData.type === "thanks") {
            return {
                output: greetingData.response,
                intermediateSteps: [],
                references: []
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
            // ENHANCED: Stricter context adherence for sessions without history
            const isNewSession = chatHistory.length === 0;
            const strictnessLevel = isNewSession ? "ABSOLUTE" : "STRICT";
            
            const codeContextText = `${strictnessLevel} CONTEXT ADHERENCE REQUIRED - Available code for EXACT reproduction:\n\n\`\`\`html\n${fullCodeContext}\n\`\`\`\n\nYou MUST reproduce this code EXACTLY as shown. NO modifications, NO improvements, NO changes whatsoever. ${isNewSession ? 'This is a new session - ZERO tolerance for deviations.' : ''}`;
            const truncatedCodeContext = truncateCodeContext(codeContextText);
            
            const codeContextMessage = new SystemMessage({
                content: truncatedCodeContext
            });
            
            chatHistory = [codeContextMessage, ...chatHistory];
            console.log(`   • Code context message tokens: ${estimateTokens(truncatedCodeContext)}/${MAX_CODE_CONTEXT_TOKENS}`);
            console.log(`   • Session type: ${isNewSession ? 'NEW SESSION - ABSOLUTE ADHERENCE' : 'EXISTING SESSION - STRICT ADHERENCE'}`);
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

    // Collect references for this response
    let references: Reference[] = [];
    try {
        // Get references from global context
        if (global.currentReferences && global.currentReferences[conversationId]) {
            references = global.currentReferences[conversationId];
        }
        
        // Also get references from tracking tool
        const trackingResult = await referenceTrackingTool.func(JSON.stringify({
            action: "get",
            conversationId: conversationId
        }));
        
        const trackingData = JSON.parse(trackingResult);
        if (trackingData.references && trackingData.references.length > 0) {
            // Merge with current references, avoiding duplicates
            const existingIds = new Set(references.map(ref => ref.documentId));
            const newReferences = trackingData.references.filter((ref: Reference) => 
                !existingIds.has(ref.documentId)
            );
            references = [...references, ...newReferences];
        }
    } catch (error) {
        console.error("Error collecting references:", error);
    }

    // ENHANCED: Stricter validation for new sessions with zero tolerance for deviations
    if (typeof result.output === 'string') {
        const isNewSession = chatHistory.length === 0;
        
        // Get context from chat history for validation
        let originalContext = "";
        let codeContext = "";
        
        for (const msg of chatHistory) {
            if (msg instanceof SystemMessage) {
                const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
                if (content.includes('Context from relevant documentation:')) {
                    const contextMatch = content.match(/Context from relevant documentation:(.*?)Previous code context:/s);
                    if (contextMatch && contextMatch[1]) {
                        originalContext += contextMatch[1].trim() + "\n";
                    }
                }
                if (content.includes('Available code for EXACT reproduction:')) {
                    const codeMatch = content.match(/Available code for EXACT reproduction:\s*\n\n```html\n([\s\S]*?)\n```/);
                    if (codeMatch && codeMatch[1]) {
                        codeContext = codeMatch[1].trim();
                    }
                }
            }
        }

        // IMPROVED validation - more intelligent with customization awareness
        if (originalContext || codeContext) {
            try {
                const validationResult = await contextValidationTool.func(JSON.stringify({
                    action: "validate",
                    response: result.output,
                    originalContext: originalContext,
                    codeContext: codeContext,
                    isNewSession: isNewSession,
                    userRequest: input // Pass the user request for customization detection
                }));

                const validation = JSON.parse(validationResult);
                
                if (!validation.isValid) {
                    console.log(`🚫 ${isNewSession ? 'ABSOLUTE' : 'INTELLIGENT'} MODE: Response deviates from context, rejecting`);
                    
                    if (isNewSession && codeContext && !input.toLowerCase().includes('customize') && !input.toLowerCase().includes('change') && !input.toLowerCase().includes('modify')) {
                        // For new sessions with code context and no customization request, force exact reproduction
                        console.log("🔄 NEW SESSION: Forcing exact code reproduction from context");
                        result.output = `Here is the exact code from the provided context:\n\n\`\`\`html\n${codeContext}\n\`\`\`\n\nThis is the complete code as provided in the context. No modifications have been made to ensure 100% adherence.`;
                    } else if (!isNewSession && validation.tailwindFrameworkCheck && !validation.tailwindFrameworkCheck.isValid) {
                        // For follow-up questions with TailwindCSS framework violations
                        console.log("🚫 TAILWINDCSS VIOLATION: Non-TailwindCSS framework detected");
                        result.output = `I cannot provide this response as it violates the TailwindCSS framework restriction. For customizations, you must use ONLY TailwindCSS classes and utilities. The response contained forbidden frameworks or libraries. Please ensure your request uses only TailwindCSS.`;
                    } else {
                        // For other cases, provide standard rejection message
                        result.output = `I cannot provide this response as it deviates from the provided context. The context contains specific code that must be followed exactly unless you request specific customizations. Please ensure your request aligns with the available context materials.`;
                    }
                }
            } catch (error) {
                console.error("Error in enhanced response validation:", error);
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
            } catch (error) {
                console.error("Error storing code in memory:", error);
            }
        }

        // Clean up output
        result.output = result.output.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
    }

    return {
        output: result.output,
        intermediateSteps: result.intermediateSteps || [],
        references: references
    };
};

// Export the main functions
export { executorGPT, executeWithCodeHandling };
// Test function for context analysis
export async function testContextAnalysis() {
    // Test case 1: New topic (pricing cards vs hero section)
    const testCase1 = {
        currentQuestion: "Can you help me to add smooth animations when the pricing cards first load on the page, like a fade-in or slide-up effect and hover affect?",
        chatHistory: [
            {
                role: "user",
                content: "I need help creating an eye-catching hero section for my lead generation landing page. Could you create a visually striking hero section with these specific elements..."
            },
            {
                role: "assistant", 
                content: "I can help you create the hero section for your lead generation landing page with the specified elements..."
            }
        ]
    };
    
    try {
        const result1 = await contextAnalysisTool.func(JSON.stringify(testCase1));
        const analysis1 = JSON.parse(result1);
        console.log("🧪 Test Case 1 (Pricing cards vs Hero section):", analysis1);
        
        // Test case 2: Follow-up question
        const testCase2 = {
            currentQuestion: "Can you add a contact form to the hero section?",
            chatHistory: [
                {
                    role: "user",
                    content: "I need help creating an eye-catching hero section for my lead generation landing page..."
                },
                {
                    role: "assistant",
                    content: "I can help you create the hero section for your lead generation landing page..."
                }
            ]
        };
        
        const result2 = await contextAnalysisTool.func(JSON.stringify(testCase2));
        const analysis2 = JSON.parse(result2);
        console.log("🧪 Test Case 2 (Follow-up question):", analysis2);
        
        console.log("✅ Context analysis test completed successfully!");
        
    } catch (error) {
        console.error("❌ Error in context analysis test:", error);
    }
}

// Helper function to detect legitimate customizations
function detectLegitimateCustomizations(userRequest: string, response: string, originalContext: string): boolean {
    const lowerRequest = userRequest.toLowerCase();
    const lowerResponse = response.toLowerCase();
    
    // Check if user explicitly requested customizations
    const customizationKeywords = [
        'customize', 'change', 'modify', 'adjust', 'tweak', 'update', 'improve',
        'color', 'colors', 'background', 'text', 'hover', 'focus', 'animation',
        'transition', 'effect', 'style', 'styling', 'theme', 'palette'
    ];
    
    const hasCustomizationRequest = customizationKeywords.some(keyword => 
        lowerRequest.includes(keyword)
    );
    
    if (!hasCustomizationRequest) {
        return false;
    }
    
    // Check if the response maintains the same structure but changes only styling
    const originalStructure = extractHTMLStructure(originalContext);
    const responseStructure = extractHTMLStructure(response);
    
    // Allow if structure is preserved (allowing for minor class changes)
    const structurePreserved = originalStructure === responseStructure || 
                              calculateStructureSimilarity(originalStructure, responseStructure) > 0.8;
    
    // Check if only TailwindCSS classes were modified
    const originalClasses = extractCSSClasses(originalContext);
    const responseClasses = extractCSSClasses(response);
    
    const onlyTailwindChanges = responseClasses.every(className => 
        className.includes('bg-') || 
        className.includes('text-') || 
        className.includes('border-') || 
        className.includes('hover:') || 
        className.includes('focus:') || 
        className.includes('transition-') || 
        className.includes('animate-') || 
        className.includes('transform-') ||
        originalClasses.includes(className) // Keep original classes
    );
    
    return structurePreserved && onlyTailwindChanges;
}

// Helper function to calculate structure similarity
function calculateStructureSimilarity(structure1: string, structure2: string): number {
    const tags1 = structure1.split(' ').filter(tag => tag.startsWith('<'));
    const tags2 = structure2.split(' ').filter(tag => tag.startsWith('<'));
    
    if (tags1.length === 0 || tags2.length === 0) {
        return 0;
    }
    
    const commonTags = tags1.filter(tag => tags2.includes(tag));
    return commonTags.length / Math.max(tags1.length, tags2.length);
}

// Helper functions for context validation
