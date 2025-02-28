// import { NextFunction, Request, Response } from "express";
// import User from "../models/User.js";
// import { model } from "../config/gemini-config.js";
// import { ChatPromptTemplate } from "@langchain/core/prompts";
// import { queryVectorStore } from "./components/elastic-controller.js";
// import { executor } from "./components/agents/custom-gemini-agent.js";
// import { googleGemini } from './components/agents/google-gemini-agent.js'
// import { AIMessage, HumanMessage } from "@langchain/core/messages";

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
