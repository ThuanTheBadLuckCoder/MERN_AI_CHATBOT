//chat-controllers.ts

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
import { queryGeminiVectorStore } from "./components/elastic-controller.js";
import { executor } from "./components/agents/custom-gemini-agent.js";
// import { combineCodeAndExplanation } from "./components/agents/custom-agent.js";
import { modelGemini } from "../config/gemini-config.js";

import { executeWithCodeHandling, hybridSearchTool } from "./components/agents/custom-agent.js";
import { executeWithMilitaryDiscipline } from "./components/agents/context-agent.js";

// import { executeWithCodeHandling } from './components/agents/custom-agent.js'

export const generateChatGeminiMultiCompletion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { message, conversationId } = req.body;
    // // // console.log("Frontend: ", message, conversationId);
    // Validate input
    if (typeof message !== "string" || !message.trim()) {
      return res
        .status(400)
        .json({ message: "Invalid input: 'message' should be a non-empty string" });
    }

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

    // Retrieve context using vector store with conversationId
    const context = await queryVectorStore(req, res, next, message, conversationId || user.conversations[conversationIndex]?.id);
    // // // console.log("Given context: ", context);

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


    // // console.log("chatHistory: ", chatHistory);

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
      chat_history: chatHistory.length > 0 ? chatHistory : undefined,
      model,
    });

    // const responseGPT = await executorGPT.invoke({
    //   input,
    //   model
    // });

    // // console.log("responseGPT: ", responseGPT);

    // Extract response content
    let responseContent;
    try {
      // Try to parse as JSON first
      const parsedOutput = JSON.parse(responseAgent.output);
      responseContent = parsedOutput?.kwargs?.content || "No valid response generated.";
    } catch (e) {
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
  } catch (error) {
    console.error("Error in generateChatCompletion: ", error);
    return res.status(500).json({ message: "Something went wrong", error: error.message });
  }
};

export const generateGoogleMultiCompletion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { message, conversationId } = req.body;
    // console.log(message);
    // console.log("Frontend: ", message, conversationId);
    // Validate input
    if (typeof message !== "string" || !message.trim()) {
      return res
        .status(400)
        .json({ message: "Invalid input: 'message' should be a non-empty string" });
    }


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
        //404 go here
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


    // // console.log("chatHistory: ", chatHistory);

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
    const responseAgent = await modelGemini.invoke(input);
    // console.log("responseAgentGemini: ", responseAgent.content);

    // const responseGPT = await executorGPT.invoke({
    //   input,
    //   model
    // });

    // // console.log("responseGPT: ", responseGPT);

    // Extract response content
    // Extract response content
    let responseContent;
    try {
      responseContent = responseAgent?.content || "No valid response generated.";
    } catch (e) {
      console.error("Error extracting response content: ", e);
      responseContent = "No valid response generated.";
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
  } catch (error) {
    console.error("Error in generateChatCompletion: ", error);
    return res.status(500).json({ message: "Something went wrong", error: error.message });
  }
};

/**
 * Query vector store with enhanced parent component resolution and explanation
 */
export async function queryVectorStore(req: Request, res: Response, next: NextFunction, message: string, conversationId?: string): Promise<string[]> {
  try {
    // console.log("Querying vector store with message:", message);
    
    // Call the hybridSearchTool directly with conversationId
    const searchInput = conversationId ? 
      JSON.stringify({ query: message, conversationId: conversationId }) : 
      message;
    
    const searchResult = await hybridSearchTool.func(searchInput);
    
    if (!searchResult) {
      // console.log("No search results found");
      return [];
    }
    
    try {
      // Parse the results and extract context and request ID
      const parsedResult = JSON.parse(searchResult);
      const context = parsedResult.context || [];
      
      // Store the request ID for later access to explanations
      if (parsedResult.metadata && parsedResult.metadata.requestId) {
        res.locals.explanationRequestId = parsedResult.metadata.requestId;
      }
      
      // Store references for later access
      if (parsedResult.references && conversationId) {
        if (!global.currentReferences) {
          global.currentReferences = {};
        }
        global.currentReferences[conversationId] = parsedResult.references;
      }
      
      // console.log(`Found single best matching document`);
      return context;
    } catch (e) {
      console.error("Error parsing search results:", e);
      return [];
    }
  } catch (error) {
    console.error("Error querying vector store:", error);
    return [];
  }
}

