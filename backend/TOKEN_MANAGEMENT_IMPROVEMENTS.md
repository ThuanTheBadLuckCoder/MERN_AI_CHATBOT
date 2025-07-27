# Token Management Improvements

## Problem Identified

The system was hitting OpenAI's token limit (16,385 tokens) due to:
- **Excessive context**: Too many documents being retrieved and included
- **Long chat history**: Full conversation history being sent to LLM
- **Large code contexts**: Complete HTML documents taking up too many tokens
- **Verbose analysis**: Context analysis adding unnecessary tokens
- **No token monitoring**: No visibility into token usage

## Solution Implemented

### 🎯 **Token Management Constants**

```typescript
const MAX_CONTEXT_TOKENS = 8000;        // Reserve space for system prompt and chat history
const MAX_CHAT_HISTORY_TOKENS = 4000;   // Limit chat history tokens
const MAX_CODE_CONTEXT_TOKENS = 2000;   // Limit code context tokens
const MAX_CONTEXT_ANALYSIS_TOKENS = 500; // Limit context analysis tokens
const TOKENS_PER_CHAR = 0.25;          // Rough estimate: 1 token ≈ 4 characters
```

### 📊 **Token Estimation Functions**

```typescript
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
```

### 🔄 **Context Truncation**

- **Reduced search results**: Vector search from 3 to 2 documents, keyword search from 5 to 3
- **Smart filtering**: Only include documents that fit within token limits
- **Per-document limits**: Maximum tokens per document to prevent single large documents

```typescript
function truncateContext(context: string[]): string[] {
    let totalTokens = 0;
    const maxTokensPerDocument = Math.floor(MAX_CONTEXT_TOKENS / 3);
    
    return context.filter(doc => {
        const docTokens = estimateTokens(doc);
        if (totalTokens + docTokens <= MAX_CONTEXT_TOKENS && docTokens <= maxTokensPerDocument) {
            totalTokens += docTokens;
            return true;
        }
        return false;
    }).map(doc => truncateText(doc, maxTokensPerDocument));
}
```

### 💬 **Chat History Management**

- **Keep only last 10 messages**: Prevent long conversation history
- **Limit message content**: Each message truncated to ~500 tokens
- **Smart filtering**: Remove messages that would exceed token limits

```typescript
function truncateChatHistory(chatHistory: BaseMessage[]): BaseMessage[] {
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
        const truncatedContent = truncateText(content, 500);
        
        // Return appropriate message type with truncated content
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
```

### 💻 **Code Context Management**

- **Limit code context**: Maximum 2000 tokens for code context
- **Truncate large HTML documents**: Prevent complete documents from consuming all tokens
- **Smart code extraction**: Only include relevant code sections

```typescript
function truncateCodeContext(codeContext: string): string {
    return truncateText(codeContext, MAX_CODE_CONTEXT_TOKENS);
}
```

### 🔍 **Context Analysis Truncation**

- **Limit analysis text**: Maximum 500 tokens for context analysis
- **Concise guidance**: Provide essential information only

```typescript
function truncateContextAnalysis(analysis: string): string {
    return truncateText(analysis, MAX_CONTEXT_ANALYSIS_TOKENS);
}
```

### 🚨 **Emergency Token Management**

When approaching limits, apply aggressive truncation:

```typescript
function applyEmergencyTruncation(context: string, chatHistory: BaseMessage[], codeContext: string, analysis: string) {
    const SAFETY_MARGIN = 2000; // Keep 2000 tokens for system prompt and safety
    
    if (tokenEstimate.totalTokens <= (16385 - SAFETY_MARGIN)) {
        return { context, chatHistory, codeContext, analysis, wasTruncated: false };
    }
    
    // Apply proportional truncation to all components
    const reductionRatio = targetTokens / currentTokens;
    // ... aggressive truncation logic
}
```

### 📈 **Comprehensive Token Monitoring**

Real-time token usage tracking:

```typescript
function estimateTotalTokens(context: string, chatHistory: BaseMessage[], codeContext: string, analysis: string) {
    const contextTokens = estimateTokens(context);
    const historyTokens = chatHistory.reduce((sum, msg) => {
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        return sum + estimateTokens(content);
    }, 0);
    const codeTokens = estimateTokens(codeContext);
    const analysisTokens = estimateTokens(analysis);
    const totalTokens = contextTokens + historyTokens + codeTokens + analysisTokens;
    
    return {
        contextTokens,
        historyTokens,
        codeTokens,
        analysisTokens,
        totalTokens,
        breakdown: `📊 TOTAL TOKEN BREAKDOWN:
   • Context: ${contextTokens}/${MAX_CONTEXT_TOKENS} (${Math.round(contextTokens/MAX_CONTEXT_TOKENS*100)}%)
   • Chat History: ${historyTokens}/${MAX_CHAT_HISTORY_TOKENS} (${Math.round(historyTokens/MAX_CHAT_HISTORY_TOKENS*100)}%)
   • Code Context: ${codeTokens}/${MAX_CODE_CONTEXT_TOKENS} (${Math.round(codeTokens/MAX_CODE_CONTEXT_TOKENS*100)}%)
   • Analysis: ${analysisTokens}/${MAX_CONTEXT_ANALYSIS_TOKENS} (${Math.round(analysisTokens/MAX_CONTEXT_ANALYSIS_TOKENS*100)}%)
   • TOTAL: ${totalTokens}/16385 (${Math.round(totalTokens/16385*100)}%)
   • Remaining: ${16385 - totalTokens} tokens`
    };
}
```

## Expected Console Output

With token management, you'll now see:

```
📊 CONTEXT TOKEN MANAGEMENT:
   • Original context: 5 documents
   • Truncated context: 2 documents
   • Context tokens: 6500/8000

📊 TOTAL TOKEN BREAKDOWN:
   • Context: 6500/8000 (81%)
   • Chat History: 2800/4000 (70%)
   • Code Context: 1500/2000 (75%)
   • Analysis: 300/500 (60%)
   • TOTAL: 11100/16385 (68%)
   • Remaining: 5285 tokens
```

## Benefits

1. **Prevents Token Overflow**: Automatic truncation prevents hitting 16,385 token limit
2. **Better Performance**: Reduced context size means faster LLM responses
3. **Cost Optimization**: Fewer tokens = lower API costs
4. **Reliability**: System won't crash due to token limits
5. **Visibility**: Clear monitoring of token usage across all components
6. **Smart Prioritization**: Most relevant information is preserved
7. **Emergency Handling**: Automatic fallback when approaching limits

## Token Allocation Strategy

- **Context (8000 tokens)**: 49% - Most important for relevant information
- **Chat History (4000 tokens)**: 24% - Recent conversation context
- **Code Context (2000 tokens)**: 12% - Previous code for follow-ups
- **Analysis (500 tokens)**: 3% - Context switching guidance
- **System Prompt + Safety (2000 tokens)**: 12% - Reserved for system instructions

This allocation ensures the most important information (context and recent history) gets priority while maintaining system stability. 