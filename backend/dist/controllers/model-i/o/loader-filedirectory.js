/*
This covers how to load all documents in a directory.

The second argument is a map of file extensions to loader factories. Each file will be passed to the matching loader, and the resulting documents will be concatenated together.

Example folder:

src/document_loaders/example_data/example/
├── example.json
├── example.jsonl
├── example.txt
└── example.csv
*/
// Example code:
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
const loader = new DirectoryLoader("../../data", {
// ".json": (path) => new JSONLoader(path, "/texts"),
// ".jsonl": (path) => new JSONLinesLoader(path, "/html"),
// ".txt": (path) => new TextLoader(path),
// ".csv": (path) => new CSVLoader(path, "text")
});
export const docs = await loader.load();
// console.log({ docs });
//# sourceMappingURL=loader-filedirectory.js.map