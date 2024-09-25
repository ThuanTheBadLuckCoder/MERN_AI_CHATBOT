import { vectorStore } from "../elastic-vectorstore.js";
const linkSources = "https://thuanthebadluckcoder.github.io/Messi.html";
const document = {
    pageContent: "Tester",
    metadata: { source: `${linkSources}` }
};
const documents = [document];
const addFunctionCompelete = await vectorStore.addDocuments(documents, { ids: ["5"] });
export { addFunctionCompelete };
//# sourceMappingURL=elastic-addFunction.js.map