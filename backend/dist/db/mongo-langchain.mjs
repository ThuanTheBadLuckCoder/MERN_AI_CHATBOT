import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MongoClient } from "mongodb";
const client = new MongoClient(process.env.MONGODB_URL || "");
const collection = client
    .db(process.env.MONGODB_ATLAS_DB_NAME)
    .collection(process.env.MONGODB_ATLAS_COLLECTION_NAME);
const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
});
const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
    collection: collection,
    indexName: "vector_index", // The name of the Atlas search index. Defaults to "default"
    textKey: "text", // The name of the collection field containing the raw content. Defaults to "text"
    embeddingKey: "embedding", // The name of the collection field containing the embedded text. Defaults to "embedding"
});
const document1 = {
    pageContent: "The powerhouse of the cell is the mitochondria",
    metadata: { source: "https://example.com" },
};
const document2 = {
    pageContent: "Buildings are made out of brick",
    metadata: { source: "https://example.com" },
};
const document3 = {
    pageContent: "Mitochondria are made out of lipids",
    metadata: { source: "https://example.com" },
};
const document4 = {
    pageContent: "The 2024 Olympics are in Paris",
    metadata: { source: "https://example.com" },
};
const documents = [document1, document2, document3, document4];
await vectorStore.addDocuments(documents, { ids: ["1", "2", "3", "4"] });
const similaritySearchResults = await vectorStore.similaritySearch("biology", 2);
for (const doc of similaritySearchResults) {
    console.log(`* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
}
export { client, vectorStore, documents, similaritySearchResults };
//# sourceMappingURL=mongo-langchain.mjs.map