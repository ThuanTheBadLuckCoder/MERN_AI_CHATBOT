/*
If you want to implement your own Document Loader, you have a few options.

Subclassing BaseDocumentLoader
You can extend the BaseDocumentLoader class directly.
The BaseDocumentLoader class provides a few convenience methods for loading documents from a variety of sources.

abstract class BaseDocumentLoader implements DocumentLoader {
  abstract load(): Promise<Document[]>;
}
*/
export {};
/*
Subclassing TextLoader
If you want to load documents from a text file, you can extend the TextLoader class.
The TextLoader class takes care of reading the file, so all you have to do is implement a parse method.

abstract class TextLoader extends BaseDocumentLoader {
  abstract parse(raw: string): Promise<string[]>;
}
*/
/*
Subclassing BufferLoader
If you want to load documents from a binary file, you can extend the BufferLoader class. The BufferLoader class takes care of reading the file, so all you have to do is implement a parse method.

abstract class BufferLoader extends BaseDocumentLoader {
  abstract parse(
    raw: Buffer,
    metadata: Document["metadata"]
  ): Promise<Document[]>;
}
*/ 
//# sourceMappingURL=loader-customdoc.js.map