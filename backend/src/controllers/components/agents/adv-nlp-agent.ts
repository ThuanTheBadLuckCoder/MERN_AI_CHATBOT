import { DynamicTool } from "@langchain/core/tools";
import { model } from "../../../config/openai-config.js";
import { modelGemini } from "../../../config/gemini-config.js";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { convertToOpenAIFunction } from "@langchain/core/utils/function_calling";
import { RunnableSequence } from "@langchain/core/runnables";
import { AgentExecutor, type AgentStep } from "langchain/agents";
import { formatToOpenAIFunctionMessages } from "langchain/agents/format_scratchpad";
import { OpenAIFunctionsAgentOutputParser } from "langchain/agents/openai/output_parser";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

// Intent and entity structure
interface EntityDetection {
    type: string;  // "element", "component", "style", "function", etc.
    value: string;
    confidence: number;
}

interface IntentAnalysis {
    primaryIntent: string;  // "create", "modify", "explain", "debug", etc.
    subIntent?: string;     // More specific action
    entities: EntityDetection[];
    ambiguityScore: number; // 0-1 scale, higher means more ambiguous
    needsClarification: boolean;
    suggestedClarification?: string;
    confidence: number;
}

// Enhanced intent detection tool
const intentAnalyzerTool = new DynamicTool({
    name: 'intent_analyzer_tool',
    description: 'Analyzes user queries to detect intent, entities, and ambiguity',
    func: async (input: string) => {
        try {
            // Parse input as JSON containing user message and context
            const data = JSON.parse(input);
            const userMessage = data.message;
            const conversationHistory = data.history || [];
            const codeContext = data.codeContext || null;

            // Determine if we have enough context to analyze intent
            const hasCodeContext = codeContext && (
                codeContext.fullHtmlDocument || 
                (codeContext.codeHistory && codeContext.codeHistory.length > 0)
            );

            // Create a specific prompt for the NLP model to analyze intent
            const messages = [
                new SystemMessage({
                    content: `You are a specialized intent analysis system for web development queries.
                    
                    Your task is to precisely identify:
                    1. Primary intent (create, modify, explain, debug, enhance, etc.)
                    2. Sub-intent (specific action within the primary category)
                    3. Relevant entities (elements, components, styles, functions mentioned)
                    4. Ambiguity level and areas needing clarification
                    
                    ${hasCodeContext ? 'IMPORTANT: The user has existing code context that should inform your analysis.' : 
                     'Note: The user does not have existing code context yet.'}
                    
                    Respond with a JSON object following this structure:
                    {
                      "primaryIntent": string,
                      "subIntent": string,
                      "entities": [
                        { 
                          "type": string,
                          "value": string,
                          "confidence": number
                        }
                      ],
                      "ambiguityScore": number,       // 0-1 scale, higher = more ambiguous
                      "needsClarification": boolean,
                      "suggestedClarification": string,
                      "confidence": number            // 0-1 scale for overall analysis confidence
                    }`
                }),
                // Include relevant conversation history for context
                ...conversationHistory.slice(-4),
                new HumanMessage({
                    content: userMessage
                })
            ];

            // Use modelGemini for intent analysis (better at nuanced understanding)
            const response = await modelGemini.invoke(messages);
            const responseContent = typeof response.content === 'string' 
                ? response.content 
                : JSON.stringify(response.content);

            // Extract JSON from response (handle cases where model adds explanatory text)
            const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : '{}';
            
            try {
                // Parse and validate the intent analysis
                const intentAnalysis: IntentAnalysis = JSON.parse(jsonStr);
                
                // Ensure required fields exist with defaults if missing
                const validatedAnalysis: IntentAnalysis = {
                    primaryIntent: intentAnalysis.primaryIntent || "unknown",
                    subIntent: intentAnalysis.subIntent || undefined,
                    entities: intentAnalysis.entities || [],
                    ambiguityScore: typeof intentAnalysis.ambiguityScore === 'number' 
                        ? intentAnalysis.ambiguityScore 
                        : 0.5,
                    needsClarification: intentAnalysis.ambiguityScore > 0.6 || !!intentAnalysis.needsClarification,
                    suggestedClarification: intentAnalysis.suggestedClarification,
                    confidence: typeof intentAnalysis.confidence === 'number' 
                        ? intentAnalysis.confidence 
                        : 0.7
                };
                
                return JSON.stringify(validatedAnalysis);
            } catch (parseError) {
                console.error("Error parsing intent analysis JSON:", parseError);
                // Provide fallback analysis
                return JSON.stringify({
                    primaryIntent: "unknown",
                    entities: [],
                    ambiguityScore: 0.8,
                    needsClarification: true,
                    suggestedClarification: "Could you please clarify what you'd like me to help you with?",
                    confidence: 0.3
                });
            }
        } catch (error) {
            console.error("Error in intent analyzer tool:", error);
            return JSON.stringify({
                primaryIntent: "unknown",
                entities: [],
                ambiguityScore: 1.0,
                needsClarification: true,
                confidence: 0.1
            });
        }
    }
});

