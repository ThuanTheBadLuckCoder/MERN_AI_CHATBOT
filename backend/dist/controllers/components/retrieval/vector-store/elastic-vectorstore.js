// import {
//     ElasticVectorSearch,
//     type ElasticClientArgs,
//   } from "@langchain/community/vectorstores/elasticsearch";
//   import { OpenAIEmbeddings } from "@langchain/openai";
export {};
//   import { Client, type ClientOptions } from "@elastic/elasticsearch";
//   import * as fs from "node:fs";
// const embeddings = new OpenAIEmbeddings({
//     model: "text-embedding-3-small",
// });
// const config: ClientOptions = {
//     node: process.env.ELASTIC_URL ?? "http://localhost:9200/"
// }
// if (process.env.ELASTIC_API_KEY) {
//     config.auth = {
//         apiKey: process.env.ELASTIC_API_KEY,
//     };
// } else if (process.env.ELASTIC_USERNAME && process.env.ELASTIC_PASSWORD) {
//     config.auth = {
//         username: process.env.ELASTICSEARCH_USER,
//         password: process.env.ELASTICSEARCH_PASSWORD,
//     };
// }
// const clientArgs: ElasticClientArgs = {
//     client: new Client(config),
//     indexName: process.env.ELASTIC_INDEX ?? "test_vectorstore",
//   };
// const vectorStore = new ElasticVectorSearch(embeddings, clientArgs);
// export { vectorStore }
//# sourceMappingURL=elastic-vectorstore.js.map