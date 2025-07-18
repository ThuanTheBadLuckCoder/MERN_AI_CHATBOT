// contextualChatCleaner.ts
// Clean chat history while preserving context for LLM code understanding

import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

export class ContextualChatCleaner {
    
    /**
     * Clean chat history for better LLM code understanding
     * Removes metadata but preserves essential context and code evolution
     */
    static cleanChatHistoryForCodeContext(
        conversation: any, 
        currentInput: string,
        options: {
            maxMessages?: number;
            prioritizeCodeEvolution?: boolean;
            includeUserRequests?: boolean;
            includeCodeExplanations?: boolean;
        } = {}
    ): BaseMessage[] {
        
        const {
            maxMessages = 15,
            prioritizeCodeEvolution = true,
            includeUserRequests = true,
            includeCodeExplanations = true
        } = options;

        if (!conversation?.messages || conversation.messages.length === 0) {
            return [];
        }

        // Step 1: Clean all messages but preserve essential content
        const cleanedMessages = conversation.messages.map(msg => ({
            ...msg,
            content: this.cleanMessageContent(msg.content),
            isCodeRelated: this.isCodeRelated(msg.content),
            isUserRequest: msg.role === 'user' && this.isUserRequest(msg.content),
            hasCodeBlock: msg.content.includes('```'),
            importance: this.calculateMessageImportance(msg, currentInput)
        }));

        // Step 2: Filter and prioritize messages based on context relevance
        let relevantMessages = cleanedMessages.filter(msg => {
            // Always include recent messages (last 5)
            const isRecent = cleanedMessages.indexOf(msg) >= cleanedMessages.length - 5;
            if (isRecent) return true;

            // Include code-related messages if prioritizing code evolution
            if (prioritizeCodeEvolution && msg.isCodeRelated) return true;

            // Include user requests if enabled
            if (includeUserRequests && msg.isUserRequest) return true;

            // Include messages with code blocks if including explanations
            if (includeCodeExplanations && msg.hasCodeBlock) return true;

            // Include high importance messages
            if (msg.importance > 0.7) return true;

            return false;
        });

        // Step 3: Sort by importance and recency, then take top messages
        relevantMessages = relevantMessages
            .sort((a, b) => {
                // First sort by importance
                if (a.importance !== b.importance) {
                    return b.importance - a.importance;
                }
                // Then by recency (maintain chronological order for same importance)
                return cleanedMessages.indexOf(a) - cleanedMessages.indexOf(b);
            })
            .slice(0, maxMessages);

        // Step 4: Re-sort by chronological order to maintain conversation flow
        relevantMessages.sort((a, b) => 
            cleanedMessages.indexOf(a) - cleanedMessages.indexOf(b)
        );

        // Step 5: Convert to LangChain messages
        return relevantMessages.map(msg => this.toLangChainMessage(msg));
    }

    /**
     * Clean message content while preserving essential context
     */
    static cleanMessageContent(content: string): string {
        if (!content) return '';

        let cleaned = content;

        // Remove system metadata but preserve code and explanations
        cleaned = cleaned.replace(/\[System Note:.*?\]/g, '');
        cleaned = cleaned.replace(/\[SYSTEM WARNING:.*?\]/g, '');
        cleaned = cleaned.replace(/\[CRITICAL SYSTEM.*?\]/g, '');
        cleaned = cleaned.replace(/\[Note:.*?\]/g, '');
        
        // Remove debugging info
        cleaned = cleaned.replace(/DEBUG:.*?\n/g, '');
        cleaned = cleaned.replace(/✅[^\n]*\n/g, '');
        cleaned = cleaned.replace(/❌[^\n]*\n/g, '');
        cleaned = cleaned.replace(/📊[^\n]*\n/g, '');
        cleaned = cleaned.replace(/🔍[^\n]*\n/g, '');
        
        // Remove thinking tags
        cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
        
        // Remove reference metadata but keep the content
        cleaned = cleaned.replace(/\(References used:.*?\)/g, '');
        cleaned = cleaned.replace(/References:[\s\S]*?(?=\n\n|$)/g, '');
        
        // Remove timestamp info
        cleaned = cleaned.replace(/\(Generated at:.*?\)/g, '');
        cleaned = cleaned.replace(/Last updated:.*?\n/g, '');
        
        // Clean up extra whitespace but preserve code formatting
        cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
        cleaned = cleaned.trim();

        return cleaned;
    }

    /**
     * Check if message contains code-related content
     */
    static isCodeRelated(content: string): boolean {
        const codeIndicators = [
            '```',
            '<!DOCTYPE',
            '<html',
            '<div',
            '<span',
            '<button',
            'function',
            'const ',
            'let ',
            'var ',
            'class=',
            'className=',
            'tailwind',
            'css',
            'javascript',
            'html',
            'component',
            'style',
            'import',
            'export',
            'useState',
            'useEffect'
        ];

        return codeIndicators.some(indicator => 
            content.toLowerCase().includes(indicator.toLowerCase())
        );
    }

