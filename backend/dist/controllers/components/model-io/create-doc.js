// Creating documents
/*
A document at its core is fairly simple.
It consists of a piece of text and optional metadata.
The piece of text is what we interact with the language model,
while the optional metadata is useful for keeping track of metadata about the document (such as the source).
interface Document {
  pageContent: string;
  metadata: Record<string, any>;
}
  or just import it from langchain like below

You can create a document object rather easily in LangChain with:

import { Document } from "langchain/document";

const doc = new Document({ pageContent: "foo" });
*/
// You can create one with metadata with:
import { Document } from "langchain/document";
const doc = new Document({ pageContent: "foo", metadata: { source: "1" } });
//# sourceMappingURL=create-doc.js.map