import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import mongoose from "mongoose";
import User from "../../../models/User.js"; // Assuming your model is exported from this path
import { model } from "../../../config/gemini-config.js";
// Initialize MongoDB connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("MongoDB connected successfully");
    }
    catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
};
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
 * Get the 10 most recent messages from a user's last active conversation
 * @param {string} userId - The ID of the user
 * @returns {Array} - Array of message objects
 */
async function getRecentMessages(userId) {
    try {
        // Find user and get their most recently updated conversation
        const user = await User.findById(userId)
            .select('conversations')
            .sort({ 'conversations.updatedAt': -1 })
            .lean();
        if (!user || !user.conversations || user.conversations.length === 0) {
            return [];
        }
        // Get the most recent conversation
        const recentConversation = user.conversations[0];
        // Get the 10 most recent messages or all if fewer than 10
        const recentMessages = recentConversation.messages
            .slice(-10)
            .map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.createdAt
        }));
        return recentMessages;
    }
    catch (error) {
        console.error("Error retrieving recent messages:", error);
        return [];
    }
}
/**
 * Format messages for the prompt
 * @param {Array} messages - Array of message objects
 * @returns {string} - Formatted messages as a string
 */
function formatMessagesForPrompt(messages) {
    return messages.map((msg, index) => {
        const timestamp = new Date(msg.timestamp).toLocaleString();
        return `Message ${index + 1} [${msg.role}] (${timestamp}): ${msg.content}`;
    }).join('\n\n');
}
/**
 * Determine if a question is new or a follow-up
 * @param {string} userId - The ID of the user
 * @param {string} question - The current question to classify
 * @returns {Promise<string>} - Either "new-question" or "old-question"
 */
export async function classifyQuestion(userId, question) {
    try {
        // Connect to database if not already connected
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        // Get recent messages
        const recentMessages = await getRecentMessages(userId);
        const formattedMessages = formatMessagesForPrompt(recentMessages);
        // Run the classification chain
        const result = await classificationChain.invoke({
            recentMessages: formattedMessages,
            currentQuestion: question
        });
        // Validate and return result
        const cleanResult = result.trim().toLowerCase();
        console.log("cleanResult: ", cleanResult);
        if (cleanResult === "old-question" || cleanResult === "new-question" || cleanResult === "greeting" || cleanResult === "thank-you") {
            return cleanResult;
        }
        else {
            console.warn("Unexpected classification result:", result);
            return "new-question"; // Default to new-question if unexpected result
        }
    }
    catch (error) {
        console.error("Error classifying question:", error);
        return "new-question"; // Default to new-question on error
    }
}
//# sourceMappingURL=agent-classification.js.map