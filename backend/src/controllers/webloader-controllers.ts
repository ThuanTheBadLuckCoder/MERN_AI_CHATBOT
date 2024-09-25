import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { NextFunction, Request, Response } from "express";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import type { Document } from "@langchain/core/documents";
import { randomUUID } from "crypto";
import { vectorStore } from "../config/elastic-config.js";
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
})

export const addVectorStore = async ( req: Request, res: Response, next: NextFunction ) => {
    const { link } = req.body;
    console.log("link: ", link);
    
    const cheerioLoader = new CheerioWebBaseLoader(`${link}`);
    const loadedDocs = await cheerioLoader.load();
    
    const splits = await textSplitter.splitDocuments(loadedDocs);
    
    const documents: Document[] = splits.map((split) => ({
        pageContent: split.pageContent,
        metadata: { source: `${link}`},
        id: randomUUID(),
    }));

    await vectorStore.addDocuments(documents);
}

export const deleteVectorStore = async ( req: Request, res: Response, next: NextFunction ) => {
    const string = "thisisarandomkeycreatebyRandomUUID"
    let id = `${string}-${string}-${string}-${string}-${string}`;
    await vectorStore.delete({ ids: [`${id}`] });
}

export const queryVectorStore = async (message: string) => {
    const filter = [
        {
            operator: "match",
            field: "source",
            value: "https://example.com",
            
        },
    ];

    const similaritySearchResults = await vectorStore.similaritySearch(
        `${message}`,
        1,
        filter
      );

    const context = similaritySearchResults.map((result) => result.pageContent);

    return context;
}