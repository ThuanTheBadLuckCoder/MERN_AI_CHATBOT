import User from "../models/User.js";
import { model } from "../config/openai-config.js";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { queryVectorStore } from "./components/elastic-controller.js";
import { executor } from "./components/agents/custom-agent.js";
export const generateChatCompletion = async (req, res, next) => {
    const { message } = req.body;
    console.log("message: ", message);
    try {
        const user = await User.findById(res.locals.jwtData.id);
        const context = await queryVectorStore(req, res, next, message);
        const filterMessages = (input) => input.chat_history.slice(-1);
        if (!user) {
            return res.status(401).json({ message: "User not registered OR Token malfunctioned" });
        }
        const chatHistory = user.chats
            .filter((message) => message.role === 'user' || message.role === 'assistant') // Lọc các tin nhắn có role là 'user' hoặc 'assistant'
            .map((message) => {
            if (message.role === 'user') {
                return new HumanMessage({ content: message.content });
            }
            else if (message.role === 'assistant') {
                return new AIMessage({ content: message.content });
            }
        });
        const chats = user.chats.map(({ role, content }) => ({
            role,
            content,
        }));
        chats.push({ content: message, role: "user" });
        user.chats.push({ content: message, role: "user" });
        const input = message;
        const responseAgent = await executor.invoke({
            input,
            chat_history: chatHistory,
            model,
        });
        console.log("responseAgent: ", responseAgent);
        user.chats.push({ content: responseAgent.output, role: "assistant" });
        await user.save();
        return res.status(200).json({ chats: user.chats });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};
export const sendChatsToUser = async (req, res, next) => {
    try {
        //user token check
        const user = await User.findById(res.locals.jwtData.id);
        if (!user) {
            return res.status(401).send("User not registered OR Token malfunctioned");
        }
        if (user._id.toString() !== res.locals.jwtData.id) {
            return res.status(401).send("Permissions didn't match");
        }
        return res.status(200).json({ message: "OK", chats: user.chats });
    }
    catch (error) {
        console.log(error);
        return res.status(200).json({ message: "ERROR", cause: error.message });
    }
};
export const deleteChats = async (req, res, next) => {
    try {
        //user token check
        const user = await User.findById(res.locals.jwtData.id);
        if (!user) {
            return res.status(401).send("User not registered OR Token malfunctioned");
        }
        if (user._id.toString() !== res.locals.jwtData.id) {
            return res.status(401).send("Permissions didn't match");
        }
        //@ts-ignore
        user.chats = [];
        await user.save();
        return res.status(200).json({ message: "OK" });
    }
    catch (error) {
        console.log(error);
        return res.status(200).json({ message: "ERROR", cause: error.message });
    }
};
//# sourceMappingURL=chat-controllers.js.map