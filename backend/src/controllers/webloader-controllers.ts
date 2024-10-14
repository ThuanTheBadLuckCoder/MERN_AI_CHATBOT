import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { NextFunction, Request, Response } from "express";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import type { Document } from "@langchain/core/documents";
import { randomUUID } from "crypto";
import { client, config, embeddingsGemini, embeddingsOpenAI } from "../config/elastic-config.js";
import User from "../models/User.js";
import { ElasticClientArgs, ElasticVectorSearch } from "@langchain/community/vectorstores/elasticsearch";
import { Client, type ClientOptions } from "@elastic/elasticsearch";


const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
});


export const EmbeddingsVectorStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { link, index } = req.body;
        // console.log("link: ", link);
        // console.log("indexChosen: ", index);
        const cheerioLoader = new CheerioWebBaseLoader(`${link}`);
        const loadedDocs = await cheerioLoader.load();
        // console.log("loadedDocs: ", loadedDocs);
        const splits = await textSplitter.splitDocuments(loadedDocs);

        const documents: Document[] = splits.map((split) => ({
            pageContent: split.pageContent,
            metadata: { source: `${link}` },
            id: randomUUID(),
        }));

        const clientArgs: ElasticClientArgs = {
            client: new Client(config),
            indexName: process.env.ELASTIC_INDEX ?? `${index}`,
        }
        const vectorStore = new ElasticVectorSearch(embeddingsOpenAI, clientArgs);

        const result = await vectorStore.addDocuments(documents);
        // console.log("Sucessful add vector to Elasticsearch: ", result);
        return res
            .status(200)
            .json({ message: "OK" });
    } catch (error) {
        console.log(error);
        return res
            .status(500)
            .json({ error: "ERROR", cause: error.message });
    }
}

export const EmbeddingsGeminiVectorStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { link, index } = req.body;
        console.log("link: ", link);
        console.log("indexChosen: ", index);
        const cheerioLoader = new CheerioWebBaseLoader(`${link}`);
        const loadedDocs = await cheerioLoader.load();
        console.log("loadedDocs: ", loadedDocs);
        const splits = await textSplitter.splitDocuments(loadedDocs);

        const documents: Document[] = splits.map((split) => ({
            pageContent: split.pageContent,
            metadata: { source: `${link}` },
            id: randomUUID(),
        }));
        console.log("documents: ", documents);
        const clientArgs: ElasticClientArgs = {
            client: new Client(config),
            indexName: process.env.ELASTIC_INDEX ?? `${index}`,
        }
        const vectorStore = new ElasticVectorSearch(embeddingsGemini, clientArgs);

        const result = await vectorStore.addDocuments(documents);
        console.log("Sucessful add vector to Elasticsearch: ", result);
        return res
            .status(200)
            .json({ message: "OK" });
    } catch (error) {
        console.log(error);
        return res
            .status(500)
            .json({ error: "ERROR", cause: error.message });
    }
}