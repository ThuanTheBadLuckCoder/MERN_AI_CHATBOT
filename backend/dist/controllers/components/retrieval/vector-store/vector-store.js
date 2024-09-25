import { OpenAIEmbeddings } from "@langchain/openai";
const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
});
const config = {
    node: process.env.ELASTIC_URL ?? "https://127.0.0.1:9200"
};
//# sourceMappingURL=vector-store.js.map