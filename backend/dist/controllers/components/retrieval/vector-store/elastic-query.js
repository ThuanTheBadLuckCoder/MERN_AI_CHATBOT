import { vectorStore } from "./elastic-vectorstore.js";
const filter = [
    {
        operator: "match",
        field: "source",
        value: "https://example.com",
    },
];
const similaritySearchResults = await vectorStore.similaritySearch("biology", 1, filter);
// for (const doc of similaritySearchResults) {
//     console.log(`* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
// }
export { similaritySearchResults };
//# sourceMappingURL=elastic-query.js.map