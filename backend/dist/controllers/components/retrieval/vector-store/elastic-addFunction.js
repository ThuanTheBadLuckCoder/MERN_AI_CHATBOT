import { vectorStore } from "./elastic-vectorstore.js";
const document1 = {
    pageContent: "The powerhouse of the cell is the mitochondria",
    metadata: { source: "https://example.com" },
};
const document2 = {
    pageContent: "Buildings are made out of brick",
    metadata: { source: "https://example.com" },
};
const document3 = {
    pageContent: "Mitochondria are made out of lipids",
    metadata: { source: "https://example.com" },
};
const document4 = {
    pageContent: "The 2024 Olympics are in Paris",
    metadata: { source: "https://example.com" },
};
const documents = [document1, document2, document3, document4];
await vectorStore.addDocuments(documents, { ids: ["1", "2", "3", "4"] });
//# sourceMappingURL=elastic-addFunction.js.map