import User from "../models/User.js";
import { configureOpenAI } from "../config/openai-config.js";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { OpenAIApi } from "openai";
import axios from "axios";
// Initialize in-memory message histories
const messageHistories = {};
let sessionChats;
let context = "";
export const generateChatCompletion = async (req, res, next) => {
    const { message, sessionId } = req.body;
    try {
        // Search Elasticsearch based on the user's message
        const elasticSearchQuery = {
            query: {
                multi_match: {
                    query: message, //base on user prompt to find the correct document
                    fields: ["function_name", "description", "code"]
                }
            }
        };
        const elasticResponse = await axios.post('http://localhost:9200/_search', elasticSearchQuery);
        const hits = elasticResponse.data.hits.hits;
        if (hits.length > 0) {
            const source = hits[0]._source; // Take the first hit (most relevant)
            context = `Function Name: ${source.function_name}. Description: ${source.description}. Parameters: ${source.parameters}. Code: ${source.code}`;
        }
        else {
            context = "No relevant function found in the Elasticsearch index.";
        }
        console.log("context: ", context);
        // Simplified prompt template for debugging
        // Correct prompt template definition with proper escape for single braces
        // Correct prompt template definition using escape sequences
        console.log("sessionChats: ", sessionChats);
        let systemContent = `You are an expert specializing in bug fixing, syntax error correction, and system optimization. Answer only IT-related questions. If it's just a normal greeting, introduction, polite reply normally.`;
        if (context && sessionChats == null) {
            systemContent += `You should base your answer on the given context: {{context}}`;
        }
        else if (context && sessionChats != null) {
            systemContent += `You should base your answer on the given context: {{context}}, if sessionChats related to the current question you can base on it too: {{sessionChats}}`;
        }
        else if (!context && sessionChats !== null) {
            systemContent += `If the question is related to the last one, you can rely on that: {{sessionChats}} to give an answer, otherwise just say "Sorry, I don't have that knowledge"`;
        }
        else {
            systemContent += `There is no relevant context available. `;
        }
        const promptTemplate = ChatPromptTemplate.fromMessages([
            {
                role: "system",
                // content: `You have to base your answers on the given content: {{context}} and you can base on the sessionChats(if it is not null and relevant to the current question): {{sessionChats}} to given the answer. If the Context is not given or the sessionChats is null YOU SHOULD say "Sorry I don't have any knowledge related to your request" DO NOT GIVEN THE ANSWER!!!`
                content: systemContent,
            }
        ]);
        console.log("Context for prompt template:", context);
        console.log("promptTemplate: ", promptTemplate);
        const user = await User.findById(res.locals.jwtData.id);
        if (!user)
            return res.status(401).json({ message: "User not registered OR Token malfunctioned" });
        // Initialize message history for the session if not existing
        if (!messageHistories[sessionId]) {
            messageHistories[sessionId] = new InMemoryChatMessageHistory();
        }
        // console.log("history: ", messageHistories[sessionId]);
        // Grab chats of user
        const chats = user.chats.map(({ role, content }) => ({
            role,
            content,
        }));
        // Push the new user message into the chats
        chats.push({ content: message, role: "user" });
        user.chats.push({ content: message, role: "user" });
        // Retrieve session-specific chat history from memory
        sessionChats = (await messageHistories[sessionId].getMessages()).map(msg => ({
            role: msg instanceof HumanMessage ? "user" : msg instanceof AIMessage ? "assistant" : "system",
            content: msg.content,
        }));
        sessionChats.push({ role: "user", content: message });
        messageHistories[sessionId].addMessage(new HumanMessage(message));
        // Convert promptTemplate messages to ChatCompletionRequestMessage format
        // Properly passing context as a variable
        const promptMessages = await promptTemplate.formatMessages({ context });
        // Map through promptMessages and convert each message to the right type
        const formattedPromptMessages = promptMessages.map((msg) => {
            let role;
            if (msg instanceof HumanMessage) {
                role = "user";
            }
            else if (msg instanceof AIMessage) {
                role = "assistant";
            }
            else if (msg instanceof SystemMessage) {
                role = "system";
            }
            else {
                throw new Error("Unknown message type");
            }
            if (typeof msg.content === 'string') {
                return {
                    role,
                    content: msg.content,
                };
            }
            else {
                throw new Error("Message content is not a string");
            }
        });
        // Merge prompt template messages with user's chats
        const fullMessages = [...sessionChats, ...formattedPromptMessages];
        // Send fullMessages to OpenAI API
        const config = configureOpenAI();
        const openai = new OpenAIApi(config);
        const chatResponse = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: fullMessages,
        });
        console.log("OpenAI response:", chatResponse.data);
        // Process response (for example, saving the assistant response)
        const assistantMessage = chatResponse.data.choices[0].message?.content;
        // if(!context && !sessionChats || assistantMessage.includes("Sorry I don't have any knowledge related to your request")) {
        //   return res.json({ response: "Sorry I don't have any knowledge related to your request" });
        // }
        user.chats.push({ content: assistantMessage, role: "assistant" });
        await user.save();
        return res.json({ response: assistantMessage });
    }
    catch (error) {
        next(error);
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
        console.log(user);
        return res.status(200).json({ message: "OK", chats: user.chats });
    }
    catch (error) {
        console.log(error);
        return res.status(200).json({ message: "ERROR", cause: error.message });
    }
};
export const deleteChats = async (req, res, next) => {
    try {
        // User token check
        const user = await User.findById(res.locals.jwtData.id);
        if (!user) {
            return res.status(401).send("User not registered OR Token malfunctioned");
        }
        if (user._id.toString() !== res.locals.jwtData.id) {
            return res.status(401).send("Permissions didn't match");
        }
        // Retrieve the sessionId from the request body or query parameters
        const { sessionId } = req.body; // Assuming sessionId is passed in the body
        // Check if the sessionId exists in messageHistories and delete it
        if (messageHistories[sessionId]) {
            messageHistories[sessionId].clear();
            console.log(`Session chats for sessionId: ${sessionId} have been deleted.`);
        }
        sessionChats = [];
        console.log("sessionChats: ", sessionChats);
        // Clear the user's chat history
        //@ts-ignore
        user.chats = [];
        await user.save();
        return res.status(200).json({ message: "OK" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "ERROR", cause: error.message });
    }
};
//# sourceMappingURL=chat-controllers.js.map