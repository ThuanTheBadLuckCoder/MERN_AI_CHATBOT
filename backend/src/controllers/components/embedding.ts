// OpenAI
// This will help you get started with OpenAIEmbeddings embedding models using LangChain. For detailed documentation on OpenAIEmbeddings features and configuration options, please refer to the API reference.

import { OpenAIEmbeddings } from "@langchain/openai";

const embeddings = new OpenAIEmbeddings({
    apiKey: process.env.OPEN_AI_SECRET,
    batchSize: 512,
    model: "text-embedding-3-small",
});


