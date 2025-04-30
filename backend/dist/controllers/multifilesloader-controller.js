import { ElasticVectorSearch } from "@langchain/community/vectorstores/elasticsearch";
import { Client } from "@elastic/elasticsearch";
import { config, embeddingsOpenAI } from "../config/elastic-config.js";
import { randomUUID } from "crypto";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
// Original text splitter - keep this for compatibility
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
});
/**
 * Intelligent Code Splitter - Splits code documents in a semantically meaningful way
 */
class IntelligentCodeSplitter {
    /**
     * Split a code document based on its structure and semantics
     */
    static splitCodeDocument(content, fileFormat) {
        // Determine the appropriate splitting strategy based on file format
        switch (fileFormat.toLowerCase()) {
            case 'html':
                return this.splitHtmlDocument(content);
            case 'javascript':
            case 'js':
                return this.splitJavaScriptDocument(content);
            case 'css':
                return this.splitCssDocument(content);
            default:
                // Default to generic code splitting
                return this.splitGenericCode(content);
        }
    }
    /**
     * Split HTML document at meaningful boundaries (components/sections)
     */
    static splitHtmlDocument(content) {
        const chunks = [];
        // Always keep the document structure (DOCTYPE, html, head)
        let documentStructure = '';
        // Extract document structure if present
        const doctypeMatch = content.match(/(<!DOCTYPE[^>]*>[\s\S]*?<body[^>]*>)/i);
        if (doctypeMatch) {
            documentStructure = doctypeMatch[1];
            // Remove the structure from content for further processing
            content = content.replace(doctypeMatch[1], '');
        }
        // Also capture closing tags if present
        let closingStructure = '';
        const closingMatch = content.match(/(<\/body>[\s\S]*?<\/html>)/i);
        if (closingMatch) {
            closingStructure = closingMatch[1];
            content = content.replace(closingMatch[1], '');
        }
        // Find major HTML component boundaries
        const componentRegexes = [
            /<section[^>]*>[\s\S]*?<\/section>/g,
            /<div[^>]*?(?:id|class)=[^>]*?>[\s\S]*?<\/div>/g,
            /<article[^>]*>[\s\S]*?<\/article>/g,
            /<nav[^>]*>[\s\S]*?<\/nav>/g,
            /<header[^>]*>[\s\S]*?<\/header>/g,
            /<footer[^>]*>[\s\S]*?<\/footer>/g,
            /<main[^>]*>[\s\S]*?<\/main>/g,
            /<form[^>]*>[\s\S]*?<\/form>/g
        ];
        // Extract components using regexes
        let remainingContent = content;
        const extractedComponents = [];
        componentRegexes.forEach(regex => {
            const matches = remainingContent.match(regex);
            if (matches) {
                matches.forEach(match => {
                    extractedComponents.push(match);
                    // Remove matched content to avoid duplicates
                    remainingContent = remainingContent.replace(match, '<!-- COMPONENT_EXTRACTED -->');
                });
            }
        });
        // Check if we have any substantial remaining content 
        remainingContent = remainingContent.replace(/<!-- COMPONENT_EXTRACTED -->/g, '').trim();
        if (remainingContent.length > 50) {
            extractedComponents.push(remainingContent);
        }
        // Create chunks with proper structure
        if (extractedComponents.length === 0) {
            // If no components were extracted, just return the full content
            return [content];
        }
        extractedComponents.forEach(component => {
            // For the first chunk, include document structure
            if (chunks.length === 0 && documentStructure) {
                chunks.push(`${documentStructure}\n${component}\n${closingStructure}`);
            }
            else {
                // For subsequent chunks, include minimal context
                const context = documentStructure ?
                    `<!-- This is part of a larger HTML document -->\n` : '';
                chunks.push(`${context}${component}`);
            }
        });
        return chunks;
    }
    /**
     * Split JavaScript document at function/class boundaries
     */
    static splitJavaScriptDocument(content) {
        const chunks = [];
        // Get imports and top-level declarations
        const importsMatch = content.match(/(import[\s\S]*?;(\r?\n|$))+/g);
        let imports = importsMatch ? importsMatch.join('\n') : '';
        // Find function and class declarations
        const functionRegex = /(\/\*\*[\s\S]*?\*\/\s*)?(async\s+)?function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g;
        const classRegex = /(\/\*\*[\s\S]*?\*\/\s*)?class\s+\w+(\s+extends\s+\w+)?\s*\{[\s\S]*?\n\}/g;
        const arrowFunctionRegex = /(\/\*\*[\s\S]*?\*\/\s*)?(const|let|var)\s+\w+\s*=\s*(async\s*)?\([^)]*\)\s*=>\s*\{[\s\S]*?\n\}/g;
        // Extract all function-like structures
        const functionMatches = content.match(functionRegex) || [];
        const classMatches = content.match(classRegex) || [];
        const arrowMatches = content.match(arrowFunctionRegex) || [];
        // Combine all matched code blocks
        const codeBlocks = [...functionMatches, ...classMatches, ...arrowMatches];
        // If we found code blocks, create chunks with imports
        if (codeBlocks.length > 0) {
            codeBlocks.forEach(block => {
                chunks.push(`${imports}\n\n${block}`);
            });
            // Check for remaining content
            let remainingContent = content;
            codeBlocks.forEach(block => {
                remainingContent = remainingContent.replace(block, '');
            });
            remainingContent = remainingContent.replace(imports, '').trim();
            if (remainingContent.length > 50) {
                chunks.push(`${imports}\n\n${remainingContent}`);
            }
        }
        else {
            // No functions/classes found, use generic approach
            return this.splitGenericCode(content);
        }
        return chunks;
    }
    /**
     * Split CSS document at rule boundaries
     */
    static splitCssDocument(content) {
        const chunks = [];
        // Extract @import and other top declarations
        const importRegex = /(@import[^;]*;(\r?\n|$))+/g;
        const importMatches = content.match(importRegex);
        let importSection = importMatches ? importMatches.join('\n') : '';
        // Find media queries (keep these as units)
        const mediaQueryRegex = /@media\s+[^{]+\{[\s\S]*?\n\}/g;
        const mediaQueries = content.match(mediaQueryRegex) || [];
        // Find keyframes
        const keyframesRegex = /@keyframes\s+[^{]+\{[\s\S]*?\n\}/g;
        const keyframes = content.match(keyframesRegex) || [];
        // Find CSS rule sets (selector + rules)
        const ruleSetRegex = /([^{}])+\{[^{}]+\}/g;
        const ruleSets = content.match(ruleSetRegex) || [];
        // Combine special blocks (media queries, keyframes)
        const specialBlocks = [...mediaQueries, ...keyframes];
        // If we found special blocks, they become their own chunks
        if (specialBlocks.length > 0) {
            specialBlocks.forEach(block => {
                chunks.push(`${importSection}\n\n${block}`);
            });
        }
        // Group regular rule sets into chunks of reasonable size
        const MAX_RULES_PER_CHUNK = 10;
        for (let i = 0; i < ruleSets.length; i += MAX_RULES_PER_CHUNK) {
            const ruleChunk = ruleSets.slice(i, i + MAX_RULES_PER_CHUNK).join('\n\n');
            chunks.push(`${importSection}\n\n${ruleChunk}`);
        }
        // If no chunks were created, return the entire document
        if (chunks.length === 0) {
            return [content];
        }
        return chunks;
    }
    /**
     * Generic code splitting for other code types
     */
    static splitGenericCode(content) {
        // For generic code, we'll use a simpler approach based on line count
        const lines = content.split(/\r?\n/);
        const chunks = [];
        const CHUNK_SIZE = 50; // Lines per chunk
        // Create chunks of reasonable line counts
        for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
            const chunkLines = lines.slice(i, i + CHUNK_SIZE);
            chunks.push(chunkLines.join('\n'));
        }
        return chunks.length > 0 ? chunks : [content];
    }
}
/**
 * Processes and stores code components in Elasticsearch with enhanced metadata
 * Using a hierarchical approach to maintain complete code while improving search
 */
