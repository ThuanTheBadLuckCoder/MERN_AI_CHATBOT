import { ElasticClientArgs, ElasticVectorSearch } from "@langchain/community/vectorstores/elasticsearch";
import { Request, Response, NextFunction } from "express";
import { Client, type ClientOptions } from "@elastic/elasticsearch";
import { client, config, embeddingsGemini, embeddingsOpenAI } from "../../config/elastic-config.js";
import User from "../../models/User.js";

export const queryVectorStore = async (req: Request, res: Response, next: NextFunction, message: string) => {
    const index = "*";
    // console.log("messageQueryVectorStore: ", message);
    const filter = [
        {
            operator: "wildcard",
            field: "source",
            value: "*",

        },
    ];
    const clientArgs: ElasticClientArgs = {
        client: new Client(config),
        indexName: process.env.ELASTIC_INDEX ?? `${index}`,
    }
    const vectorStore = new ElasticVectorSearch(embeddingsOpenAI, clientArgs);

    const similaritySearchResults = await vectorStore.similaritySearch(
        `${message}`,
        1,
        filter
    );

    const context = similaritySearchResults.map((result) => result.pageContent);
    // console.log("Context: ", context);
    // console.log("similaritySearchResults: ", similaritySearchResults);
    return context;
}

export const queryGeminiVectorStore = async (req: Request, res: Response, next: NextFunction, message: string) => {
    const index = "*";
    // console.log("messageQueryVectorStore: ", message);
    const filter = [
        {
            operator: "wildcard",
            field: "source",
            value: "*",

        },
    ];
    const clientArgs: ElasticClientArgs = {
        client: new Client(config),
        indexName: process.env.ELASTIC_INDEX ?? `${index}`,
    }
    const vectorStore = new ElasticVectorSearch(embeddingsGemini, clientArgs);

    const similaritySearchResults = await vectorStore.similaritySearch(
        `${message}`,
        2,
        filter
    );

    console.log("similaritySearchResults: ", similaritySearchResults);
    const context = similaritySearchResults.map((result) => result.pageContent);
    // console.log("Context: ", context);
    return context;
}
export const getAllIndexies = async (req: Request, res: Response, next: NextFunction) => {
    try {
        //user token check
        const user = await User.findById(res.locals.jwtData.id);
        if (!user) {
            return res.status(401).send("User not registered OR Token malfunctioned");
        }
        if (user._id.toString() !== res.locals.jwtData.id) {
            return res.status(401).send("Permissions didn't match");
        }
        const indices = await client.cat.indices({
            format: 'json',
            h: 'index'
        });
        return res.status(200).json({ message: "OK", indices: indices });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "ERROR", cause: error.message });
    }
}

export const createNewIndexies = async (req: Request, res: Response, next: NextFunction) => {
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
    } catch (error) {
        return res.status(500).json({ message: "ERROR", cause: error.message })
    }
}