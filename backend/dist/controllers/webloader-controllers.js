import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { randomUUID } from "crypto";
import { client, config, embeddings } from "../config/elastic-config.js";
import User from "../models/User.js";
import { ElasticVectorSearch } from "@langchain/community/vectorstores/elasticsearch";
import { Client } from "@elastic/elasticsearch";
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
});
export const addVectorStore = async (req, res, next) => {
    const { link, index } = req.body;
    console.log("link: ", link);
    console.log("indexChosen: ", index);
    const cheerioLoader = new CheerioWebBaseLoader(`${link}`);
    const loadedDocs = await cheerioLoader.load();
    const splits = await textSplitter.splitDocuments(loadedDocs);
    const documents = splits.map((split) => ({
        pageContent: split.pageContent,
        metadata: { source: `${link}` },
        id: randomUUID(),
    }));
    const clientArgs = {
        client: new Client(config),
        indexName: process.env.ELASTIC_INDEX ?? `${index}`,
    };
    const vectorStore = new ElasticVectorSearch(embeddings, clientArgs);
    const result = await vectorStore.addDocuments(documents);
    try {
        console.log("Sucessful add vector to Elasticsearch: ", result);
    }
    catch (error) {
        console.log(error);
    }
};
export const deleteVectorStore = async (req, res, next) => {
    const string = "thisisarandomkeycreatebyRandomUUID";
    let id = `${string}-${string}-${string}-${string}-${string}`;
    // await vectorStore.delete({ ids: [`${id}`] });
};
export const queryVectorStore = async (req, res, next, message) => {
    const index = "*";
    const filter = [
        {
            operator: "match",
            field: "source",
            value: "https://example.com",
        },
    ];
    const clientArgs = {
        client: new Client(config),
        indexName: process.env.ELASTIC_INDEX ?? `${index}`,
    };
    const vectorStore = new ElasticVectorSearch(embeddings, clientArgs);
    const similaritySearchResults = await vectorStore.similaritySearch(`${message}`, 1, filter);
    const context = similaritySearchResults.map((result) => result.pageContent);
    return context;
};
export const getAllIndexies = async (req, res, next) => {
    try {
        //user token check
        const admin = await User.findById(res.locals.jwtData.id);
        if (!admin) {
            return res.status(401).send("User not registered OR Token malfunctioned");
        }
        if (admin._id.toString() !== res.locals.jwtData.id) {
            return res.status(401).send("Permissions didn't match");
        }
        const indices = await client.cat.indices({
            format: 'json',
            h: 'index'
        });
        return res.status(200).json({ message: "OK", indices: indices });
    }
    catch (error) {
        console.log(error);
        return res.status(200).json({ message: "ERROR", cause: error.message });
    }
};
//# sourceMappingURL=webloader-controllers.js.map