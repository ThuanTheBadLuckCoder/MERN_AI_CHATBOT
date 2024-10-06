import {
    ElasticVectorSearch,
    type ElasticClientArgs,
} from "@langchain/community/vectorstores/elasticsearch";
import { OpenAIEmbeddings } from "@langchain/openai";

import { Client, type ClientOptions  } from "@elastic/elasticsearch";
import * as fs from "node:fs";


export const embeddings = new OpenAIEmbeddings({
    apiKey: process.env.OPEN_AI_SECRET,
    batchSize: 512,
    model: "text-embedding-3-small",
});


const config: ClientOptions = {
    node: process.env.ELASTIC_URL ?? "http://127.0.0.1:9200/"
}

if (process.env.ELASTIC_API_KEY) {
    config.auth = {
        apiKey: process.env.ELASTIC_API_KEY,
    };
} else if (process.env.ELASTICSEARCH_USER && process.env.ELASTICSEARCH_PASSWORD) {
    config.auth = {
        username: process.env.ELASTICSEARCH_USER,
        password: process.env.ELASTICSEARCH_PASSWORD,
    };
}

// const clientArgs: ElasticClientArgs = {
//     client: new Client(config),
//     indexName: process.env.ELASTIC_INDEX ?? "uncategorized_vectorstore",
// };

// const vectorStore = new ElasticVectorSearch(embeddings, clientArgs);

const client = new Client({
    node: 'http://localhost:9200'
})

export { client, config }