// Disambiguation tool for handling ambiguous queries
const disambiguationTool = new DynamicTool({
    name: 'disambiguation_tool',
    description: 'Generates clarifying questions and resolves ambiguous inputs',
    func: async (input: string) => {
        try {
            const data = JSON.parse(input);
            const intentAnalysis = data.intentAnalysis;
            const originalQuery = data.originalQuery;
            const conversationHistory = data.history || [];
            const codeContext = data.codeContext || null;
            
            // If the query isn't ambiguous, we don't need to disambiguate
            if (!intentAnalysis.needsClarification && intentAnalysis.ambiguityScore < 0.6) {
                return JSON.stringify({
                    needsDisambiguation: false,
                    resolvedIntent: intentAnalysis,
                    clarifyingQuestion: null
                });
            }
            
            // Create a prompt for the disambiguation model
            const messages = [
                new SystemMessage({
                    content: `You are a specialized disambiguation system for web development queries.
                    
                    The user query has been identified as ambiguous (score: ${intentAnalysis.ambiguityScore}).
                    Primary intent identified: ${intentAnalysis.primaryIntent}
                    
                    Your task is to:
                    1. Generate a clear, specific clarifying question that will resolve the ambiguity
                    2. Provide options if appropriate
                    3. Explain why the clarification is needed
                    
                    Ambiguous areas identified:
                    ${intentAnalysis.suggestedClarification || "Need to determine specific user intent."}
                    
                    Format your response as JSON:
                    {
                      "needsDisambiguation": true,
                      "clarifyingQuestion": "Your specific question here",
                      "options": ["option1", "option2"] (if applicable),
                      "explanation": "Brief explanation of the ambiguity"
                    }`
                }),
                // Add relevant conversation context
                ...conversationHistory.slice(-3),
                new HumanMessage({
                    content: `Original query: "${originalQuery}"`
                })
            ];
            
            // Use modelGemini for disambiguation (better at generating natural-sounding questions)
            const response = await modelGemini.invoke(messages);
            const responseContent = typeof response.content === 'string' 
                ? response.content 
                : JSON.stringify(response.content);
                
            // Extract JSON from response
            const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : '{}';
            
            try {
                // Parse and validate the disambiguation response
                const disambiguationResult = JSON.parse(jsonStr);
                
                return JSON.stringify({
                    needsDisambiguation: true,
                    resolvedIntent: intentAnalysis,
                    clarifyingQuestion: disambiguationResult.clarifyingQuestion || 
                        "Could you please provide more details about what you'd like me to help with?",
                    options: disambiguationResult.options || [],
                    explanation: disambiguationResult.explanation || 
                        "I need a bit more information to understand exactly what you're looking for."
                });
            } catch (parseError) {
                console.error("Error parsing disambiguation JSON:", parseError);
                return JSON.stringify({
                    needsDisambiguation: true,
                    resolvedIntent: intentAnalysis,
                    clarifyingQuestion: "Could you please clarify what you'd like me to help with?",
                    options: [],
                    explanation: "I'm not entirely sure what you're asking for."
                });
            }
        } catch (error) {
            console.error("Error in disambiguation tool:", error);
            return JSON.stringify({
                needsDisambiguation: true,
                resolvedIntent: null,
                clarifyingQuestion: "I'm having trouble understanding your request. Could you rephrase it?",
                options: [],
                explanation: "There was an error processing your request."
            });
        }
    }
});