export const EmbeddingsVectorStore = async (req, res, next) => {
    try {
        const { name, content, index, description = "", languages = [], file_format = "HTML" } = req.body;
        console.log("Processing file:", name);
        console.log("Target index:", index);
        // Generate unique document ID
        const documentId = randomUUID();
        // Create timestamp for embedding
        const embeddingTimestamp = new Date().toISOString();
        // Process metadata (same as original)
        const detectedLanguages = detectLanguages(content, file_format);
        const componentLanguages = languages.length > 0 ? languages : detectedLanguages;
        const componentName = name || generateComponentName(content, file_format);
        const componentDescription = description || generateComponentDescription(content, file_format);
        const features = extractFeatures(content, file_format);
        const isResponsive = checkIfResponsive(content);
        const framework = detectFramework(content);
        const componentType = detectComponentType(content);
        // Create the PARENT document with full content and complete metadata
        const parentDocument = {
            pageContent: content,
            metadata: {
                source: componentName,
                file_format: file_format,
                languages: componentLanguages,
                description: componentDescription,
                created_at: embeddingTimestamp,
                document_id: documentId,
                component_name: componentName,
                component_type: componentType,
                framework: framework,
                responsive: isResponsive,
                features: features,
                is_parent: true, // Flag to identify parent documents
                has_children: false, // Will be set to true if we create child documents
                child_count: 0 // Will be updated if we create child documents
            },
        };
        console.log("Prepared parent document with metadata:", parentDocument.metadata);
        // Initialize vector store
        const clientArgs = {
            client: new Client(config),
            indexName: process.env.ELASTIC_INDEX ?? `${index}`,
        };
        const vectorStore = new ElasticVectorSearch(embeddingsOpenAI, clientArgs);
        // First, add the COMPLETE parent document to Elasticsearch
        await vectorStore.addDocuments([parentDocument]);
        // Create array to track all documents
        const documents = [parentDocument]; // Start with the parent document
        // Only split large documents (e.g., over 3000 characters)
        if (content.length > 3000) {
            // Try intelligent splitting first
            const codeChunks = IntelligentCodeSplitter.splitCodeDocument(content, file_format);
            // If we have multiple chunks after intelligent splitting
            if (codeChunks.length > 1) {
                // Update parent document metadata
                parentDocument.metadata.has_children = true;
                parentDocument.metadata.child_count = codeChunks.length;
                // We need to replace the parent document to update metadata
                // ElasticSearch doesn't allow direct metadata updates, so delete and re-add
                const query = {
                    term: {
                        "metadata.document_id": documentId
                    }
                };
                // Use the appropriate method for deletion based on the ElasticSearch client
                try {
                    // If using bulk delete API (if available)
                    await vectorStore.delete({
                        ids: [documentId]
                    });
                }
                catch (error) {
                    console.error("Error deleting document for metadata update:", error);
                    // If delete method fails, just continue with adding updated document
                }
                // Add updated parent document back
                await vectorStore.addDocuments([parentDocument]);
                // Prepare child documents with links to parent
                const childDocuments = codeChunks.map((chunk, index) => ({
                    pageContent: chunk,
                    metadata: {
                        ...parentDocument.metadata,
                        is_parent: false,
                        parent_id: documentId,
                        chunk_id: randomUUID(),
                        chunk_index: index,
                        total_chunks: codeChunks.length,
                        snippet_type: "code_chunk"
                    },
                }));
                // Add child documents to Elasticsearch
                await vectorStore.addDocuments(childDocuments);
                // Add child documents to our result array
                documents.push(...childDocuments);
                console.log(`Added ${codeChunks.length} intelligent chunks as child documents`);
            }
            else {
                // Fall back to original splitting method if intelligent splitting didn't produce multiple chunks
                const splits = await textSplitter.splitDocuments([parentDocument]);
                if (splits.length > 1) {
                    // Update parent document metadata
                    parentDocument.metadata.has_children = true;
                    parentDocument.metadata.child_count = splits.length;
                    // Replace parent document with updated metadata
                    const query = {
                        term: {
                            "metadata.document_id": documentId
                        }
                    };
                    try {
                        // The delete method expects an object with an ids array
                        await vectorStore.delete({
                            ids: [documentId]
                        });
                    }
                    catch (error) {
                        console.error("Error deleting document for metadata update:", error);
                        console.log("Continuing with document update without deletion");
                    }
                    await vectorStore.addDocuments([parentDocument]);
                    // Create child documents
                    const childDocuments = splits.map((split, index) => ({
                        pageContent: split.pageContent,
                        metadata: {
                            ...split.metadata,
                            is_parent: false,
                            parent_id: documentId,
                            chunk_id: randomUUID(),
                            chunk_index: index,
                            total_chunks: splits.length,
                            snippet_type: "code_chunk"
                        },
                    }));
                    // Add child documents to Elasticsearch
                    await vectorStore.addDocuments(childDocuments);
                    // Add child documents to our result array
                    documents.push(...childDocuments);
                    console.log(`Added ${splits.length} text splitter chunks as child documents`);
                }
            }
        }
        console.log(`Successfully added ${documents.length} vectors to Elasticsearch (1 parent + ${documents.length - 1} children)`);
        return res.status(200).json({
            message: "Component successfully embedded",
            component: {
                id: documentId,
                name: componentName,
                description: componentDescription,
                file_format: file_format,
                languages: componentLanguages,
                component_type: componentType,
                framework: framework,
                features: features,
                responsive: isResponsive,
                embedded_at: embeddingTimestamp,
                index: index,
                chunks: documents.length,
                has_chunks: documents.length > 1
            }
        });
    }
    catch (error) {
        console.error("Error embedding component:", error);
        return res.status(500).json({
            message: "Failed to embed component",
            cause: error.message
        });
    }
};
/**
 * Detects languages used in the content
 */