export const generateChatGPTCompletion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { message, conversationId } = req.body;
    // console.log("Frontend: ", message, conversationId);
    // Validate input
    if (typeof message !== "string" || !message.trim()) {
      return res
        .status(400)
        .json({ message: "Invalid input: 'message' should be a non-empty string" });
    }

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
        title: message.slice(0, 30) + (message.length > 30 ? "..." : ""), // Create title from first message
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      user.conversations.push(conversation);
      conversationIndex = user.conversations.length - 1;
    }

    // Retrieve context using vector store with conversationId
    const context = await queryVectorStore(req, res, next, message, conversationId || user.conversations[conversationIndex]?.id);
    // console.log("Given context: ", context);

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

    // // console.log("chatHistory: ", chatHistory);

    // Add the current message to conversation messages
    const input = message.trim();
    const userMessage = {
      content: input,
      role: "user",
      createdAt: new Date()
    };

    // Use Mongoose array methods to ensure middleware triggers
    user.conversations[conversationIndex].messages.push(userMessage);

    // Generate response using ONLY the GPT executor with reference tracking
    const responseGPT = await executeWithCodeHandling(
      input,
      chatHistory.length > 0 ? chatHistory : [],
      conversationId || user.conversations[conversationIndex].id // Use the conversation ID
    );

    // Extract response content from GPT
    let responseContent;
    if (typeof responseGPT.output === 'string') {
      responseContent = responseGPT.output;
    } else {
      responseContent = "No valid response generated.";
    }

    // Add assistant's response to conversation messages with references
    const assistantMessage = {
      content: responseContent,
      role: "assistant",
      createdAt: new Date(),
      references: responseGPT.references || [] // Add references to the message
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
        updatedAt: user.conversations[conversationIndex].updatedAt,
        allReferences: user.conversations[conversationIndex].allReferences // Include aggregated references
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong", error: error.message });
  }
};

export const generateChatGPTContextCompletion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { message, conversationId } = req.body;
    // console.log("Frontend: ", message, conversationId);
    // Validate input
    if (typeof message !== "string" || !message.trim()) {
      return res
        .status(400)
        .json({ message: "Invalid input: 'message' should be a non-empty string" });
    }

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
        title: message.slice(0, 30) + (message.length > 30 ? "..." : ""), // Create title from first message
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      user.conversations.push(conversation);
      conversationIndex = user.conversations.length - 1;
    }

    // Retrieve context using vector store with enhanced parent resolution and explanations
    const context = await queryVectorStore(req, res, next, message, conversationId || user.conversations[conversationIndex]?.id);
    // console.log("Retrieved best matching component");
    
    // Get the explanation request ID that was stored during queryVectorStore
    const explanationRequestId = res.locals.explanationRequestId;

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

    // Add the current message to conversation messages
    const input = message.trim();
    const userMessage = {
      content: input,
      role: "user",
      createdAt: new Date()
    };

    // Use Mongoose array methods to ensure middleware triggers
    user.conversations[conversationIndex].messages.push(userMessage);

    // Generate response using executeWithCodeHandling with references
    const response = await executeWithCodeHandling(
      input,
      chatHistory.length > 0 ? chatHistory : [],
      conversationId || user.conversations[conversationIndex].id
    );

    // Extract the explanation from the response
    let explanation = '';
    if (typeof response.output === 'string') {
      explanation = response.output;
    } else {
      explanation = "No valid explanation generated.";
    }

    // Simplified response handling - no chain of thought extraction
    const combinedResponse = {
      formattedResponse: explanation,
      structuredContent: {
        response: explanation,
        context: context.join('\n\n')
      }
    };

    // Add assistant's response to conversation messages with references
    const assistantMessage = {
      content: combinedResponse.formattedResponse,
      role: "assistant",
      createdAt: new Date(),
      // Store structured data separately for advanced frontends
      structuredContent: combinedResponse.structuredContent,
      references: response.references || [] // Add references
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
        updatedAt: user.conversations[conversationIndex].updatedAt,
        allReferences: user.conversations[conversationIndex].allReferences
      }
    });
  } catch (error) {
    console.error("Error in generateChatGPTCompletion: ", error);
    return res.status(500).json({ message: "Something went wrong", error: error.message });
  }
};