// Context-aware query enhancement tool
const queryEnhancementTool = new DynamicTool({
    name: 'query_enhancement_tool',
    description: 'Enhances queries with contextual information and resolves references',
    func: async (input: string) => {
        try {
            const data = JSON.parse(input);
            const originalQuery = data.originalQuery;
            const resolvedIntent = data.resolvedIntent || null;
            const conversationHistory = data.history || [];
            const codeContext = data.codeContext || null;
            
            // Check if we have references to resolve (like "this", "it", "that button", etc.)
            const hasReferences = /\b(this|that|it|the|these|those)\b/i.test(originalQuery);
            
            // Create a prompt for the query enhancement
            const messages = [
                new SystemMessage({
                    content: `You are a specialized query enhancement system for web development.
                    
                    Your task is to take the original query and:
                    1. Resolve any references to previous elements or code ("this", "that", "it")
                    2. Add relevant context from the conversation history
                    3. Produce a fully contextualized query that captures complete user intent
                    
                    ${hasReferences ? 'IMPORTANT: This query contains references that need resolution.' : ''}
                    ${resolvedIntent ? `Detected intent: ${resolvedIntent.primaryIntent}` : ''}
                    
                    Format your response as JSON:
                    {
                      "enhancedQuery": "The fully contextualized query",
                      "resolvedReferences": { "term": "resolution" } (if applicable),
                      "addedContext": "What context was added and why",
                      "confidence": number (0-1 scale)
                    }`
                }),
                // Add conversation history for context
                ...conversationHistory.slice(-5),
                new HumanMessage({
                    content: `Original query: "${originalQuery}"`
                })
            ];
            
            // Use modelGemini for query enhancement
            const response = await modelGemini.invoke(messages);
            const responseContent = typeof response.content === 'string' 
                ? response.content 
                : JSON.stringify(response.content);
                
            // Extract JSON from response
            const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : '{}';
            
            try {
                // Parse and validate the enhancement result
                const enhancementResult = JSON.parse(jsonStr);
                
                return JSON.stringify({
                    originalQuery: originalQuery,
                    enhancedQuery: enhancementResult.enhancedQuery || originalQuery,
                    resolvedReferences: enhancementResult.resolvedReferences || {},
                    addedContext: enhancementResult.addedContext || "",
                    confidence: enhancementResult.confidence || 0.7
                });
            } catch (parseError) {
                console.error("Error parsing query enhancement JSON:", parseError);
                return JSON.stringify({
                    originalQuery: originalQuery,
                    enhancedQuery: originalQuery,
                    resolvedReferences: {},
                    addedContext: "",
                    confidence: 0.5
                });
            }
        } catch (error) {
            console.error("Error in query enhancement tool:", error);
            return JSON.stringify({
                originalQuery: input,
                enhancedQuery: input,
                resolvedReferences: {},
                addedContext: "",
                confidence: 0.3
            });
        }
    }
});

// Main NLP orchestration function
export async function processWithAdvancedNLP(
    input: string,
    chatHistory: BaseMessage[] = [],
    codeContext: any = null,
    conversationId: string = "default",
    executeCallback: Function
) {
    console.log("Processing with Advanced NLP:", input);
    
    try {
        // Step 1: Analyze intent
        const intentAnalysisInput = JSON.stringify({
            message: input,
            history: chatHistory,
            codeContext: codeContext
        });
        
        const intentAnalysisResult = await intentAnalyzerTool.func(intentAnalysisInput);
        const intentAnalysis = JSON.parse(intentAnalysisResult);
        
        console.log("Intent Analysis:", intentAnalysis);
        
        // Step 2: Check if disambiguation is needed
        if (intentAnalysis.needsClarification || intentAnalysis.ambiguityScore > 0.6) {
            console.log("Query needs disambiguation");
            
            const disambiguationInput = JSON.stringify({
                intentAnalysis: intentAnalysis,
                originalQuery: input,
                history: chatHistory,
                codeContext: codeContext
            });
            
            const disambiguationResult = await disambiguationTool.func(disambiguationInput);
            const disambiguation = JSON.parse(disambiguationResult);
            
            // If disambiguation is needed, return a clarifying question
            if (disambiguation.needsDisambiguation) {
                console.log("Returning clarifying question");
                
                // Format the clarifying response
                let clarifyingResponse = disambiguation.clarifyingQuestion;
                
                // Add options if available
                if (disambiguation.options && disambiguation.options.length > 0) {
                    clarifyingResponse += "\n\nOptions:";
                    disambiguation.options.forEach((option: string, index: number) => {
                        clarifyingResponse += `\n${index + 1}. ${option}`;
                    });
                }
                
                // Return the disambiguation response
                return {
                    output: clarifyingResponse,
                    intermediateSteps: [],
                    needsDisambiguation: true,
                    intentAnalysis: intentAnalysis
                };
            }
        }
        
        // Step 3: Enhance the query with context
        const queryEnhancementInput = JSON.stringify({
            originalQuery: input,
            resolvedIntent: intentAnalysis,
            history: chatHistory,
            codeContext: codeContext
        });
        
        const queryEnhancementResult = await queryEnhancementTool.func(queryEnhancementInput);
        const enhancedQuery = JSON.parse(queryEnhancementResult);
        
        console.log("Enhanced Query:", enhancedQuery);
        
        // Step 4: Process with the main executor using the enhanced query
        const executorResult = await executeCallback(
            enhancedQuery.enhancedQuery,
            chatHistory,
            conversationId
        );
        
        // Add metadata about the NLP processing
        return {
            ...executorResult,
            nlpMetadata: {
                intentAnalysis: intentAnalysis,
                queryEnhancement: enhancedQuery
            }
        };
    } catch (error) {
        console.error("Error in advanced NLP processing:", error);
        
        // Fallback to direct execution if NLP processing fails
        return executeCallback(input, chatHistory, conversationId);
    }
}

