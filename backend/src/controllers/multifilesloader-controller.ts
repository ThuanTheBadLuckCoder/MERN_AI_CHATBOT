import { NextFunction, Request, Response } from "express";
import type { Document } from "@langchain/core/documents";
import { COOKIE_NAME } from "../utils/constants.js";
import { ElasticClientArgs, ElasticVectorSearch } from "@langchain/community/vectorstores/elasticsearch";
import { Client, type ClientOptions } from "@elastic/elasticsearch";
import { config, embeddingsOpenAI } from "../config/elastic-config.js";
import { randomUUID } from "crypto";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";

const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
});

export const EmbeddingsVectorStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, content, index } = req.body;
        console.log("file: ", name);
        console.log("index: ", content);
        // const objectText = JSON.stringify(content);

        const loadedDocs = [
            {
                pageContent: content,
                metadata: {
                    source: name,
                },
            }
        ];
        console.log("loadedDocs: ", loadedDocs);

        const splits = await textSplitter.splitDocuments(loadedDocs);
        // console.log("splits: ", splits);


        const documents: Document[] = splits.map((split) => ({
            pageContent: split.pageContent,
            metadata: { source: `${name}` },
            id: randomUUID(),
        }));
        // console.log(documents);

        const clientArgs: ElasticClientArgs = {
            client: new Client(config),
            indexName: process.env.ELASTIC_INDEX ?? `${index}`,
        }
        const vectorStore = new ElasticVectorSearch(embeddingsOpenAI, clientArgs);

        const result = await vectorStore.addDocuments(documents);

        try {
            console.log("Sucessful add vector to Elasticsearch: ", result);

        } catch (error) {
            console.log(error);
        }
        return res
            .status(200)
            .json({ message: "OK", name: name, content: content, index: index });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "ERROR", cause: error.message });
    }
}