export const generateOpenAICompletion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { message, conversationId } = req.body;
    // console.log("Frontend: ", message, conversationId);
    // Validate input
    if (typeof message !== "string" || !message.trim()) {
      return res
        .status(400)
        .json({ message: "Invalid input: 'message' should be a non-empty string" });
    }

    // Retrieve context using vector store
    // const context = await queryVectorStore(req, res, next, message);
    // // console.log("Given context: ", context);

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

    // // console.log("chatHistory: ", chatHistory);

    // Add the current message to conversation messages
    const input = message.trim();
    const userMessage = {
      content: input,
      role: "user",
      createdAt: new Date()
    };

    // Use Mongoose array methods to ensure middleware triggers
    user.conversations[conversationIndex].messages.push(userMessage);

    // Save the updated user document before invoking the model
    await user.save();

    // Generate response using ONLY the GPT executor
    const responseGPT = await model.invoke(input);

    // console.log("responseGPT: ", responseGPT);

    // Extract response content from GPT
    let responseContent;
    if (typeof responseGPT.content === 'string') {
      responseContent = responseGPT.content;
    } else if (responseGPT.content && typeof responseGPT.content === 'object') {
      responseContent = responseGPT.content || JSON.stringify(responseGPT.content);
    } else {
      responseContent = "No valid response generated.";
    }

    // Add assistant's response to conversation messages
    const assistantMessage = {
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
  } catch (error) {
    console.error("Error in generateChatGPTCompletion: ", error);
    return res.status(500).json({ message: "Something went wrong", error: error.message });
  }
};

export const generateContextAgentCompletion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { message, conversationId } = req.body;
    if (typeof message !== "string" || !message.trim()) {
      return res
        .status(400)
        .json({ message: "Invalid input: 'message' should be a non-empty string" });
    }

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
        title: message.slice(0, 30) + (message.length > 30 ? "..." : ""),
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

    // Add the current message to conversation messages
    const input = message.trim();
    const userMessage = {
      content: input,
      role: "user",
      createdAt: new Date()
    };
    user.conversations[conversationIndex].messages.push(userMessage);
    await user.save();

    // Generate response using the context-agent executor
    const responseAgent = await executeWithMilitaryDiscipline(
      input,
      chatHistory.length > 0 ? chatHistory : [],
      conversationId || user.conversations[conversationIndex].id
    );

    // Extract context document IDs and code from intermediateSteps if available
    if (responseAgent && responseAgent.intermediateSteps && Array.isArray(responseAgent.intermediateSteps)) {
      for (const step of responseAgent.intermediateSteps) {
        if (step && step.observation) {
          try {
            const parsed = JSON.parse(step.observation);
            if (parsed && parsed.parentMetas && parsed.context) {
              for (let i = 0; i < parsed.parentMetas.length; i++) {
                const meta = parsed.parentMetas[i];
                const code = parsed.context[i] || '';
                const desc = meta.description || '';
                // Print only: [CTX] id: <id> | desc: <description> | code: <full code>
                // console.log(`[CTX] id: ${meta.document_id} | desc: ${desc} | code: ${code}`);
              }
            }
          } catch {}
        }
      }
    }

    let responseContent;
    try {
      // Try to parse as JSON first
      const parsedOutput = JSON.parse(responseAgent.output);
      responseContent = parsedOutput?.kwargs?.content || "No valid response generated.";
    } catch (e) {
      responseContent = responseAgent.output || "No valid response generated.";
    }


    // Add assistant's response to conversation messages
    const assistantMessage = {
      content: responseContent,
      role: "assistant",
      createdAt: new Date()
    };
    user.conversations[conversationIndex].messages.push(assistantMessage);
    user.conversations[conversationIndex].updatedAt = new Date();
    await user.save();

    return res.status(200).json({
      conversation: {
        id: user.conversations[conversationIndex].id,
        title: user.conversations[conversationIndex].title,
        messages: user.conversations[conversationIndex].messages,
        createdAt: user.conversations[conversationIndex].createdAt,
        updatedAt: user.conversations[conversationIndex].updatedAt
      }
    });
  } catch (error) {
    console.error("Error in generateContextAgentCompletion: ", error);
    return res.status(500).json({ message: "Something went wrong", error: error.message });
  }
};

