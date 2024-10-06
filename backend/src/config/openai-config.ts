import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { config } from "dotenv";

config();

export const model = new ChatOpenAI({
    model: "gpt-3.5-turbo",
    temperature: 1,

});

export const llm = new ChatOpenAI({
    model: "gpt-3.5-turbo-1106",
    temperature: 1,
  });