// Response aggregator for handling multi-turn disambiguation
export async function handleDisambiguation(
    originalQuery: string,
    clarificationResponse: string,
    intentAnalysis: IntentAnalysis,
    chatHistory: BaseMessage[],
    codeContext: any = null,
    conversationId: string = "default",
    executeCallback: Function
) {
    // Add the clarification response to chat history
    const updatedHistory = [
        ...chatHistory,
        new AIMessage({ content: clarificationResponse }),
    ];
    
    // Store the disambiguation state
    if (!global.disambiguationState) {
        global.disambiguationState = {};
    }
    
    global.disambiguationState[conversationId] = {
        originalQuery,
        intentAnalysis,
        timestamp: Date.now()
    };
    
    // The actual resolution will happen when the user responds to the clarification
    return {
        output: clarificationResponse,
        intermediateSteps: [],
        awaitingClarification: true
    };
}

// Function to check if a query is a response to a previous disambiguation request
export function isDisambiguationResponse(
    input: string,
    chatHistory: BaseMessage[],
    conversationId: string = "default"
) {
    // Check if we have an active disambiguation request
    if (!global.disambiguationState || !global.disambiguationState[conversationId]) {
        return false;
    }
    
    const disambiguationState = global.disambiguationState[conversationId];
    
    // Check if the disambiguation is recent (within last 5 minutes)
    const isRecent = (Date.now() - disambiguationState.timestamp) < 5 * 60 * 1000;
    
    if (!isRecent) {
        return false;
    }
    
    // Check last AI message to see if it was a clarification request
    const lastAiMessage = chatHistory
        .filter(msg => msg._getType() === 'ai')
        .pop();
        
    if (!lastAiMessage) {
        return false;
    }
    
    const lastAiContent = typeof lastAiMessage.content === 'string' 
        ? lastAiMessage.content 
        : JSON.stringify(lastAiMessage.content);
        
    // Check if last message contained a question mark
    const hasQuestion = lastAiContent.includes('?');
    
    return hasQuestion && isRecent;
}

// Function to handle a response to a disambiguation request
export async function processDisambiguationResponse(
    input: string,
    chatHistory: BaseMessage[],
    codeContext: any = null,
    conversationId: string = "default",
    executeCallback: Function
) {
    const disambiguationState = global.disambiguationState[conversationId];
    
    // Combine the original query with the clarification
    const combinedQuery = JSON.stringify({
        originalQuery: disambiguationState.originalQuery,
        clarification: input,
        intentAnalysis: disambiguationState.intentAnalysis
    });
    
    // Use the query enhancement tool to merge the original query with the clarification
    const enhancedQueryResult = await queryEnhancementTool.func(combinedQuery);
    const enhancedQuery = JSON.parse(enhancedQueryResult);
    
    console.log("Disambiguated query:", enhancedQuery.enhancedQuery);
    
    // Clear the disambiguation state
    delete global.disambiguationState[conversationId];
    
    // Process with the main executor using the enhanced query
    return executeCallback(
        enhancedQuery.enhancedQuery,
        chatHistory,
        conversationId
    );
}

// Export all the tools and functions
export {
    intentAnalyzerTool,
    disambiguationTool,
    queryEnhancementTool
};