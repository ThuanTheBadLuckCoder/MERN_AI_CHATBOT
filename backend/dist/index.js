import app from './app.js';
import { connectToDatabase } from './db/connection.js';
// connections and listeneres
const PORT = process.env.PORT || 5000;
connectToDatabase()
    .then(() => {
    app.listen(PORT, () => console.log(`Server Open & Connected to Database at ${PORT}`));
}).catch((err) => console.log(err));
// import { retriever, prompt, ragChain, loadedDocs, allSplits, } from './controllers/components/model-io/web-loader.js';
// try {
//     // console.log(prompt.promptMessages);
// //   const response = await ragChain.invoke({
// //   context: await retriever.invoke("Who is Messi?"),
// //   question: "Who is Messi?",
// // });
// //   console.log("response: ", response);
// // console.log(allSplits.length);
// } catch (error) {
//   console.log("Cant load from web");
// }
// backend\src\db\mongo-langchain.mts
// import { client, documents, vectorStore } from './db/mongo-langchain.mjs';
// import { customPromptMessages } from './../dist/controllers/components/model-io/web-loader';
// (async () => {
//   try {
//     await client.connect();
//     // await vectorStore.addDocuments(documents, { ids: ["1", "2", "3", "4"] });
//     // await vectorStore.delete({ ids: ["4"] });
//     // console.log("Documents delete successfully!")
//     console.log("Documents added successfully!");
//     const similaritySearchResults = await vectorStore.similaritySearch(
//       "Mitochondria",
//       2
//     );
//     for (const doc of similaritySearchResults) {
//       console.log(`* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
//     }
//   } catch (error) {
//     console.error("Error delete documents:", error);
//   } finally {
//     await client.close();
//   }
// })();
//# sourceMappingURL=index.js.map