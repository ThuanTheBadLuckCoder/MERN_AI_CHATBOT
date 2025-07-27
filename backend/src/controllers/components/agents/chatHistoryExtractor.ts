// Step 1: Create chatHistoryExtractor.ts in your project
// This file contains the utility functions for cleaning chat history

import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

/**
 * Chat History Extractor for your existing User.ts and custom-agent.ts integration
 */
export class ChatHistoryExtractor {
    
    /**
     * Extract clean chat history from your MongoDB conversation data
     * Removes all metadata, references, timestamps to save tokens
     */
    static extractCleanHistory(conversation: any, options: any = {}): BaseMessage[] {
        const {
            maxMessages = 10,
            excludeGreetings = true,
            minContentLength = 10
        } = options;

        if (!conversation || !conversation.messages || conversation.messages.length === 0) {
            return [];
        }

        // Get recent messages and filter them
        const recentMessages = conversation.messages
            .slice(-maxMessages * 2) // Get more initially for filtering
            .filter((message: any) => this.shouldIncludeMessage(message, {
                excludeGreetings, 
                minContentLength
            }))
            .slice(-maxMessages); // Take final maxMessages after filtering

        // Convert to LangChain message format
        return recentMessages.map((message: any) => this.convertToLangChainMessage(message));
    }

    /**
     * Remove all metadata and system notes from message content
     */
    static extractCleanContent(message: any): string {
        if (!message || !message.content) {
            return '';
        }

        let content = message.content;

        // Remove system notes and metadata
        content = content.replace(/\[System Note:.*?\]/g, '');
        content = content.replace(/\[SYSTEM WARNING:.*?\]/g, '');
        content = content.replace(/\[CRITICAL SYSTEM.*?\]/g, '');
        content = content.replace(/\[Note:.*?\]/g, '');
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
        content = content.replace(/\(References used:.*?\)/g, '');
        content = content.replace(/References:[\s\S]*?(?=\n\n|$)/g, '');
        content = content.replace(/\(Generated at:.*?\)/g, '');
        content = content.replace(/Last updated:.*?\n/g, '');
        content = content.replace(/DEBUG:.*?\n/g, '');
        content = content.replace(/✅.*?\n/g, '');
        content = content.replace(/❌.*?\n/g, '');
        content = content.replace(/📊.*?\n/g, '');

        // Clean up extra whitespace
        content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
        content = content.trim();

        return content;
    }

    /**
     * Check if message should be included in chat history
     */
    static shouldIncludeMessage(message: any, options: any = {}): boolean {
        const {
            excludeGreetings = true,
            minContentLength = 10
        } = options;

        // Always include user and assistant messages
        if (message.role === 'user' || message.role === 'assistant') {
            
            // Check content length
            const cleanContent = this.extractCleanContent(message);
            if (cleanContent.length < minContentLength) {
                return false;
            }

            // Check for greetings if exclusion is enabled
            if (excludeGreetings && this.isGreetingOrThanks(cleanContent)) {
                return false;
            }

            return true;
        }

        return false;
    }

    /**
     * Check if message is a greeting or thanks
     */
    static isGreetingOrThanks(content: string): boolean {
        const lowerContent = content.toLowerCase();
        
        const greetingPatterns = [
            /^(hi|hello|hey|greetings|good morning|good afternoon|good evening)\b/,
            /^how are you/,
            /^what's up/
        ];

        const thanksPatterns = [
            /thank you/,
            /thanks/,
            /appreciate/,
            /grateful/
        ];

        return greetingPatterns.some(pattern => pattern.test(lowerContent)) ||
               thanksPatterns.some(pattern => pattern.test(lowerContent));
    }

    /**
     * Convert MongoDB message to LangChain message format
     */
    static convertToLangChainMessage(message: any): BaseMessage {
        const cleanContent = this.extractCleanContent(message);

        switch (message.role) {
            case 'user':
                return new HumanMessage({
                    content: cleanContent
                });
            case 'assistant':
                return new AIMessage({
                    content: cleanContent
                });
            case 'system':
                return new SystemMessage({
                    content: cleanContent
                });
            default:
                return new HumanMessage({
                    content: cleanContent
                });
        }
    }

    /**
     * Estimate token count (rough approximation)
     */
    static estimateTokenCount(messages: BaseMessage[]): number {
        // Rough estimation: 1 token ≈ 4 characters
        const totalChars = messages.reduce((acc, msg) => acc + msg.content.length, 0);
        return Math.ceil(totalChars / 4);
    }

    /**
     * Trim messages to fit within token limits
     */
    static trimToTokenLimit(messages: BaseMessage[], maxTokens: number = 4000): BaseMessage[] {
        let currentTokens = this.estimateTokenCount(messages);
        
        if (currentTokens <= maxTokens) {
            return messages;
        }

        let trimmedMessages = [...messages];
        
        while (currentTokens > maxTokens && trimmedMessages.length > 1) {
            trimmedMessages.shift(); // Remove oldest message
            currentTokens = this.estimateTokenCount(trimmedMessages);
        }

        return trimmedMessages;
    }
}

// Helper function for easy integration
export const getCleanChatHistory = (conversation: any, maxMessages: number = 10, maxTokens: number = 4000): BaseMessage[] => {
    const cleanHistory = ChatHistoryExtractor.extractCleanHistory(conversation, {
        maxMessages,
        excludeGreetings: true,
        minContentLength: 10
    });

    return ChatHistoryExtractor.trimToTokenLimit(cleanHistory, maxTokens);
};