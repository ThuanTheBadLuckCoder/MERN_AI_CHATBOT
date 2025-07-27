import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { model } from "../../../config/gemini-config.js";
import { AIMessageChunk } from "@langchain/core/messages";
// Create prompt template for determining question type
const promptTemplate = PromptTemplate.fromTemplate(`
You are an AI assistant that analyzes chat history and determines if a new message is a new question or a follow-up question.

Recent chat history (10 most recent messages):
{recentMessages}

Current question: {currentQuestion}

Classification rules:
1. If the current question is directly related to previous messages or requests clarification, label it as "old question".
2. If the current question introduces a completely new topic that has not been discussed in recent messages, label it as "new question".
3. If it is a greeting, label it as "greeting". And if it is a thank-you from the user, label it as "thank-you".

Respond with ONLY one of these four labels: "old-question" or "new-question" or "greeting" or "thank-you"
`);
// Create the chain
const classificationChain = promptTemplate
    .pipe(model)
    .pipe(new StringOutputParser());
/**
 * Respond to greeting or thank you messages
 * @param {string} question - The user's message
 * @returns {Promise<string>} - The response message
 */
export async function simpleGreetingThankYou(question) {
    try {
        // Create a prompt for the greeting
        let prompt = "";
        prompt = `You are responding to a greeting: "${question}". Keep it brief and natural.`;
        // Generate the response using the model and extract the string content
        const response = await model.invoke(prompt);
        // Extract the text content from the AIMessageChunk
        if (typeof response === 'string') {
            return response;
        }
        else if (response instanceof AIMessageChunk) {
            // Extract text from AIMessageChunk
            if (Array.isArray(response.content)) {
                // If content is an array of objects with text property
                return response.content
                    .filter(item => item.type === 'text')
                    .map(item => item.text)
                    .join(' ');
            }
            else if (typeof response.content === 'string') {
                // If content is a string
                return response.content;
            }
        }
        // Fallback in case the response format is unexpected
        return "I'm here to help. What can I do for you?";
    }
    catch (error) {
        console.error("Error in simpleGreetingThankYou function:", error);
        return "I'm having trouble processing your message right now. Please try again later.";
    }
}
// Alternative implementation using StringOutputParser for direct string output
export async function improvedGreetingThankYou(question) {
    try {
        // Identify if the message is a greeting or thank you
        const isGreeting = /^(hi|hello|hey|good\s(morning|afternoon|evening)|greetings)/i.test(question);
        const isThanks = /^(thank|thanks|appreciate|grateful)/i.test(question);
        if (!isGreeting && !isThanks) {
            return null; // Not a greeting or thanks
        }
        // Create a prompt template
        let promptText = "";
        if (isGreeting) {
            promptText = `
        You are responding to a greeting: "{message}". 
        Give a warm, friendly greeting appropriate for the current time.
        Keep it brief and natural.
      `;
        }
        else {
            promptText = `
        You are responding to a thank you message: "{message}".
        Give a warm, friendly acknowledgment.
        Keep it brief and natural.
      `;
        }
        // Create a prompt template and chain with string output parser
        const greetingPrompt = PromptTemplate.fromTemplate(promptText);
        const outputParser = new StringOutputParser();
        const chain = greetingPrompt.pipe(model).pipe(outputParser);
        // This will return a string directly
        const response = await chain.invoke({
            message: question
        });
        return response;
    }
    catch (error) {
        console.error("Error in improvedGreetingThankYou function:", error);
        return "I'm having trouble processing your message right now. Please try again later.";
    }
}
//# sourceMappingURL=agent-basicomm.js.map