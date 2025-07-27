export {};
/*
// Import necessary additions
import { BufferMemory } from "langchain/memory";
import { RedisChatMessageHistory } from "@langchain/community/chat_message_histories/redis";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

// New interface for comprehensive user context
interface UserContext {
    preferences: {
        codeStyle?: 'modern' | 'classic' | 'minimal';
        framework?: string;
        explanationLevel?: 'basic' | 'intermediate' | 'advanced';
        lastTopics?: string[];
    };
    sessions: {
        [sessionId: string]: {
            startTime: number;
            lastActive: number;
            topicSummary?: string;
            codeContext?: CodeState;
            interactionCount: number;
        }
    };
    conversationSummaries: {
        id: string;
        timestamp: number;
        summary: string;
    }[];
}

// Enhance the CodeState interface
interface EnhancedCodeState extends CodeState {
    framework?: string;
    components: {
        name: string;
        type: string;
        content: string;
        lastModified: number;
    }[];
    dependencies: string[];
    userPreferences: {
        styling: string;
        structure: string;
        comments: 'minimal' | 'moderate' | 'detailed';
    };
}

// New memory manager class
class EnhancedMemoryManager {
    private static instance: EnhancedMemoryManager;
    private contextStore: Map<string, UserContext> = new Map();
    private redisMemory: Map<string, BufferMemory> = new Map();
    private redisClient: any; // Replace with proper Redis client type if using

    private constructor(redisUrl?: string) {
        // Initialize Redis client if URL provided
        if (redisUrl) {
            // Setup Redis client (implementation depends on your Redis library)
            // this.redisClient = new Redis(redisUrl);
        }
    }

    public static getInstance(redisUrl?: string): EnhancedMemoryManager {
        if (!EnhancedMemoryManager.instance) {
            EnhancedMemoryManager.instance = new EnhancedMemoryManager(redisUrl);
        }
        return EnhancedMemoryManager.instance;
    }

    // Get or create user context
    public getUserContext(userId: string): UserContext {
        if (!this.contextStore.has(userId)) {
            this.contextStore.set(userId, {
                preferences: {},
                sessions: {},
                conversationSummaries: []
            });
        }
        return this.contextStore.get(userId)!;
    }

    // Update user preferences
    public updateUserPreferences(userId: string, preferences: Partial<UserContext['preferences']>): void {
        const context = this.getUserContext(userId);
        context.preferences = { ...context.preferences, ...preferences };
        this.contextStore.set(userId, context);
    }

    // Create or update session data
    public updateSession(userId: string, sessionId: string, sessionData: Partial<UserContext['sessions'][string]>): void {
        const context = this.getUserContext(userId);
        
        if (!context.sessions[sessionId]) {
            context.sessions[sessionId] = {
                startTime: Date.now(),
                lastActive: Date.now(),
                interactionCount: 0
            };
        }
        
        context.sessions[sessionId] = {
            ...context.sessions[sessionId],
            ...sessionData,
            lastActive: Date.now()
        };
        
        this.contextStore.set(userId, context);
    }

    // Store a conversation summary
    public addConversationSummary(userId: string, summary: string): void {
        const context = this.getUserContext(userId);
        context.conversationSummaries.push({
            id: `summary_${Date.now()}`,
            timestamp: Date.now(),
            summary
        });
        
        // Keep only the last 10 summaries
        if (context.conversationSummaries.length > 10) {
            context.conversationSummaries = context.conversationSummaries.slice(-10);
        }
        
        this.contextStore.set(userId, context);
    }

    // Get chat memory with Redis persistence
    public getChatMemory(userId: string, sessionId: string): BufferMemory {
        const cacheKey = `${userId}:${sessionId}`;
        
        if (!this.redisMemory.has(cacheKey)) {
            // Create memory with Redis-backed history if Redis is configured
            if (this.redisClient) {
                const chatHistory = new RedisChatMessageHistory({
                    sessionId: cacheKey,
                    sessionTTL: 60 * 60 * 24 * 7, // 1 week
                    client: this.redisClient
                });
                
                this.redisMemory.set(cacheKey, new BufferMemory({
                    chatHistory,
                    returnMessages: true,
                    memoryKey: MEMORY_KEY
                }));
            } else {
                // Fallback to in-memory storage
                this.redisMemory.set(cacheKey, new BufferMemory({
                    returnMessages: true,
                    memoryKey: MEMORY_KEY
                }));
            }
        }
        
        return this.redisMemory.get(cacheKey)!;
    }

    // Save enhanced code state
    public saveCodeState(userId: string, sessionId: string, codeState: EnhancedCodeState): void {
        const context = this.getUserContext(userId);
        
        if (!context.sessions[sessionId]) {
            this.updateSession(userId, sessionId, {});
        }
        
        context.sessions[sessionId].codeContext = codeState;
        this.contextStore.set(userId, context);
    }

    // Get code state with enhanced features
    public getCodeState(userId: string, sessionId: string): EnhancedCodeState {
        const context = this.getUserContext(userId);
        
        if (!context.sessions[sessionId] || !context.sessions[sessionId].codeContext) {
            return {
                codeHistory: [],
                components: [],
                dependencies: [],
                userPreferences: {
                    styling: 'tailwind',
                    structure: 'semantic',
                    comments: 'moderate'
                }
            };
        }
        
        return context.sessions[sessionId].codeContext as EnhancedCodeState;
    }

    // Generate topic summary from recent interactions
    public async generateTopicSummary(userId: string, sessionId: string, chatHistory: BaseMessage[]): Promise<string> {
        // Skip if not enough messages
        if (chatHistory.length < 3) return '';
        
        // Use the model to generate a summary
        const messages = [
            new SystemMessage({
                content: `You are a summarizer. Create a brief, 1-2 sentence summary of the main topics discussed in this front-end development conversation.`
            }),
            ...chatHistory.slice(-6)
        ];
        
        try {
            const response = await modelGemini.invoke(messages);
            const summary = typeof response.content === 'string'
                ? response.content
                : JSON.stringify(response.content);
                
            // Store the summary
            const context = this.getUserContext(userId);
            if (context.sessions[sessionId]) {
                context.sessions[sessionId].topicSummary = summary;
                this.contextStore.set(userId, context);
            }
            
            return summary;
        } catch (error) {
            console.error("Error generating topic summary:", error);
            return '';
        }
    }
}

// Create new topical analysis tool
const topicalAnalysisTool = new DynamicTool({
    name: 'topical_analysis_tool',
    description: 'Analyzes the topics in the conversation to maintain thematic continuity',
    func: async (inputStr: string) => {
        try {
            const input = JSON.parse(inputStr);
            const { userId, sessionId, currentQuestion, chatHistory } = input;
            
            if (!chatHistory || chatHistory.length < 2) {
                return JSON.stringify({
                    mainTopic: "new conversation",
                    recentTopics: [],
                    suggestedApproach: "provide comprehensive introduction"
                });
            }
            
            // Use the model to analyze topics
            const messages = [
                new SystemMessage({
                    content: `You are a conversation topic analyzer for front-end development discussions.
                    
                    Analyze these messages and identify:
                    1. The main topic of the entire conversation
                    2. The most recent 2-3 subtopics
                    3. Whether the new question represents a topic shift
                    4. A suggested approach based on conversational context
                    
                    Respond in JSON format only.`
                }),
                ...chatHistory.slice(-6),
                new HumanMessage({
                    content: `Current question: ${currentQuestion}`
                })
            ];
            
            const response = await modelGemini.invoke(messages);
            const responseContent = typeof response.content === 'string'
                ? response.content
                : JSON.stringify(response.content);
                
            // Extract JSON from response
            const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : '{}';
            
            // Parse and validate
            const analysis = JSON.parse(jsonStr);
            
            // Store this information in the memory manager
            const memoryManager = EnhancedMemoryManager.getInstance();
            memoryManager.updateUserPreferences(userId, {
                lastTopics: analysis.recentTopics || []
            });
            
            return JSON.stringify(analysis);
        } catch (error) {
            console.error("Error in topical analysis:", error);
            return JSON.stringify({
                mainTopic: "unknown",
                recentTopics: [],
                suggestedApproach: "provide direct answer"
            });
        }
    }
});

// Enhance the codeMemoryTool to use the new memory manager
const enhancedCodeMemoryTool = new DynamicTool({
    name: 'enhanced_code_memory_tool',
    description: 'Advanced tool for storing and managing code context with user preferences',
    func: async (input: string) => {
        try {
            const data = JSON.parse(input);
            const action = data.action;
            const userId = data.userId || "default";
            const sessionId = data.sessionId || "default";
            
            // Get memory manager singleton
            const memoryManager = EnhancedMemoryManager.getInstance();
            
            if (action === "store") {
                // Enhanced storage with metadata
                const codeContent = data.content;
                const codeType = data.type || "full-document";
                const framework = data.framework;
                const componentName = data.componentName;
                
                // Get current code state
                const codeState = memoryManager.getCodeState(userId, sessionId);
                
                // Detect if this is a full HTML document
                const isFullHtml = codeContent.includes("<!DOCTYPE html>") ||
                    (codeContent.includes("<html") && codeContent.includes("<body"));
                
                if (isFullHtml) {
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
                
                // Store component if provided
                if (componentName && codeType === "component") {
                    // Check if component already exists
                    const existingCompIndex = codeState.components.findIndex(c => c.name === componentName);
                    
                    if (existingCompIndex >= 0) {
                        codeState.components[existingCompIndex] = {
                            name: componentName,
                            type: data.componentType || "generic",
                            content: codeContent,
                            lastModified: Date.now()
                        };
                    } else {
                        codeState.components.push({
                            name: componentName,
                            type: data.componentType || "generic",
                            content: codeContent,
                            lastModified: Date.now()
                        });
                    }
                }
                
                // Update framework if provided
                if (framework) {
                    codeState.framework = framework;
                }
                
                // Save dependencies if provided
                if (data.dependencies && Array.isArray(data.dependencies)) {
                    codeState.dependencies = [...new Set([...codeState.dependencies, ...data.dependencies])];
                }
                
                // Update user preferences if provided
                if (data.preferences) {
                    codeState.userPreferences = {
                        ...codeState.userPreferences,
                        ...data.preferences
                    };
                }
                
                // Save to memory manager
                memoryManager.saveCodeState(userId, sessionId, codeState);
                return JSON.stringify(codeState);
            }
            else if (action === "retrieve") {
                // Get code state with all enhancements
                const codeState = memoryManager.getCodeState(userId, sessionId);
                
                console.log(`Retrieved enhanced code state for user ${userId}, session ${sessionId}:`,
                    codeState.fullHtmlDocument ? "Has full HTML document" : "No full HTML document",
                    `Components: ${codeState.components.length}`,
                    `History entries: ${codeState.codeHistory.length}`);
                
                return JSON.stringify(codeState);
            }
            else if (action === "update") {
                // Enhanced update with component tracking
                const selector = data.selector;
                const newContent = data.content;
                const operation = data.operation || "replace";
                const componentName = data.componentName;
                
                const codeState = memoryManager.getCodeState(userId, sessionId);
                
                if (componentName) {
                    // Update specific component
                    const componentIndex = codeState.components.findIndex(c => c.name === componentName);
                    
                    if (componentIndex >= 0) {
                        codeState.components[componentIndex].content = newContent;
                        codeState.components[componentIndex].lastModified = Date.now();
                    } else if (newContent) {
                        // Create new component
                        codeState.components.push({
                            name: componentName,
                            type: data.componentType || "generic",
                            content: newContent,
                            lastModified: Date.now()
                        });
                    }
                }
                
                if (codeState.fullHtmlDocument && selector) {
                    codeState.lastModifiedElement = selector;
                    
                    // Store the modification info
                    codeState.codeHistory.push({
                        type: "modification",
                        content: JSON.stringify({ selector, newContent, operation }),
                        timestamp: Date.now()
                    });
                }
                
                // Save updated state
                memoryManager.saveCodeState(userId, sessionId, codeState);
                return JSON.stringify(codeState);
            }
            else if (action === "getUserPreferences") {
                // Get user preferences
                const context = memoryManager.getUserContext(userId);
                return JSON.stringify(context.preferences);
            }
            else if (action === "setUserPreferences") {
                // Set user preferences
                const preferences = data.preferences || {};
                memoryManager.updateUserPreferences(userId, preferences);
                return JSON.stringify({ success: true, message: "Preferences updated" });
            }
            
            return JSON.stringify(memoryManager.getCodeState(userId, sessionId));
        } catch (error) {
            console.error("Error in enhanced code memory tool:", error);
            return JSON.stringify({
                codeHistory: [],
                components: [],
                dependencies: [],
                userPreferences: {
                    styling: 'tailwind',
                    structure: 'semantic',
                    comments: 'moderate'
                }
            });
        }
    }
});

// Modify executeWithCodeHandling to use the enhanced memory system
const executeWithEnhancedMemory = async (
    input: string,
    chatHistory: BaseMessage[] = [],
    userId: string = "default",
    sessionId: string = "default"
) => {
    // Get memory manager
    const memoryManager = EnhancedMemoryManager.getInstance();
    
    // Check for greetings/thanks first
    try {
        const greetingResult = await greetingDetectionTool.func(input);
        const greetingData = JSON.parse(greetingResult);
        
        if (greetingData.type === "greeting" || greetingData.type === "thanks") {
            console.log(`Detected ${greetingData.type}, providing immediate response`);
            
            // Update interaction count even for simple responses
            memoryManager.updateSession(userId, sessionId, {
                interactionCount: (memoryManager.getUserContext(userId).sessions[sessionId]?.interactionCount || 0) + 1
            });
            
            return {
                output: greetingData.response,
                intermediateSteps: []
            };
        }
    } catch (error) {
        console.error("Error in greeting detection:", error);
    }
    
    // Get BufferMemory for this user/session
    const memory = memoryManager.getChatMemory(userId, sessionId);
    
    // Load current memory state
    const currentMemory = await memory.loadMemoryVariables({});
    const loadedHistory: BaseMessage[] = currentMemory[MEMORY_KEY] || [];
    
    // Combine loaded history with provided history (deduplicating)
    const combinedHistory = mergeMessageHistories(loadedHistory, chatHistory);
    
    // Update session data
    memoryManager.updateSession(userId, sessionId, {
        lastActive: Date.now(),
        interactionCount: (memoryManager.getUserContext(userId).sessions[sessionId]?.interactionCount || 0) + 1
    });
    
    // Generate topic summary periodically
    if (memoryManager.getUserContext(userId).sessions[sessionId]?.interactionCount % 5 === 0) {
        await memoryManager.generateTopicSummary(userId, sessionId, combinedHistory);
    }
    
    // Add the new tools to the tools array
    const enhancedTools = [elasticSearchTool, conversationAnalyzerTool, enhancedCodeMemoryTool, topicalAnalysisTool, greetingDetectionTool];
    
    // Create enhanced executor with the updated tools
    const enhancedExecutor = AgentExecutor.fromAgentAndTools({
        agent: RunnableSequence.from([
            {
                input: (i: { input: string; steps: AgentStep[]; userId?: string; sessionId?: string }) => i.input,
                agent_scratchpad: (i: { input: string; steps: AgentStep[] }) =>
                    formatToOpenAIFunctionMessages(i.steps),
                context: async (i: { input: string; steps: AgentStep[] }) => {
                    const contextResults = await elasticSearchTool.func(i.input);
                    console.log("Context retrieved: ", contextResults ? contextResults.length : 0, "documents");
                    return contextResults ? contextResults.join("\n") : "No relevant context found.";
                },
                chat_history: (i: { input: string; steps: AgentStep[]; chat_history: BaseMessage[]; userId?: string; sessionId?: string }) =>
                    i.chat_history || [],
                conversation_analysis: async (i: {
                    input: string;
                    steps: AgentStep[];
                    chat_history: BaseMessage[];
                    userId?: string;
                    sessionId?: string
                }) => {
                    // Enhanced conversation analysis with user context
                    const userId = i.userId || "default";
                    const sessionId = i.sessionId || "default";
                    
                    try {
                        // Get user context and preferences
                        const userContext = memoryManager.getUserContext(userId);
                        const codeState = memoryManager.getCodeState(userId, sessionId);
                        
                        // Extract user code from input
                        const codeBlockRegex = /```[\s\S]*?```/g;
                        const codeMatches = i.input.match(codeBlockRegex);
                        
                        if (codeMatches && codeMatches.length > 0) {
                            console.log("Found user-provided code, storing in memory");
                            
                            for (const codeMatch of codeMatches) {
                                const codeContent = codeMatch.replace(/```[\w]*\n/, '').replace(/```$/, '');
                                const isFullHtml = codeContent.includes("<!DOCTYPE html>") ||
                                    (codeContent.includes("<html") && codeContent.includes("<body"));
                                
                                // Store with enhanced metadata
                                await enhancedCodeMemoryTool.func(JSON.stringify({
                                    action: "store",
                                    type: isFullHtml ? "full-document" : "component",
                                    content: codeContent,
                                    userId,
                                    sessionId
                                }));
                                
                                if (isFullHtml) {
                                    console.log("User provided a full HTML document");
                                    codeState.fullHtmlDocument = codeContent;
                                }
                            }
                        }
                        
                        // Run topical analysis for enhanced context
                        const topicalAnalysisInput = JSON.stringify({
                            userId,
                            sessionId,
                            currentQuestion: i.input,
                            chatHistory: i.chat_history
                        });
                        
                        const topicalAnalysisResult = await topicalAnalysisTool.func(topicalAnalysisInput);
                        const topicalData = JSON.parse(topicalAnalysisResult);
                        
                        // Get conversation analysis as before
                        const analyzerInput = JSON.stringify({
                            currentQuestion: i.input,
                            chatHistory: i.chat_history,
                            codeState: codeState
                        });
                        
                        const analysisResultStr = await conversationAnalyzerTool.func(analyzerInput);
                        const analysisResult = JSON.parse(analysisResultStr);
                        
                        console.log("Enhanced conversation analysis: ", {
                            ...analysisResult,
                            topicalContext: topicalData
                        });
                        
                        // Create detailed instructions with both code and topical context
                        let analysisInstructions = "";
                        
                        // Add topical continuity guidance
                        if (topicalData.mainTopic && topicalData.mainTopic !== "new conversation") {
                            analysisInstructions += `The main topic of this conversation is about ${topicalData.mainTopic}. `;
                            
                            if (topicalData.recentTopics && topicalData.recentTopics.length > 0) {
                                analysisInstructions += `Recent subtopics include: ${topicalData.recentTopics.join(', ')}. `;
                            }
                            
                            if (topicalData.suggestedApproach) {
                                analysisInstructions += `Based on the conversation flow, ${topicalData.suggestedApproach}. `;
                            }
                        }
                        
                        // Add code context instructions as before
                        if (analysisResult.type === "follow-up") {
                            analysisInstructions += `This is a follow-up question about code you previously provided.`;
                            
                            if (analysisResult.codeContext === "modification") {
                                analysisInstructions += ` The user wants you to MODIFY the existing code.`;
                            } else if (analysisResult.codeContext === "extension") {
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
                        } else {
                            analysisInstructions += "This appears to be a new question requiring a fresh response.";
                            
                            if (analysisResult.requiresFullHtml) {
                                analysisInstructions += ` Provide a COMPLETE HTML document with proper DOCTYPE, html, head, and body tags.`;
                            }
                        }
                        
                        // Add user preference context if available
                        if (userContext.preferences) {
                            if (userContext.preferences.codeStyle) {
                                analysisInstructions += ` The user prefers ${userContext.preferences.codeStyle} code style.`;
                            }
                            
                            if (userContext.preferences.framework) {
                                analysisInstructions += ` The user has been working with ${userContext.preferences.framework}.`;
                            }
                            
                            if (userContext.preferences.explanationLevel) {
                                analysisInstructions += ` Provide ${userContext.preferences.explanationLevel} level explanations.`;
                            }
                        }
                        
                        // Add instructions about user-provided code
                        if (i.input.includes("```")) {
                            analysisInstructions += " IMPORTANT: The user has provided code in their message. You MUST incorporate this code into your response.";
                        }
                        
                        return analysisInstructions;
                    } catch (error) {
                        console.error("Error processing enhanced conversation analysis:", error);
                        return "Provide a complete and comprehensive response. For HTML code, always include the full document structure.";
                    }
                },
                code_context: async (i: {
                    input: string;
                    steps: AgentStep[];
                    userId?: string;
                    sessionId?: string
                }) => {
                    const userId = i.userId || "default";
                    const sessionId = i.sessionId || "default";
                    
                    try {
                        // Get enhanced code state
                        const codeState = memoryManager.getCodeState(userId, sessionId);
                        
                        if (codeState.fullHtmlDocument) {
                            return `You have previously provided a full HTML document. When modifying or updating code, use this as your starting point and provide a complete updated document:\n\n${codeState.fullHtmlDocument}`;
                        } else if (codeState.components && codeState.components.length > 0) {
                            // Find the most relevant component based on recency
                            const sortedComponents = [...codeState.components].sort((a, b) => b.lastModified - a.lastModified);
                            const recentComponent = sortedComponents[0];
                            
                            return `Reference this previous component "${recentComponent.name}" when responding:\n\n${recentComponent.content}`;
                        } else if (codeState.codeHistory && codeState.codeHistory.length > 0) {
                            // Find the most recent full document or component
                            const relevantCode = codeState.codeHistory
                                .filter(entry => entry.type === "full-document" || entry.type === "component")
                                .pop();
                            
                            if (relevantCode) {
                                return `Reference this previous code when responding:\n\n${relevantCode.content}`;
                            }
                        }
                        
                        // Extract any code from the current user input
                        const codeBlockRegex = /```[\s\S]*?```/g;
                        const codeMatches = i.input.match(codeBlockRegex);
                        
                        if (codeMatches && codeMatches.length > 0) {
                            const userCode = codeMatches[0].replace(/```[\w]*\n/, '').replace(/```$/, '');
                            return `The user has provided this code that you should use as your starting point:\n\n${userCode}`;
                        }
                        
                        return "No previous code context available. Provide complete code in your response.";
                    } catch (error) {
                        console.error("Error retrieving code context:", error);
                        return "No previous code context available. Provide complete code in your response.";
                    }
                }
            },
            frontEndDevPrompt,
            modelWithFunctions.bind({
                functions: enhancedTools.map((tool) => convertToOpenAIFunction(tool)),
            }),
            new CodeContinuityOutputParser(),
        ]),
        tools: enhancedTools,
        verbose: true,
        handleParsingErrors: true,
        returnIntermediateSteps: true,
    });
    
    // Execute with enhanced context
    const result = await enhancedExecutor.invoke({
        input,
        chat_history: combinedHistory,
        userId,
        sessionId
    });
    
    // Save interaction to memory
    await memory.saveContext(
        { input },
        { [MEMORY_KEY]: [new HumanMessage(input), new AIMessage(result.output)] }
    );
    
    // Process result for code completeness as before
    if (typeof result.output === 'string') {
        let modifiedOutput = result.output;
        
        // Remove any thinking tags
        modifiedOutput = modifiedOutput.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
        
        // Process code blocks for completeness
        // (Same code as in your original implementation)
        const containsHtmlCode = modifiedOutput.includes("<html") ||
            modifiedOutput.includes("<!DOCTYPE") ||
            modifiedOutput.includes("<div") ||
            modifiedOutput.includes("<body");
        
        const containsCodeBlock = modifiedOutput.includes("```");
        
        if (containsHtmlCode && containsCodeBlock) {
            // Extract and process code blocks
            // (Same implementation as your original code)
            
            // Store in enhanced memory
            const codeMatch = modifiedOutput.match(/```[\s\S]*?```/);
            if (codeMatch) {
                const codeContent = codeMatch[0].replace(/```[\w]*\n/, '').replace(/```$/, '');
                const isFullHtml = codeContent.includes("<!DOCTYPE html>") ||
                    (codeContent.includes("<html") && codeContent.includes("<body"));
                
                // Extract framework info if present
                let framework = null;
                if (codeContent.includes("react")) {
                    framework = "React";
                } else if (codeContent.includes("vue")) {
                    framework = "Vue";
                } else if (codeContent.includes("angular")) {
                    framework = "Angular";
                } else if (codeContent.includes("tailwind")) {
                    framework = "Tailwind CSS";
                }
                
                // Store with enhanced metadata
                await enhancedCodeMemoryTool.func(JSON.stringify({
                    action: "store",
                    type: isFullHtml ? "full-document" : "component",
                    content: codeContent,
                    framework,
                    userId,
                    sessionId
                }));
                
                console.log(`Stored ${isFullHtml ? "full HTML document" : "component"} for user ${userId}, session ${sessionId}`);
            }

            // Update the preferences based on code analysis
            if (codeMatch) {
                const userContext = memoryManager.getUserContext(userId);
                
                // Detect styling preferences
                if (codeContent.includes("tailwind")) {
                    memoryManager.updateUserPreferences(userId, {
                        codeStyle: 'modern'
                    });
                } else if (codeContent.includes("bootstrap")) {
                    memoryManager.updateUserPreferences(userId, {
                        codeStyle: 'classic'
                    });
                }
                
                // Detect framework preferences if not explicitly set
                if (framework && (!userContext.preferences.framework || userContext.preferences.framework !== framework)) {
                    memoryManager.updateUserPreferences(userId, {
                        framework: framework
                    });
                }
            }
        }
        
        result.output = modifiedOutput;
    }
    
    return result;
};

// Helper function to merge message histories without duplicates
function mergeMessageHistories(history1: BaseMessage[], history2: BaseMessage[]): BaseMessage[] {
    // Create a map of existing messages by content to avoid duplicates
    const messageMap = new Map<string, BaseMessage>();
    
    // Add all messages from the first history
    for (const message of history1) {
        const content = typeof message.content === 'string'
            ? message.content
            : JSON.stringify(message.content);
        messageMap.set(content, message);
    }
    
    // Add messages from the second history that aren't duplicates
    for (const message of history2) {
        const content = typeof message.content === 'string'
            ? message.content
            : JSON.stringify(message.content);
        
        if (!messageMap.has(content)) {
            messageMap.set(content, message);
        }
    }
    
    // Convert back to array and ensure alternating human/AI pattern
    const merged = Array.from(messageMap.values());
    
    // Sort by typical conversation order (assuming message creation timestamps exist)
    // This is a simplified approach - in a real implementation you'd want to sort by actual timestamps
    return merged.sort((a, b) => {
        // If _getCreationTime is available on the messages
        if ('_getCreationTime' in a && '_getCreationTime' in b) {
            return (a as any)._getCreationTime() - (b as any)._getCreationTime();
        }
        return 0;
    });
}

// Create a conversation summarization tool
const conversationSummarizerTool = new DynamicTool({
    name: 'conversation_summarizer_tool',
    description: 'Creates summaries of the conversation for long-term context maintenance',
    func: async (inputStr: string) => {
        try {
            const input = JSON.parse(inputStr);
            const { userId, sessionId, chatHistory } = input;
            
            // Skip if not enough messages
            if (!chatHistory || chatHistory.length < 5) {
                return JSON.stringify({
                    summary: "",
                    success: false,
                    reason: "Not enough messages to summarize"
                });
            }
            
            // Use model to generate summary
            const messages = [
                new SystemMessage({
                    content: `You are a conversation summarizer specializing in front-end development discussions.
                    
                    Create a concise summary of this conversation that captures:
                    1. The main topics and questions discussed
                    2. Key code concepts or components created
                    3. Any decisions or preferences the user expressed
                    4. The current state of the conversation
                    
                    Your summary should be about 3-5 sentences long and focused on technical details that would help maintain context in a future conversation.`
                }),
                ...chatHistory
            ];
            
            const response = await modelGemini.invoke(messages);
            const summary = typeof response.content === 'string'
                ? response.content
                : JSON.stringify(response.content);
                
            // Store in memory manager
            const memoryManager = EnhancedMemoryManager.getInstance();
            memoryManager.addConversationSummary(userId, summary);
            
            return JSON.stringify({
                summary,
                success: true
            });
        } catch (error) {
            console.error("Error summarizing conversation:", error);
            return JSON.stringify({
                summary: "",
                success: false,
                reason: "Error processing summary"
            });
        }
    }
});

// Add periodic summarization to long conversations
async function handleConversationWithSummarization(
    input: string,
    chatHistory: BaseMessage[] = [],
    userId: string = "default",
    sessionId: string = "default"
) {
    // Get memory manager
    const memoryManager = EnhancedMemoryManager.getInstance();
    const userContext = memoryManager.getUserContext(userId);
    
    // Check if we should create a summary (every 10 interactions)
    if (userContext.sessions[sessionId]?.interactionCount % 10 === 0 &&
        userContext.sessions[sessionId]?.interactionCount > 0) {
        
        try {
            // Generate and store a conversation summary
            await conversationSummarizerTool.func(JSON.stringify({
                userId,
                sessionId,
                chatHistory
            }));
            
            console.log("Created conversation summary for future reference");
        } catch (error) {
            console.error("Failed to generate conversation summary:", error);
        }
    }
    
    // Process the conversation with enhanced memory
    return executeWithEnhancedMemory(input, chatHistory, userId, sessionId);
}

// Update the system prompt to include personalization and context awareness
const enhancedFrontEndDevPrompt = ChatPromptTemplate.fromMessages([
    ["system",
        `You are a helpful, expert front-end developer assistant with enhanced memory and context awareness. Your responses should be technically accurate, comprehensive, and maintain continuity across the conversation, especially for code examples.

        CONVERSATION AND CODE ANALYSIS:
        {conversation_analysis}
        
        USER CONTEXT AND PREFERENCES:
        {user_context}
        
        CRITICAL CODE CONTINUITY RULES:
        1. When modifying existing code, ALWAYS work with the FULL HTML document from previous responses.
        2. For HTML/CSS questions, ALWAYS provide complete, properly structured code that can be directly used.
        3. NEVER provide partial or incomplete HTML documents - if updating a previous document, include ALL necessary tags.
        4. When making changes to previous code, build upon the existing structure rather than creating new fragments.
        5. Use proper DOCTYPE, html, head, and body elements in ALL HTML examples unless explicitly told otherwise.
        6. NEVER discard previously provided code - always reference and build upon it.
        7. If user provides code, ALWAYS incorporate it into your response or modifications.
        8. Store the complete, final version of any code you generate in your response.
        9. Adapt your explanations to match the user's detected expertise level.
        10. Maintain consistency with the user's preferred frameworks and styling approaches.
        
        PERSONALIZED RESPONSE APPROACH:
        - First, understand what the user is asking for in relation to previous code and conversation history
        - If modifying previous code, make sure to maintain the full document structure
        - For follow-up questions about specific elements, modify those elements within the full document
        - Provide clear, contextual explanations that match the user's expertise level
        - Ensure all code is complete, valid, and follows best practices
        - CRITICALLY IMPORTANT: Always check for and include any code the user has provided
        - Maintain thematic continuity by referencing earlier topics where relevant
        
        Context from relevant documentation: {context}
        Previous code context: {code_context}
        Conversation summary: {conversation_summary}
        `],
    new MessagesPlaceholder(MEMORY_KEY),
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
]);

// Update the main RunnableSequence to include the enhanced context
const enhancedRunnableAgent = RunnableSequence.from([
    {
        input: (i: { input: string; steps: AgentStep[]; userId?: string; sessionId?: string }) => i.input,
        agent_scratchpad: (i: { input: string; steps: AgentStep[] }) =>
            formatToOpenAIFunctionMessages(i.steps),
        context: async (i: { input: string; steps: AgentStep[] }) => {
            const contextResults = await elasticSearchTool.func(i.input);
            console.log("Context retrieved: ", contextResults ? contextResults.length : 0, "documents");
            return contextResults ? contextResults.join("\n") : "No relevant context found.";
        },
        chat_history: (i: { input: string; steps: AgentStep[]; chat_history: BaseMessage[]; userId?: string; sessionId?: string }) =>
            i.chat_history || [],
        conversation_analysis: async (i: {
            input: string;
            steps: AgentStep[];
            chat_history: BaseMessage[];
            userId?: string;
            sessionId?: string
        }) => {
            // Enhanced analysis with user context
            // (Implementation as provided in executeWithEnhancedMemory)
            return "Analysis placeholder"; // Replace with actual implementation
        },
        user_context: async (i: {
            userId?: string;
            sessionId?: string
        }) => {
            const userId = i.userId || "default";
            const sessionId = i.sessionId || "default";
            
            try {
                // Get user context and format for prompt
                const memoryManager = EnhancedMemoryManager.getInstance();
                const userContext = memoryManager.getUserContext(userId);
                const sessionInfo = userContext.sessions[sessionId] || {};
                
                // Format user preferences for the prompt
                let contextStr = "User preferences:\n";
                
                if (userContext.preferences.codeStyle) {
                    contextStr += `- Preferred code style: ${userContext.preferences.codeStyle}\n`;
                }
                
                if (userContext.preferences.framework) {
                    contextStr += `- Preferred framework: ${userContext.preferences.framework}\n`;
                }
                
                if (userContext.preferences.explanationLevel) {
                    contextStr += `- Explanation detail level: ${userContext.preferences.explanationLevel}\n`;
                }
                
                if (userContext.preferences.lastTopics && userContext.preferences.lastTopics.length > 0) {
                    contextStr += `- Recent topics of interest: ${userContext.preferences.lastTopics.join(', ')}\n`;
                }
                
                // Add session information
                contextStr += "\nSession information:\n";
                contextStr += `- Total interactions: ${sessionInfo.interactionCount || 0}\n`;
                
                if (sessionInfo.topicSummary) {
                    contextStr += `- Current conversation focus: ${sessionInfo.topicSummary}\n`;
                }
                
                return contextStr;
            } catch (error) {
                console.error("Error retrieving user context:", error);
                return "No specific user context available.";
            }
        },
        code_context: async (i: {
            input: string;
            steps: AgentStep[];
            userId?: string;
            sessionId?: string
        }) => {
            // Enhanced code context with user preferences
            // (Similar to implementation in executeWithEnhancedMemory)
            return "Code context placeholder"; // Replace with actual implementation
        },
        conversation_summary: async (i: {
            userId?: string;
            sessionId?: string
        }) => {
            const userId = i.userId || "default";
            
            try {
                // Get conversation summaries
                const memoryManager = EnhancedMemoryManager.getInstance();
                const userContext = memoryManager.getUserContext(userId);
                
                if (userContext.conversationSummaries && userContext.conversationSummaries.length > 0) {
                    // Get most recent summary
                    const latestSummary = userContext.conversationSummaries[userContext.conversationSummaries.length - 1];
                    return `Previous conversation summary: ${latestSummary.summary}`;
                }
                
                return "No previous conversation summary available.";
            } catch (error) {
                console.error("Error retrieving conversation summary:", error);
                return "No conversation summary available.";
            }
        }
    },
    enhancedFrontEndDevPrompt,
    modelWithFunctions.bind({
        functions: [...tools, conversationSummarizerTool, enhancedCodeMemoryTool, topicalAnalysisTool].map(
            (tool) => convertToOpenAIFunction(tool)
        ),
    }),
    new CodeContinuityOutputParser(),
]);

// Export the enhanced executor
export {
    executorGPT,
    executeWithCodeHandling,
    executeWithEnhancedMemory,
    handleConversationWithSummarization,
    EnhancedMemoryManager
};

*/ 
//# sourceMappingURL=adv-context-agents.js.map