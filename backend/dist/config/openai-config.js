import { ChatOpenAI } from "@langchain/openai";
import { config } from "dotenv";
config();
export const model = new ChatOpenAI({
    model: "gpt-3.5-turbo",
    // model: "gpt-4-turbo-2024-04-09",
    temperature: 0,
});
export const llm = new ChatOpenAI({
    model: "gpt-3.5-turbo-1106",
    temperature: 0,
});
//# sourceMappingURL=openai-config.js.map