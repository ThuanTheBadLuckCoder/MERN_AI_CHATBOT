// import { Document } from "@langchain/core/documents";
// import { BufferLoader } from "langchain/document_loaders/fs/buffer";
// import { MongoClient, GridFSBucket } from "mongodb";
// import mammoth from "mammoth";
export {};
// // Custom class to load documents from MongoDB
// export class DocxLoader extends BufferLoader {
//   private client: MongoClient;
//   private bucket: GridFSBucket;
//   private fileId: string;
//   constructor(mongoUri: string, dbName: string, fileId: string) {
//     super(fileId); // Pass the fileId to the parent class
//     this.client = new MongoClient(mongoUri);
//     this.fileId = fileId;
//     this.bucket = new GridFSBucket(this.client.db(dbName));
//   }
//   async loadFromMongo(): Promise<Buffer> {
//     await this.client.connect();
//     const downloadStream = this.bucket.openDownloadStream(this.fileId);
//     const chunks: Buffer[] = [];
//     return new Promise((resolve, reject) => {
//       downloadStream.on("data", (chunk) => chunks.push(chunk));
//       downloadStream.on("end", () => resolve(Buffer.concat(chunks)));
//       downloadStream.on("error", reject);
//     });
//   }
//   async parse(raw: Buffer, metadata: Document["metadata"]): Promise<Document[]> {
//     const { value: extractedText } = await mammoth.extractRawText({ buffer: raw });
//     if (!extractedText) return [];
//     const doc = new Document({ pageContent: extractedText, metadata });
//     return [doc];
//   }
//   async load(): Promise<Document[]> {
//     const fileBuffer = await this.loadFromMongo();
//     const metadata = { source: this.fileId }; // You can add more metadata here
//     return this.parse(fileBuffer, metadata);
//   }
// }
//# sourceMappingURL=docx-loader.js.map