function detectLanguages(content, fileFormat) {
    const languages = new Set();
    // Add the base file format
    languages.add(fileFormat);
    // Check for CSS
    if (content.includes("<style>") || content.includes("class=")) {
        languages.add("CSS");
    }
    // Check for JavaScript
    if (content.includes("<script>") || content.includes("addEventListener")) {
        languages.add("JavaScript");
    }
    return Array.from(languages);
}
/**
 * Generates a descriptive name for the component
 */
function generateComponentName(content, fileFormat) {
    // Basic component name generation - could be enhanced with ML
    if (content.includes("navbar") || content.includes("nav") && content.includes("menu")) {
        return "Responsive Navigation Bar";
    }
    if (content.includes("form") && content.includes("input")) {
        return "Form Component";
    }
    if (content.includes("card") || (content.includes("div") && content.includes("shadow"))) {
        return "Card Component";
    }
    return `${fileFormat} Component-${randomUUID().slice(0, 8)}`;
}
/**
 * Generates a description for the component based on content analysis
 */
function generateComponentDescription(content, fileFormat) {
    // For navigation components
    if (content.includes("navbar") || content.includes("nav") && content.includes("menu")) {
        if (content.includes("mobile") || content.includes("lg:hidden")) {
            return "Responsive navigation bar with desktop and mobile layouts";
        }
        return "Navigation bar component";
    }
    // For form components
    if (content.includes("form") && content.includes("input")) {
        return "Form input component";
    }
    // Generic description
    return `${fileFormat} component with ${content.length} characters`;
}
/**
 * Extracts key features from the component
 */
