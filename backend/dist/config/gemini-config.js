import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
export const modelGemini = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-pro",
    maxOutputTokens: 2048,
});
//# sourceMappingURL=gemini-config.js.map