import { model } from "../../../config/gemini-config.js";
import { AIMessageChunk } from "@langchain/core/messages";
import { Client } from "@elastic/elasticsearch";
import { config } from "../../../config/elastic-config.js";
import { queryVectorStore } from "../elastic-controller.js";
const clientArgs = {
    client: new Client(config),
    indexName: process.env.ELASTIC_INDEX ?? `*`,
};
// Create prompt template for determining question type
export async function retrieverGemini(req, res, next, question) {
    const context = await queryVectorStore(req, res, next, question);
    try {
        // Create a prompt for the greeting
        let prompt = "";
        prompt = `
      You are a specialized frontend development AI assistant.
        
        USER QUESTION: ${question}
        GIVEN CONTEXT: ${context}
        
        INSTRUCTIONS:
        1. Answer ONLY if the question is about frontend development (HTML, CSS, JavaScript, web frameworks, etc.)
        2. For all other topics, respond with "I can only help with frontend development questions."
        3. For all questions related to Frontend Development, you are required to think based on context, absolutely DO NOT arbitrarily provide any information outside the context being answered.
        4. Acknowledge that you don't have specific information from your knowledge base about this
        5. Provide a general, helpful answer if the question is about common frontend topics
        6. Format code with appropriate syntax highlighting using markdown
        7. If you truly don't know or there are no given context, say "I don't have specific information about this in my knowledge base."
        8. If there appears to be a spelling mistake in the user's question, seek clarification
        
        ANSWER:
      `;
        console.log("promptGemini: ", prompt);
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
//# sourceMappingURL=agent-contextcomm.js.map