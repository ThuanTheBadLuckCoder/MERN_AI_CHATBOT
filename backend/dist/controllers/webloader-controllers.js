import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { randomUUID } from "crypto";
import { config, embeddingsGemini, embeddingsOpenAI } from "../config/elastic-config.js";
import { ElasticVectorSearch } from "@langchain/community/vectorstores/elasticsearch";
import { Client } from "@elastic/elasticsearch";
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
});
export const EmbeddingsVectorStore = async (req, res, next) => {
    try {
        const { link, index } = req.body;
        const cheerioLoader = new CheerioWebBaseLoader(`${link}`);
        const loadedDocs = await cheerioLoader.load();
        const cleanedDocs = loadedDocs.map(doc => ({
            ...doc,
            pageContent: doc.pageContent.replace(/\n/g, '').replace(/\s+/g, ' ').trim(),
        }));
        const splits = await textSplitter.splitDocuments(cleanedDocs);
        const documents = splits.map((split) => ({
            pageContent: split.pageContent,
            metadata: { source: `${link}` },
            id: randomUUID(),
        }));
        const clientArgs = {
            client: new Client(config),
            indexName: process.env.ELASTIC_INDEX ?? `${index}`,
        };
        const vectorStore = new ElasticVectorSearch(embeddingsOpenAI, clientArgs);
        const result = await vectorStore.addDocuments(documents);
        // console.log("Sucessful add vector to Elasticsearch: ", result);
        return res
            .status(200)
            .json({ message: "OK", result });
    }
    catch (error) {
        console.log(error);
        return res
            .status(500)
            .json({ error: "ERROR", cause: error.message });
    }
};
export const EmbeddingsGeminiVectorStore = async (req, res, next) => {
    try {
        const { link, index } = req.body;
        console.log("link: ", link);
        console.log("indexChosen: ", index);
        const cheerioLoader = new CheerioWebBaseLoader(`${link}`);
        const loadedDocs = await cheerioLoader.load();
        console.log("loadedDocs: ", loadedDocs);
        const splits = await textSplitter.splitDocuments(loadedDocs);
        const documents = splits.map((split) => ({
            pageContent: split.pageContent,
            metadata: { source: `${link}` },
            id: randomUUID(),
        }));
        console.log("documents: ", documents);
        const clientArgs = {
            client: new Client(config),
            indexName: process.env.ELASTIC_INDEX ?? `${index}`,
        };
        const vectorStore = new ElasticVectorSearch(embeddingsGemini, clientArgs);
        const result = await vectorStore.addDocuments(documents);
        console.log("Sucessful add vector to Elasticsearch: ", result);
        return res
            .status(200)
            .json({ message: "OK" });
    }
    catch (error) {
        console.log(error);
        return res
            .status(500)
            .json({ error: "ERROR", cause: error.message });
    }
};
//# sourceMappingURL=webloader-controllers.js.map