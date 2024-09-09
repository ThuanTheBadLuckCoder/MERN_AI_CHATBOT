import { NextFunction, Request, Response } from "express";
import User from "../models/User.js";
import { configureOpenAI } from "../config/openai-config.js";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { OpenAIApi, ChatCompletionRequestMessage } from "openai";
import client from "@elastic/elasticsearch/lib/client.js";
import axios from "axios";

// Initialize in-memory message histories
const messageHistories: { [key: string]: InMemoryChatMessageHistory } = {};

let context = ""

export const generateChatCompletion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { message, sessionId } = req.body;

  try {
    // Search Elasticsearch based on the user's message
    const elasticSearchQuery = {
      query: {
        match: {
          description: message,
        }
      }
    };

    const elasticResponse = await axios.post('http://localhost:9200/js_functions/_search', elasticSearchQuery);
    const hits = elasticResponse.data.hits.hits;

    if (hits.length > 0) {
      const source = hits[0]._source;  // Take the first hit (most relevant)
      context = `Function Name: ${source.function_name}. Description: ${source.description}. Parameters: ${source.parameters}. Code: ${source.code}`;
    } else {
      context = "No relevant function found in the Elasticsearch index.";
    }

    // Simplified prompt template for debugging
    // Correct prompt template definition with proper escape for single braces
    // Correct prompt template definition using escape sequences
    const promptTemplate = ChatPromptTemplate.fromMessages([
      {
        role: "system",
        content: `You are an expert specializing in bug fixing, syntax error correction, and system optimization. Do not answer questions unrelated to the IT field. You have to base your answers on the given context. If you don't know, JUST say 'I don't know'. This is the given context: {{context}}`
      }
    ]);

    console.log("Context for prompt template:", context);

    const user = await User.findById(res.locals.jwtData.id);
    if (!user)
      return res.status(401).json({ message: "User not registered OR Token malfunctioned" });

    // Initialize message history for the session if not existing
    if (!messageHistories[sessionId]) {
      messageHistories[sessionId] = new InMemoryChatMessageHistory();
    }

    // Grab chats of user
    const chats = user.chats.map(({ role, content }) => ({
      role,
      content,
    })) as ChatCompletionRequestMessage[];

    // Push the new user message into the chats
    chats.push({ content: message, role: "user" });
    user.chats.push({ content: message, role: "user" });

    // Retrieve session-specific chat history from memory
    const sessionChats = (await messageHistories[sessionId].getMessages()).map(msg => ({
      role: msg instanceof HumanMessage ? "user" : msg instanceof AIMessage ? "assistant" : "system",
      content: msg.content,
    })) as ChatCompletionRequestMessage[];

    sessionChats.push({ role: "user", content: message });
    messageHistories[sessionId].addMessage(new HumanMessage(message));

    // Convert promptTemplate messages to ChatCompletionRequestMessage format
    // Properly passing context as a variable
    const promptMessages = await promptTemplate.formatMessages({ context });


    // Map through promptMessages and convert each message to the right type
    const formattedPromptMessages: ChatCompletionRequestMessage[] = promptMessages.map((msg) => {
      let role: "system" | "user" | "assistant";

      if (msg instanceof HumanMessage) {
        role = "user";
      } else if (msg instanceof AIMessage) {
        role = "assistant";
      } else if (msg instanceof SystemMessage) {
        role = "system";
      } else {
        throw new Error("Unknown message type");
      }

      if (typeof msg.content === 'string') {
        return {
          role,
          content: msg.content,
        };
      } else {
        throw new Error("Message content is not a string");
      }
    });

    // Merge prompt template messages with user's chats
    const fullMessages: ChatCompletionRequestMessage[] = [...sessionChats, ...chats, ...formattedPromptMessages];

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
    user.chats.push({ content: assistantMessage, role: "assistant" });
    await user.save();

    return res.json({ response: assistantMessage });
  } catch (error) {
    next(error);
  }
};

export const sendChatsToUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
  } catch (error) {
    console.log(error);
    return res.status(200).json({ message: "ERROR", cause: error.message });
  }
};

export const deleteChats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
  } catch (error) {
    console.log(error);
    return res.status(200).json({ message: "ERROR", cause: error.message });
  }
};