    /**
     * Check if message is a user request for code changes/creation
     */
    static isUserRequest(content: string): boolean {
        const requestPatterns = [
            /can you (create|make|build|add|modify|change|update)/i,
            /please (create|make|build|add|modify|change|update)/i,
            /i want (to|a|an)/i,
            /i need (to|a|an)/i,
            /how (do|can) i/i,
            /show me how to/i,
            /help me (create|make|build|add|modify|change)/i,
            /(create|make|build|add|modify|change|update) (a|an|the)/i
        ];

        return requestPatterns.some(pattern => pattern.test(content));
    }

    /**
     * Calculate message importance based on context and current input
     */
    static calculateMessageImportance(message: any, currentInput: string): number {
        let importance = 0.5; // Base importance

        // Higher importance for code-related messages
        if (this.isCodeRelated(message.content)) {
            importance += 0.3;
        }

        // Higher importance for user requests
        if (message.role === 'user' && this.isUserRequest(message.content)) {
            importance += 0.2;
        }

        // Higher importance for messages with code blocks
        if (message.content.includes('```')) {
            importance += 0.2;
        }

        // Higher importance if related to current input
        if (currentInput && this.isRelatedToCurrentInput(message.content, currentInput)) {
            importance += 0.3;
        }

        // Lower importance for very short messages
        if (message.content.length < 50) {
            importance -= 0.1;
        }

        // Lower importance for greetings/thanks
        if (this.isGreetingOrThanks(message.content)) {
            importance -= 0.3;
        }

        return Math.max(0, Math.min(1, importance));
    }

    /**
     * Check if message is related to current input
     */
    static isRelatedToCurrentInput(messageContent: string, currentInput: string): boolean {
        // Extract key terms from current input
        const keyTerms = currentInput.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(term => term.length > 3)
            .slice(0, 5);

        if (keyTerms.length === 0) return false;

        const messageLower = messageContent.toLowerCase();
        return keyTerms.some(term => messageLower.includes(term));
    }

    /**
     * Check if message is greeting or thanks
     */
    static isGreetingOrThanks(content: string): boolean {
        const lowerContent = content.toLowerCase();
        
        const patterns = [
            /^(hi|hello|hey|greetings|good morning|good afternoon|good evening)\b/,
            /^how are you/,
            /^what's up/,
            /thank you/,
            /thanks/,
            /appreciate/,
            /grateful/
        ];

        return patterns.some(pattern => pattern.test(lowerContent));
    }

    /**
     * Convert to LangChain message
     */
    static toLangChainMessage(message: any): BaseMessage {
        const content = message.content;

        switch (message.role) {
            case 'user':
                return new HumanMessage({ content });
            case 'assistant':
                return new AIMessage({ content });
            case 'system':
                return new SystemMessage({ content });
            default:
                return new HumanMessage({ content });
        }
    }

    /**
     * Get code evolution context - traces how code has changed over time
     */
    static getCodeEvolutionContext(conversation: any, maxSteps: number = 5): string {
        if (!conversation?.messages) return '';

        const codeMessages = conversation.messages
            .filter(msg => msg.content.includes('```'))
            .slice(-maxSteps)
            .map((msg, index) => {
                const cleanContent = this.cleanMessageContent(msg.content);
                return `Step ${index + 1} (${msg.role}): ${cleanContent.substring(0, 200)}...`;
            });

        if (codeMessages.length === 0) return '';

        return `Code Evolution Context:\n${codeMessages.join('\n\n')}`;
    }

    /**
     * Get current requirements context - what the user is trying to achieve
     */
    static getCurrentRequirementsContext(conversation: any, currentInput: string): string {
        if (!conversation?.messages) return '';

        // Get recent user requests
        const userRequests = conversation.messages
            .filter(msg => msg.role === 'user' && this.isUserRequest(msg.content))
            .slice(-3)
            .map(msg => this.cleanMessageContent(msg.content));

        // Add current input if it's a request
        if (this.isUserRequest(currentInput)) {
            userRequests.push(currentInput);
        }

        if (userRequests.length === 0) return '';

        return `Current Requirements:\n${userRequests.join('\n\n')}`;
    }
}

// Helper function for easy integration with your existing code
export const getContextualChatHistory = (
    conversation: any, 
    currentInput: string, 
    maxMessages: number = 15
): BaseMessage[] => {
    return ContextualChatCleaner.cleanChatHistoryForCodeContext(
        conversation, 
        currentInput, 
        {
            maxMessages,
            prioritizeCodeEvolution: true,
            includeUserRequests: true,
            includeCodeExplanations: true
        }
    );
};

// Advanced function that provides rich context
export const getEnhancedCodeContext = (
    conversation: any, 
    currentInput: string
): {
    chatHistory: BaseMessage[];
    codeEvolution: string;
    requirements: string;
    contextSummary: string;
} => {
    const chatHistory = getContextualChatHistory(conversation, currentInput);
    const codeEvolution = ContextualChatCleaner.getCodeEvolutionContext(conversation);
    const requirements = ContextualChatCleaner.getCurrentRequirementsContext(conversation, currentInput);
    
    const contextSummary = `
Context Summary:
- Chat History: ${chatHistory.length} relevant messages
- Code Evolution: ${codeEvolution ? 'Available' : 'None'}
- Requirements: ${requirements ? 'Available' : 'None'}
- Current Input: ${currentInput.substring(0, 100)}...
    `.trim();

    return {
        chatHistory,
        codeEvolution,
        requirements,
        contextSummary
    };
};