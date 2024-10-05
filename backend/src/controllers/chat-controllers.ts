import { NextFunction, Request, Response } from "express";
import User from "../models/User.js";
import { model } from "../config/openai-config.js";
import { ChatCompletionRequestMessage } from "openai";
import { AIMessage, BaseMessageLike, HumanMessage } from "@langchain/core/messages";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import type { BaseMessage } from "@langchain/core/messages";
import { 
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import { retriever } from "./components/model-io/web-loader.js";
import { queryVectorStore } from "./webloader-controllers.js";


// let messageHistories: Record<string, InMemoryChatMessageHistory> = {};

export const generateChatCompletion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { message } = req.body;
  console.log("message: ", message);
  try {
    const user = await User.findById(res.locals.jwtData.id);
    const context = await queryVectorStore(req, res, next, message);
    type ChainInput = {
      chat_history: BaseMessage[];
      input: string;
      given_context: string[];
    };
    const filterMessages = (input: ChainInput) => input.chat_history.slice(-10);

    if (!user) {
      return res.status(401).json({ message: "User not registered OR Token malfunctioned" });
    }

    let prompt: ChatPromptTemplate<any, any>

    if (!context) {
      prompt = ChatPromptTemplate.fromMessages([
        "system", "Say I don't know"
      ])
    } else {
      prompt = ChatPromptTemplate.fromMessages([
        [
          "system",
          `You are a ChatBot that ONLY supports IT users. You can reply to greetings as usual. 
          You must answer BASED ON the given context: {given_context}.
          Check for spelling errors, if it is incorrect based on context, 
          based on the context return ask the user 
          if this is what the user meant?`,
        ],
        ["placeholder", "{chat_history}"],
        ["human", message],
      ]);
    }
    const chain = RunnableSequence.from<ChainInput>([
      RunnablePassthrough.assign({
        chat_history: filterMessages,
        given_context: async () => context,
      }),
      prompt,
      model,
    ]);

    const chatHistory = user.chats
      .filter((message) => message.role === 'user' || message.role === 'assistant') // Lọc các tin nhắn có role là 'user' hoặc 'assistant'
      .map((message) => {
        if (message.role === 'user') {
          return new HumanMessage({ content: message.content });
        } else if (message.role === 'assistant') {
          return new AIMessage({ content: message.content });
        }
      });
    
    console.log("chatHistory: ", chatHistory);
    console.log("filterMessage: ", filterMessages);


    // grab chats of user
    const chats = user.chats.map(({ role, content }) => ({
      role,
      content,
    })) as ChatCompletionRequestMessage[];
    chats.push({ content: message, role: "user" });
    user.chats.push({ content: message, role: "user" });

    const response = await chain.invoke({
      chat_history: chatHistory,
      input: `${message}`,
      given_context: context,
    });
    
    console.log("response: ", response);

    user.chats.push({ content: response.content, role: "assistant" })
    await user.save();
    return res.status(200).json({ chats: user.chats });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
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