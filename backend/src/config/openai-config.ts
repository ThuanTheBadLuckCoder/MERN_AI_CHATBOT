import { ChatOpenAI } from "@langchain/openai";
import { Configuration } from "openai";
import { config } from "dotenv";

config();

export const configureOpenAI = () => {
    const config = new Configuration({
        apiKey: process.env.OPEN_AI_SECRET,
        organization: process.env.OPENAI_ORGANIZATION_ID
    });
    return config; 
}

export const model = new ChatOpenAI({
    model: "gpt-3.5-turbo",
    temperature: 1,

})