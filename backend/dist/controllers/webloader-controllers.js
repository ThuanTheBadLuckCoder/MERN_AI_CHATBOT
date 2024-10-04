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
    try {
        const { link, index } = req.body;
        // console.log("link: ", link);
        // console.log("indexChosen: ", index);
        const cheerioLoader = new CheerioWebBaseLoader(`${link}`);
        const loadedDocs = await cheerioLoader.load();
        // console.log("loadedDocs: ", loadedDocs);
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
        // console.log("Sucessful add vector to Elasticsearch: ", result);
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
export const deleteVectorStore = async (req, res, next) => {
    const string = "thisisarandomkeycreatebyRandomUUID";
    let id = `${string}-${string}-${string}-${string}-${string}`;
    // await vectorStore.delete({ ids: [`${id}`] });
};
export const queryVectorStore = async (req, res, next, message) => {
    const index = "*";
    // console.log("messageQueryVectorStore: ", message);
    const filter = [
        {
            operator: "wildcard",
            field: "source",
            value: "*",
        },
    ];
    const clientArgs = {
        client: new Client(config),
        indexName: process.env.ELASTIC_INDEX ?? `${index}`,
    };
    const vectorStore = new ElasticVectorSearch(embeddings, clientArgs);
    const similaritySearchResults = await vectorStore.similaritySearch(`${message}`, 1, filter);
    const context = similaritySearchResults.map((result) => result.pageContent);
    // console.log("Context: ", context);
    // console.log("similaritySearchResults: ", similaritySearchResults);
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
        return res.status(500).json({ message: "ERROR", cause: error.message });
    }
};
export const createNewIndexies = async (req, res, next) => {
    //Define index parameters
    const { indexName, settings, mappings } = req.body;
    try {
        if (!indexName) {
            return res.status(400).json({ message: "Index name is required." });
        }
        // Define index parameters
        const indexParams = {
            index: indexName,
            body: {
                settings: settings || {
                    // Example settings; can be customized
                    analysis: {
                        analyzer: {
                            content_analyzer: {
                                type: "standard",
                            },
                        },
                    },
                },
                mappings: mappings || {
                    // Example mappings; customize as needed
                    properties: {
                        pageContent: { type: "text", analyzer: "content_analyzer" },
                        metadata: {
                            properties: {
                                source: { type: "keyword" },
                            },
                        },
                    },
                },
            },
        };
        const response = await client.indices.create(indexParams);
        return res.status(200).json({ message: "Index created successfully.", response });
    }
    catch (error) {
        return res.status(500).json({ message: "ERROR", cause: error.message });
    }
};
//# sourceMappingURL=webloader-controllers.js.map