function extractFeatures(content, fileFormat) {
    const features = [];
    // Navigation features
    if (content.includes("hamburger") || content.includes("open-menu")) {
        features.push("hamburger icon");
    }
    if (content.includes("dropdown") || content.includes("mobile-menu")) {
        features.push("dropdown");
    }
    if (content.includes("mobile") || content.includes("hidden lg:")) {
        features.push("mobile menu");
    }
    // Button features
    if (content.includes("button") || content.includes("btn")) {
        features.push("button");
    }
    if (content.includes("sign up") || content.includes("signup")) {
        features.push("sign up button");
    }
    return features;
}
/**
 * Checks if component is responsive
 */
function checkIfResponsive(content) {
    return content.includes("responsive") ||
        content.includes("sm:") ||
        content.includes("md:") ||
        content.includes("lg:") ||
        content.includes("@media");
}
/**
 * Detects framework used in the component
 */
function detectFramework(content) {
    if (content.includes("tailwind")) {
        return "Tailwind CSS";
    }
    if (content.includes("bootstrap")) {
        return "Bootstrap";
    }
    if (content.includes("mui") || content.includes("material-ui")) {
        return "Material UI";
    }
    if (content.includes("react")) {
        return "React";
    }
    return "Unknown";
}
/**
 * Detects the type of component
 */
function detectComponentType(content) {
    if (content.includes("nav") || content.includes("menu")) {
        return "Navigation";
    }
    if (content.includes("form") || content.includes("input") || content.includes("textarea")) {
        return "Form";
    }
    if (content.includes("card") || content.includes("thumbnail")) {
        return "Card";
    }
    if (content.includes("button") || content.includes("btn")) {
        return "Button";
    }
    if (content.includes("modal") || content.includes("dialog")) {
        return "Modal";
    }
    if (content.includes("table") || content.includes("td") || content.includes("tr")) {
        return "Table";
    }
    return "UI Component";
}
//# sourceMappingURL=multifilesloader-controller.js.map