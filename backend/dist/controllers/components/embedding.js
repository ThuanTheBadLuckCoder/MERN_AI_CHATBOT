import { OpenAIEmbeddings } from "@langchain/openai";
const embeddings = new OpenAIEmbeddings({
    apiKey: process.env.OPEN_AI_SECRET,
    batchSize: 512,
    model: "text-embedding-3-small",
});
//# sourceMappingURL=embedding.js.map