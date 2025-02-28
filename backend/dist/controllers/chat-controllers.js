import User from "../models/User.js";
import { model } from "../config/openai-config.js";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { queryVectorStore } from "./components/elastic-controller.js";
import { executor } from "./components/agents/custom-agent.js";
// export const generateChatCompletion = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const { message } = req.body;
//   console.log("message: ", message);
//   try {
//     const user = await User.findById(res.locals.jwtData.id);
//     const context = await queryVectorStore(req, res, next, message);
//     type ChainInput = {
//       chat_history: BaseMessage[];
//       input: string;
//       given_context: string[];
//     };
//     const filterMessages = (input: ChainInput) => input.chat_history.slice(-1);
//     if (!user) {
//       return res.status(401).json({ message: "User not registered OR Token malfunctioned" });
//     }
//     const chatHistory = user.chats
//       .filter((message) => message.role === 'user' || message.role === 'assistant') // Lọc các tin nhắn có role là 'user' hoặc 'assistant'
//       .map((message) => {
//         if (message.role === 'user') {
//           return new HumanMessage({ content: message.content });
//         } else if (message.role === 'assistant') {
//           return new AIMessage({ content: message.content });
//         }
//       });
//     const chats = user.chats.map(({ role, content }) => ({
//       role,
//       content,
//     })) as ChatCompletionRequestMessage[];
//     chats.push({ content: message, role: "user" });
//     user.chats.push({ content: message, role: "user" });
//     const input = message;
//     const responseAgent = await executor.invoke({
//       input,
//       chat_history: chatHistory,
//       model,
//     });
//     console.log("responseAgent: ", responseAgent); 
//     user.chats.push({ content: responseAgent.output, role: "assistant" })
//     await user.save();
//     return res.status(200).json({ chats: user.chats });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ message: "Something went wrong" });
//   }
// };
// export const generateChatGeminiCompletion = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { message } = req.body;
//     // Validate input
//     if (typeof message !== "string" || !message.trim()) {
//       return res
//         .status(400)
//         .json({ message: "Invalid input: 'message' should be a non-empty string" });
//     }
//     // Retrieve context using vector store
//     const context = await queryVectorStore(req, res, next, message);
//     console.log("Given context: ", context);
//     // Fetch user information
//     const user = await User.findById(res.locals.jwtData?.id);
//     if (!user) {
//       return res
//         .status(401)
//         .json({ message: "Unauthorized: User not found or token is invalid" });
//     }
//     // Prepare chat history
//     const chatHistory = user.chats
//       .filter((msg) => ["user", "assistant"].includes(msg.role)) // Only include relevant roles
//       .map((msg) => {
//         if (msg.role === "user") {
//           return new HumanMessage({ content: msg.content || "" });
//         }
//         if (msg.role === "assistant") {
//           return new AIMessage({ content: msg.content || "" });
//         }
//         return null; // Fallback in case of an invalid role
//       })
//       .filter(Boolean); // Remove null values
//     // Build the chat prompt
//     const prompt = ChatPromptTemplate.fromMessages([
//       [
//         "system",
//         `You are a ChatBot that supports Front-end Development users only, DO NOT ANSWER AN QUESTION DID NOT RELATED TO FRONT-END DEVELOPER,
//         JUST SAY "I DON'T KNOW"        
//         . You can reply to greetings as usual.
//          You must answer BASED ON the given context: {context}.
//          If the message is incorrect or unclear based on the context, ask the user for clarification.
//          Otherwise, respond accurately based on the context.`,
//       ],
//       ["human", "{input}"],
//     ]);
//     // Add the current message to chat history
//     const input = message.trim();
//     user.chats.push({ content: input, role: "user" });
//     // Generate response using the executor
//     const responseAgent = await executor.invoke({
//       input,
//       chat_history: chatHistory,
//       model,
//     });
//     // const responseSearchAgent = await googleGemini.invoke({
//     //   input,
//     //   chat_history: chatHistory,
//     //   model,
//     // });
//     // Extract response content
//     const responseContent =
//       JSON.parse(responseAgent.output)?.kwargs?.content || "No valid response generated.";
//     // console.log("Response content: ", responseContent);
//     // Add assistant's response to chat history
//     user.chats.push({ content: responseContent, role: "assistant" });
//     await user.save();
//     // Return updated chat history
//     return res.status(200).json({ chats: user.chats });
//   } catch (error) {
//     console.error("Error in generateChatCompletion: ", error);
//     return res.status(500).json({ message: "Something went wrong", error: error.message });
//   }
// };
export const generateChatGeminiMultiCompletion = async (req, res, next) => {
    try {
        const { message, conversationId } = req.body;
        console.log("Frontend: ", message, conversationId);
        // Validate input
        if (typeof message !== "string" || !message.trim()) {
            return res
                .status(400)
                .json({ message: "Invalid input: 'message' should be a non-empty string" });
        }
        // Retrieve context using vector store
        const context = await queryVectorStore(req, res, next, message);
        console.log("Given context: ", context);
        // Fetch user information
        const user = await User.findById(res.locals.jwtData?.id);
        if (!user) {
            return res
                .status(401)
                .json({ message: "Unauthorized: User not found or token is invalid" });
        }
        // Find the existing conversation or create a new one
        let conversation = null;
        let conversationIndex = -1;
        if (conversationId) {
            conversationIndex = user.conversations.findIndex(conv => conv.id === conversationId);
            if (conversationIndex === -1) {
                return res.status(404).json({ message: "Conversation not found" });
            }
            conversation = user.conversations[conversationIndex];
        }
        // If no conversationId was provided, create a new conversation before proceeding
        if (!conversation) {
            conversation = {
                // id: randomUUID(), // Ensure new conversations get an ID
                title: message.slice(0, 30) + (message.length > 30 ? "..." : ""), // Create title from first message
                messages: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };
            user.conversations.push(conversation);
            conversationIndex = user.conversations.length - 1;
        }
        // Prepare chat history from the specific conversation
        const chatHistory = conversation.messages
            .filter((msg) => ["user", "assistant"].includes(msg.role))
            .map((msg) => {
            if (msg.role === "user") {
                return new HumanMessage({ content: msg.content || "" });
            }
            if (msg.role === "assistant") {
                return new AIMessage({ content: msg.content || "" });
            }
            return null;
        })
            .filter(Boolean);
        // Build the chat prompt
        const prompt = ChatPromptTemplate.fromMessages([
            [
                "system",
                `You are a ChatBot that supports Front-end Development users only, DO NOT ANSWER ANY QUESTION NOT RELATED TO FRONT-END DEVELOPMENT.
        JUST SAY "I DON'T KNOW".
        You can reply to greetings as usual.
        You must answer BASED ON the given context: {context}.
        If the message is incorrect or unclear based on the context, ask the user for clarification.
        Otherwise, respond accurately based on the context.`,
            ],
            ["human", "{input}"],
        ]);
        // Add the current message to conversation messages
        const input = message.trim();
        const userMessage = {
            // id: randomUUID(),
            content: input,
            role: "user",
            createdAt: new Date()
        };
        // Use Mongoose array methods to ensure middleware triggers
        user.conversations[conversationIndex].messages.push(userMessage);
        // Save the updated user document before invoking the model
        await user.save();
        // Generate response using the executor
        const responseAgent = await executor.invoke({
            input,
            chat_history: chatHistory,
            model,
        });
        // Extract response content
        let responseContent;
        try {
            // Try to parse as JSON first
            const parsedOutput = JSON.parse(responseAgent.output);
            responseContent = parsedOutput?.kwargs?.content || "No valid response generated.";
        }
        catch (e) {
            // If not JSON, use the raw output
            responseContent = responseAgent.output || "No valid response generated.";
        }
        // Add assistant's response to conversation messages
        const assistantMessage = {
            // id: randomUUID(),
            content: responseContent,
            role: "assistant",
            createdAt: new Date()
        };
        // Use Mongoose array methods to ensure middleware triggers
        user.conversations[conversationIndex].messages.push(assistantMessage);
        // If this is a new conversation and we need a better title
        if (!conversationId && conversation.title.includes("...")) {
            user.conversations[conversationIndex].title = input.slice(0, 30) + (input.length > 30 ? "..." : "");
        }
        // Explicitly set the updatedAt field on the conversation to ensure it's updated
        user.conversations[conversationIndex].updatedAt = new Date();
        // Save the updated user document
        await user.save();
        // Return the updated conversation
        return res.status(200).json({
            conversation: {
                id: user.conversations[conversationIndex].id,
                title: user.conversations[conversationIndex].title,
                messages: user.conversations[conversationIndex].messages,
                createdAt: user.conversations[conversationIndex].createdAt,
                updatedAt: user.conversations[conversationIndex].updatedAt
            }
        });
    }
    catch (error) {
        console.error("Error in generateChatCompletion: ", error);
        return res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};
export const sendChatsToUser = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        console.log("Conversation ID:", conversationId); // Debugging
        // Check user token
        const user = await User.findById(res.locals.jwtData.id);
        if (!user) {
            return res.status(401).json({ message: "User not registered OR Token malfunctioned" });
        }
        if (user._id.toString() !== res.locals.jwtData.id) {
            return res.status(403).json({ message: "Permissions didn't match" });
        }
        // Fetch chats based on conversationId and userId
        const chats = user.conversations.find((conv) => conv.id === conversationId);
        if (!chats) {
            return res.status(404).json({ message: "No chats found for this conversation" });
        }
        console.log(chats);
        // if (!chats.length) {
        //   return res.status(404).json({ message: "No chats found for this conversation" });
        // }
        return res.status(200).json({ message: "OK", chats: chats.messages });
    }
    catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ message: "ERROR", cause: error.message });
    }
};
// export const deleteChats = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     //user token check
//     const user = await User.findById(res.locals.jwtData.id);
//     if (!user) {
//       return res.status(401).send("User not registered OR Token malfunctioned");
//     }
//     if (user._id.toString() !== res.locals.jwtData.id) {
//       return res.status(401).send("Permissions didn't match");
//     }
//     //@ts-ignore
//     user.chats = [];
//     await user.save();
//     return res.status(200).json({ message: "OK" });
//   } catch (error) {
//     console.log(error);
//     return res.status(200).json({ message: "ERROR", cause: error.message });
//   }
// };
export const sendConservationsToUser = async (req, res, next) => {
    try {
        // User token check
        const user = await User.findById(res.locals.jwtData.id);
        if (!user) {
            return res.status(401).send("User not registered OR Token malfunctioned");
        }
        if (user._id.toString() !== res.locals.jwtData.id) {
            return res.status(401).send("Permissions didn't match");
        }
        return res.status(200).json({ message: "OK", conversations: user.conversations });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "ERROR", cause: error.message });
    }
};
export const deleteChats = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        console.log("Deleting conversation with ID:", conversationId);
        // User token check
        const user = await User.findById(res.locals.jwtData.id);
        if (!user) {
            return res.status(401).send("User not registered OR Token malfunctioned");
        }
        if (user._id.toString() !== res.locals.jwtData.id) {
            return res.status(401).send("Permissions didn't match");
        }
        if (!conversationId) {
            // If no conversationId is provided, clear all conversations
            user.conversations.splice(0, user.conversations.length);
        }
        else {
            // Find the index of the conversation with the provided ID
            const conversationIndex = user.conversations.findIndex((conv) => conv.id === conversationId);
            // If the conversation exists, remove it
            if (conversationIndex !== -1) {
                user.conversations.splice(conversationIndex, 1);
            }
            else {
                return res.status(404).json({ message: "Conversation not found" });
            }
        }
        await user.save();
        return res.status(200).json({ message: "Conversation deleted successfully" });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "ERROR", cause: error.message });
    }
};
//# sourceMappingURL=chat-controllers.js.map