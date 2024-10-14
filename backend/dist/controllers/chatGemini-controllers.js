import User from "../models/User.js";
import { model } from "../config/gemini-config.js";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { queryVectorStore } from "./components/elastic-controller.js";
// let messageHistories: Record<string, InMemoryChatMessageHistory> = {};
export const generateChatCompletion = async (req, res, next) => {
    const { message } = req.body;
    const context = await queryVectorStore(req, res, next, message);
    console.log("given_context: ", context);
    try {
        const user = await User.findById(res.locals.jwtData.id);
        if (!user) {
            return res.status(401).json({ message: "User not registered OR Token malfunctioned" });
        }
        const prompt = ChatPromptTemplate.fromMessages([
            [
                "system",
                `You are a ChatBot that ONLY supports IT users. You can reply to greetings as usual. 
          You must answer BASED ON the given context: {context}.
          Check for spelling errors, IF message is incorrect based on context, 
          based on the context return ask the user 
          if this is what the user meant? else just answer base on context`,
            ],
            ["human", "{input}"],
        ]);
        const chain = prompt.pipe(model);
        const response = await chain.invoke({
            context: `${context}`,
            input: `${message}`
        });
        // grab chats of user
        const chats = user.chats.map(({ role, content }) => ({
            role,
            content,
        }));
        chats.push({ content: message, role: "user" });
        user.chats.push({ content: message, role: "user" });
        console.log(response);
        user.chats.push({ content: response.content, role: "assistant" });
        await user.save();
        return res.status(200).json({ chats: user.chats });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};
//# sourceMappingURL=chatGemini-controllers.js.map