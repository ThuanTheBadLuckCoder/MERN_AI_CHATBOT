import { ChatOpenAI } from "@langchain/openai";
import { config } from "dotenv";
config();
export const model = new ChatOpenAI({
    model: "gpt-3.5-turbo",
    temperature: 1,
});
//# sourceMappingURL=openai-config.js.map