export const sendChatsToUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { conversationId } = req.params;
    // console.log("Conversation ID:", conversationId); // Debugging

    // Check user token
    const user = await User.findById(res.locals.jwtData.id);

    if (!user) {
      return res.status(401).json({ message: "User not registered OR Token malfunctioned" });
    }

    if (user._id.toString() !== res.locals.jwtData.id) {
      return res.status(403).json({ message: "Permissions didn't match" });
    }

    // Fetch chats based on conversationId and userId
    const chats = user.conversations.find(
      (conv) => conv.id === conversationId
    );

    if (!chats) {
      return res.status(404).json({ message: "No chats found for this conversation" });
    }

    // console.log(chats);
    // if (!chats.length) {
    //   return res.status(404).json({ message: "No chats found for this conversation" });
    // }

    return res.status(200).json({ message: "OK", chats: chats.messages });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "ERROR", cause: error.message });
  }
};

export const sendConversationsToUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // User token check
    const user = await User.findById(res.locals.jwtData.id);
    if (!user) {
      return res.status(401).send("User not registered OR Token malfunctioned");
    }
    if (user._id.toString() !== res.locals.jwtData.id) {
      return res.status(401).send("Permissions didn't match");
    }

    // Sort conversations by updatedAt descending (newest first)
    const conversationsMetadata = user.conversations
      .slice() // copy to avoid mutating original
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map(conv => ({
        id: conv.id,
        _id: conv._id,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      }));

    return res.status(200).json({
      message: "Conversations found",
      conversations: conversationsMetadata
    });

  } catch (error) {
    // console.log(error);
    return res.status(500).json({ message: "Error getting conversation list" });
  }
};

export const conversationLists = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findById(res.locals.jwtData.id);
    if (!user) {
      return res.status(401).json({ message: "User not found or token malfunctioned" });
    }

    const conversations = await User.find({ userId: user._id })
      .select('_id title createdAt updatedAt')
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      message: "Conversations found",
      conversations
    });
  } catch (error) {

  }
}

export const deleteChats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { conversationId } = req.params;
    // console.log("Deleting conversation with ID:", conversationId);

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
    } else {
      // Find the index of the conversation with the provided ID
      const conversationIndex = user.conversations.findIndex(
        (conv) => conv.id === conversationId
      );

      // If the conversation exists, remove it
      if (conversationIndex !== -1) {
        user.conversations.splice(conversationIndex, 1);
      } else {
        return res.status(404).json({ message: "Conversation not found" });
      }
    }

    await user.save();

    return res.status(200).json({ message: "Conversation deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "ERROR", cause: error.message });
  }
};

export const getConversationReferences = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { conversationId } = req.params;
    
    // User token check
    const user = await User.findById(res.locals.jwtData.id);
    if (!user) {
      return res.status(401).json({ message: "User not registered OR Token malfunctioned" });
    }
    if (user._id.toString() !== res.locals.jwtData.id) {
      return res.status(401).json({ message: "Permissions didn't match" });
    }

    // Find the conversation
    const conversation = user.conversations.find(
      (conv) => conv.id === conversationId
    );

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Get references from the conversation
    const references = conversation.allReferences || [];
    
    // Also try to get references from global tracking
    let globalReferences = [];
    try {
      if (global.referenceTracker && global.referenceTracker[conversationId]) {
        globalReferences = global.referenceTracker[conversationId];
      }
    } catch (error) {
      console.error("Error getting global references:", error);
    }

    // Merge references, avoiding duplicates
    const allReferences = [...references];
    const existingIds = new Set(references.map(ref => ref.id));
    
    globalReferences.forEach(ref => {
      if (!existingIds.has(ref.id)) {
        allReferences.push(ref);
      }
    });

    return res.status(200).json({
      message: "References retrieved successfully",
      references: allReferences,
      count: allReferences.length
    });
  } catch (error) {
    console.error("Error getting conversation references:", error);
    return res.status(500).json({ message: "ERROR", cause: error.message });
  }
};