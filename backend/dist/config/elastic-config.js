import { OpenAIEmbeddings } from "@langchain/openai";
import { Client } from "@elastic/elasticsearch";
import { TaskType } from "@google/generative-ai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
export const embeddingsOpenAI = new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY,
    batchSize: 512,
    model: "text-embedding-3-small",
});
export const embeddingsGemini = new GoogleGenerativeAIEmbeddings({
    model: "text-embedding-004", // 768 dimensions
    taskType: TaskType.RETRIEVAL_DOCUMENT,
    title: "Document title",
});
const config = {
    node: process.env.ELASTIC_URL ?? "http://127.0.0.1:9200/"
};
if (process.env.ELASTIC_API_KEY) {
    config.auth = {
        apiKey: process.env.ELASTIC_API_KEY,
    };
}
else if (process.env.ELASTICSEARCH_USER && process.env.ELASTICSEARCH_PASSWORD) {
    config.auth = {
        username: process.env.ELASTICSEARCH_USER,
        password: process.env.ELASTICSEARCH_PASSWORD,
    };
}
const client = new Client({
    node: 'http://localhost:9200'
});
export { client, config };
//# sourceMappingURL=elastic-config.js.map