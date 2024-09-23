import "cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { pull } from "langchain/hub";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import {
  RunnableSequence,
  RunnablePassthrough,
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { model } from "../../../config/openai-config.js";

const loader = new CheerioWebBaseLoader(
  "https://thuanthebadluckcoder.github.io/Messi.html"
);
const cheerioLoader = new CheerioWebBaseLoader(
  "https://thuanthebadluckcoder.github.io/Messi.html"
)

export const docs = await loader.load();
export const loadedDocs = await cheerioLoader.load();

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});
const splits = await textSplitter.splitDocuments(docs);
export const allSplits = await textSplitter.splitDocuments(loadedDocs);
const vectorStore = await MemoryVectorStore.fromDocuments(
  splits,
  new OpenAIEmbeddings()
);

// Retrieve and generate using the relevant snippets of the blog.
export const retriever = vectorStore.asRetriever();
export const prompt = await pull<ChatPromptTemplate>("rlm/rag-prompt");
// const llm = new ChatOpenAI({ model: "gpt-3.5-turbo", temperature: 0 });

// to start call api to openai uncomment these below
const llm = model;
export const ragChain = await createStuffDocumentsChain({
  llm,
  prompt,
  outputParser: new StringOutputParser(),
});

// if you want to show the result without using frontend input pls uncmt these below and call it from the index.ts
// Let’s see what this prompt actually looks like:
// console.log(prompt.promptMessages.map((msg) => (msg as any).prompt.template).join("\n"));
// You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. If you don't know the answer, just say that you don't know. Use three sentences maximum and keep the answer concise.
// Question: {question}
// Context: {context}
// Answer:


// await ragChain.invoke({
//   context: await retriever.invoke("What is Task Decomposition?"),
//   question: "What is Task Decomposition?",
// });
