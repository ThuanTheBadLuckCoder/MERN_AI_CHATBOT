import User from "../models/User.js";
import { model } from "../config/openai-config.js";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnablePassthrough, RunnableSequence, } from "@langchain/core/runnables";
import { queryVectorStore } from "./webloader-controllers.js";
// let messageHistories: Record<string, InMemoryChatMessageHistory> = {};
export const generateChatCompletion = async (req, res, next) => {
    const { message } = req.body;
    console.log("message: ", message);
    try {
        const user = await User.findById(res.locals.jwtData.id);
        const context = await queryVectorStore(req, res, next, message);
        const filterMessages = (input) => input.chat_history.slice(-10);
        if (!user) {
            return res.status(401).json({ message: "User not registered OR Token malfunctioned" });
        }
        const prompt = ChatPromptTemplate.fromMessages([
            [
                "system",
                `You are a ChatBOT. You must answer BASED ON the given context: {given_context}.
        If there is no context, 
        please just say "I DON'T KNOW!!"`,
            ],
            ["placeholder", "{chat_history}"],
            ["human", message],
        ]);
        console.log("context: ", context);
        // const chain = prompt.pipe(model);
        const chain = RunnableSequence.from([
            RunnablePassthrough.assign({
                chat_history: filterMessages,
                given_context: async () => context,
            }),
            prompt,
            model,
        ]);
        console.log("prompt: ", chain);
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
        // console.log(chatHistory);
        // grab chats of user
        const chats = user.chats.map(({ role, content }) => ({
            role,
            content,
        }));
        chats.push({ content: message, role: "user" });
        user.chats.push({ content: message, role: "user" });
        // push chat response from openAI
        // console.log("chain2: ", chain2);
        const response = await chain.invoke({
            chat_history: chatHistory,
            input: `${message}`,
            given_context: context,
        });
        // const response2 = await ragChain.invoke({
        //   chat_history: chatHistory,
        //   context: await retriever.invoke(`${message}`),
        //   question: `${message}`
        // })
        // const stream = await chain.stream({
        //   chat_history: chatHistory,
        //   input: `${message}`
        // })
        // for await (const chunk of stream) {
        //   console.log("|", chunk.content);
        // }
        user.chats.push({ content: response.content, role: "assistant" });
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