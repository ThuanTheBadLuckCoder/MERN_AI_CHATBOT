import { ElasticVectorSearch } from "@langchain/community/vectorstores/elasticsearch";
import { Client } from "@elastic/elasticsearch";
import { config, embeddingsOpenAI } from "../config/elastic-config.js";
import { randomUUID } from "crypto";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
});
/**
 * Processes and stores code components in Elasticsearch with enhanced metadata
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
        // Detect languages if not provided
        const detectedLanguages = detectLanguages(content, file_format);
        const componentLanguages = languages.length > 0 ? languages : detectedLanguages;
        // Generate component name if not provided
        const componentName = name || generateComponentName(content, file_format);
        // Generate description if not provided
        const componentDescription = description || generateComponentDescription(content, file_format);
        // Extract features
        const features = extractFeatures(content, file_format);
        // Determine if responsive
        const isResponsive = checkIfResponsive(content);
        // Determine framework
        const framework = detectFramework(content);
        // Determine component type
        const componentType = detectComponentType(content);
        // Create document with enhanced metadata
        const loadedDocs = [
            {
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
                    features: features
                },
            }
        ];
        console.log("Prepared document with metadata:", loadedDocs[0].metadata);
        // Split documents for better semantic search
        const splits = await textSplitter.splitDocuments(loadedDocs);
        // Prepare documents for vectorization - maintain the same document_id across chunks
        const documents = splits.map((split, index) => ({
            pageContent: split.pageContent,
            metadata: {
                ...split.metadata,
                chunk_id: randomUUID(),
                chunk_index: index,
                total_chunks: splits.length,
            },
        }));
        // Initialize vector store
        const clientArgs = {
            client: new Client(config),
            indexName: process.env.ELASTIC_INDEX ?? `${index}`,
        };
        const vectorStore = new ElasticVectorSearch(embeddingsOpenAI, clientArgs);
        // Add documents to Elasticsearch
        const result = await vectorStore.addDocuments(documents);
        console.log("Successfully added vectors to Elasticsearch:", result);
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
                chunks: splits.length
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