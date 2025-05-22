// Direct integration with your existing agent code to enforce image preservation
import { DynamicTool } from "@langchain/core/tools";
import { SystemMessage } from "@langchain/core/messages";
import { parse as parseHTML } from 'node-html-parser';
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
const MEMORY_KEY = "chat_history";
/**
 * Custom image verification tool that integrates directly with search results
 * This ensures all images from search results are preserved exactly
 */
const searchResultImageVerificationTool = new DynamicTool({
    name: 'search_result_image_verification_tool',
    description: 'Verifies that all images from search results are preserved exactly in agent responses',
    func: async (input) => {
        try {
            const data = JSON.parse(input);
            const searchResults = data.searchResults || [];
            const response = data.response || "";
            // Extract all image references from search results
            const contextImages = [];
            for (const result of searchResults) {
                if (typeof result === 'string') {
                    const extractedImages = extractAllImageReferencesWithContext(result);
                    contextImages.push(...extractedImages);
                }
            }
            // Extract image references from response
            const responseImages = extractAllImageReferencesWithContext(response);
            // Check for virtual or placeholder images
            const virtualImages = responseImages.filter(img => isPlaceholderOrVirtualImage(img));
            // Check for any response images that weren't in context
            const unauthorizedImages = responseImages.filter(img => {
                // Skip SVG content for this check
                if (img.startsWith('<svg'))
                    return false;
                return !contextImages.some(contextImg => 
                // For URL comparison, normalize by removing protocol and query params
                normalizeImageUrl(contextImg) === normalizeImageUrl(img));
            });
            return JSON.stringify({
                verified: virtualImages.length === 0 && unauthorizedImages.length === 0,
                virtualImagesFound: virtualImages,
                unauthorizedImagesFound: unauthorizedImages,
                contextImagesCount: contextImages.length,
                responseImagesCount: responseImages.length,
                recommendation: virtualImages.length > 0 || unauthorizedImages.length > 0
                    ? "Response contains virtual or unauthorized images and must be corrected"
                    : "Response correctly preserves all image references from context"
            });
        }
        catch (error) {
            console.error("Error in search result image verification tool:", error);
            return JSON.stringify({
                verified: false,
                error: "Error processing verification request"
            });
        }
    }
});
/**
 * Enhanced version of the hybrid search tool with image preservation awareness
 */
function enhanceHybridSearchTool(originalTool) {
    return new DynamicTool({
        name: originalTool.name,
        description: originalTool.description,
        func: async (input) => {
            try {
                // Call the original tool function
                const result = await originalTool.func(input);
                // Process the result to cache image references
                if (result) {
                    try {
                        const parsedResult = JSON.parse(result);
                        // If we have context, extract image references
                        if (parsedResult.context && Array.isArray(parsedResult.context)) {
                            // Extract and cache image references
                            const imageReferences = [];
                            for (const contextItem of parsedResult.context) {
                                if (typeof contextItem === 'string') {
                                    const extractedImages = extractAllImageReferencesWithContext(contextItem);
                                    imageReferences.push(...extractedImages);
                                }
                            }
                            // Add image references to result metadata
                            if (!parsedResult.metadata) {
                                parsedResult.metadata = {};
                            }
                            parsedResult.metadata.imageReferences = imageReferences;
                            // Enhanced message about image preservation
                            if (imageReferences.length > 0) {
                                parsedResult.metadata.imagePreservationRequired = true;
                                parsedResult.metadata.imagePreservationMessage = `Found ${imageReferences.length} image references that MUST be preserved exactly.`;
                            }
                            return JSON.stringify(parsedResult);
                        }
                    }
                    catch (e) {
                        // If parsing fails, return the original result
                        console.error("Error enhancing hybrid search results:", e);
                    }
                }
                return result;
            }
            catch (error) {
                console.error("Error in enhanced hybrid search tool:", error);
                return null;
            }
        }
    });
}
/**
 * Extract all image references along with their surrounding context
 */
function extractAllImageReferencesWithContext(text) {
    const references = [];
    // Handle HTML content
    try {
        const root = parseHTML(text);
        // Extract img tags
        const imgElements = root.querySelectorAll('img');
        for (const img of imgElements) {
            const src = img.getAttribute('src');
            if (src) {
                references.push(src);
            }
        }
        // Extract SVG elements
        const svgElements = root.querySelectorAll('svg');
        for (const svg of svgElements) {
            references.push(svg.outerHTML);
        }
        // If we found references through HTML parsing, return them
        if (references.length > 0) {
            return references;
        }
    }
    catch (e) {
        // If HTML parsing fails, fall back to regex extraction
    }
    // Fall back to regex extraction for non-HTML content
    // Extract img src attributes
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/g;
    let match;
    while ((match = imgRegex.exec(text)) !== null) {
        references.push(match[1]);
    }
    // Extract background-image urls
    const bgRegex = /background(?:-image)?:\s*url\(['"]?([^'")]+)['"]?\)/g;
    while ((match = bgRegex.exec(text)) !== null) {
        references.push(match[1]);
    }
    // Extract SVG elements
    const svgRegex = /<svg[^>]*>[\s\S]*?<\/svg>/g;
    while ((match = svgRegex.exec(text)) !== null) {
        references.push(match[0]);
    }
    // Look for possible image URLs in text (not in HTML tags)
    const urlRegex = /(https?:\/\/[^\s"'<>]+\.(png|jpg|jpeg|gif|svg|webp))/g;
    while ((match = urlRegex.exec(text)) !== null) {
        references.push(match[1]);
    }
    // Return unique references
    return [...new Set(references)];
}
/**
 * Check if an image reference is a placeholder or virtual URL
 */
function isPlaceholderOrVirtualImage(reference) {
    // Skip SVG content for this check
    if (reference.startsWith('<svg'))
        return false;
    // Check common placeholder patterns
    const placeholderPatterns = [
        /\/api\/placeholder\//i,
        /placeholder\.(com|io|jpg|png|gif)/i,
        /example\.(com|org|net)/i,
        /sample[_\-]?image/i,
        /dummy[_\-]?image/i,
        /demo[_\-]?image/i,
        /\/(placeholder|example|sample|dummy|demo)\//i,
        /placekitten/i,
        /placehold\.it/i,
        /lorempixel/i,
        /picsum/i,
        /unsplash\.it/i,
        /dummyimage\.com/i,
        /^\/images\//i, // Relative paths that don't appear in context
        /^\/static\//i, // Relative paths that don't appear in context
        /^\/assets\//i // Relative paths that don't appear in context
    ];
    return placeholderPatterns.some(pattern => pattern.test(reference));
}
/**
 * Normalize an image URL for comparison
 */
function normalizeImageUrl(url) {
    if (url.startsWith('<svg'))
        return url; // Skip SVG content
    return url
        .replace(/^https?:\/\//, '') // Remove protocol
        .replace(/\?.*$/, '') // Remove query params
        .replace(/#.*$/, '') // Remove hash
        .replace(/&amp;/g, '&') // Normalize HTML entities
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}
/**
 * Modified front-end dev prompt with strict image link preservation
 */
const enhancedFrontEndDevPrompt = (originalPrompt) => {
    return ChatPromptTemplate.fromMessages([
        ["system",
            `${originalPrompt}
            
            CRITICAL IMAGE LINK AND COMPONENT PRESERVATION RULES:
            
            1. ABSOLUTELY NO VIRTUAL LINKS: You must NEVER create, generate, or substitute ANY image links, paths, or references. This includes:
               - NEVER using placeholder URLs like "/api/placeholder/..." or similar
               - NEVER creating artificial image links like "example.com/image.jpg"
               - NEVER suggesting image URLs that didn't appear in the original context
            
            2. EXACT PRESERVATION REQUIRED: All image sources, links, and paths from the context MUST be preserved EXACTLY as provided, without ANY modifications whatsoever. This includes:
               - All <img> tag src attributes
               - All srcset attributes and values
               - All CSS background images
               - All image paths in any format
               - All SVG components and their contents
            
            3. FORBIDDEN ACTIONS:
               - DO NOT modify any image path, even to "fix" or "improve" it
               - DO NOT replace actual paths with placeholders
               - DO NOT create self-generated virtual links for ANY reason
               - DO NOT convert or transform image formats or paths
               - DO NOT suggest alternative images or paths
            
            4. VERIFICATION REQUIREMENT: Before responding, you MUST verify that ALL image links, paths, and components from the original context are preserved EXACTLY in your response.
            
            5. ABSOLUTE COMPLIANCE: If you cannot adhere to these requirements, you MUST explicitly state that you are unable to generate or modify image links, and you MUST use only the exact original context.
            
            THIS IS A ZERO TOLERANCE POLICY. ANY VIOLATION WILL BE TREATED AS A CRITICAL FAILURE.
            
            Context from relevant documentation: {context}
            Previous code context: {code_context}
            `],
        new MessagesPlaceholder(MEMORY_KEY),
        ["human", "{input}"],
        new MessagesPlaceholder("agent_scratchpad"),
    ]);
};
/**
 * Post-execution verification and correction middleware
 */
async function imagePreservationPostProcessor(result, originalContext, conversationId) {
    // Skip if result isn't a string
    if (typeof result.output !== 'string')
        return result;
    // Extract image references from context and result
    const contextImages = extractAllImageReferencesWithContext(originalContext);
    const resultImages = extractAllImageReferencesWithContext(result.output);
    // Check for placeholder or virtual images
    const virtualImages = resultImages.filter(img => isPlaceholderOrVirtualImage(img));
    // If virtual images found, we need to correct the response
    if (virtualImages.length > 0) {
        console.log(`Found ${virtualImages.length} virtual/placeholder images in the response - applying correction`);
        let correctedOutput = result.output;
        // Replace each virtual image with either a context image or a removal
        for (const virtualImg of virtualImages) {
            // Try to find a replacement from context
            if (contextImages.length > 0) {
                // Replace with first context image (simple approach)
                // For img tags
                const imgTagRegex = new RegExp(`<img[^>]*src=["']${escapeRegExp(virtualImg)}["'][^>]*>`, 'g');
                correctedOutput = correctedOutput.replace(imgTagRegex, (match) => {
                    // Extract alt text if available
                    const altMatch = match.match(/alt=["']([^"']*)["']/);
                    const alt = altMatch ? altMatch[1] : "Image from context";
                    return `<img src="${contextImages[0]}" alt="${alt}">`;
                });
                // For background images
                const bgRegex = new RegExp(`background(?:-image)?:\\s*url\\(['"]?${escapeRegExp(virtualImg)}['"]?\\)`, 'g');
                correctedOutput = correctedOutput.replace(bgRegex, `background-image: url('${contextImages[0]}')`);
                // For direct URL references
                const urlRegex = new RegExp(escapeRegExp(virtualImg), 'g');
                correctedOutput = correctedOutput.replace(urlRegex, contextImages[0]);
            }
            else {
                // If no context images available, remove the virtual image references
                const imgTagRegex = new RegExp(`<img[^>]*src=["']${escapeRegExp(virtualImg)}["'][^>]*>`, 'g');
                correctedOutput = correctedOutput.replace(imgTagRegex, '');
                const bgRegex = new RegExp(`background(?:-image)?:\\s*url\\(['"]?${escapeRegExp(virtualImg)}['"]?\\)`, 'g');
                correctedOutput = correctedOutput.replace(bgRegex, 'background: none');
            }
        }
        // Add a warning note
        correctedOutput += "\n\n[SYSTEM NOTE: Virtual or placeholder image references are not allowed. Only exact image references from the original context may be used.]";
        // Update the result
        result.output = correctedOutput;
    }
    return result;
}
/**
 * Escape special characters in regex
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/**
 * Custom verification middleware for your existing executeWithCodeHandling function
 */
const verifyAndCorrectImages = async (executeWithCodeHandling, input, chatHistory = [], conversationId = "default") => {
    // Inject strong image preservation directives into chat history
    const enhancedChatHistory = [...chatHistory];
    // Add directive at the beginning
    enhancedChatHistory.unshift(new SystemMessage({
        content: `CRITICAL IMAGE DIRECTIVE: 
        1. You must NEVER create or use placeholder image URLs like "/api/placeholder/..." 
        2. You must NEVER generate virtual image links.
        3. You must use ONLY the EXACT image paths from the original context.
        4. If no image paths are in the context, do not include images in your response.
        
        This is a ZERO TOLERANCE requirement - no exceptions allowed.`
    }));
    // Extract original context from chat history
    let originalContext = "";
    for (const message of chatHistory) {
        if (message.role === 'system' || (message instanceof SystemMessage)) {
            const content = typeof message.content === 'string' ?
                message.content : JSON.stringify(message.content);
            if (content.includes('Context from relevant documentation:')) {
                try {
                    const contextMatch = content.match(/Context from relevant documentation:(.*?)Previous code context:/s);
                    if (contextMatch && contextMatch[1]) {
                        originalContext += contextMatch[1].trim() + "\n";
                    }
                }
                catch (e) {
                    console.error("Error extracting context:", e);
                }
            }
        }
    }
    // Execute with enhanced chat history
    const result = await executeWithCodeHandling(input, enhancedChatHistory, conversationId);
    // Post-process the result to verify and correct images if needed
    return imagePreservationPostProcessor(result, originalContext, conversationId);
};
/**
 * Higher-order function to wrap your executeWithNLP function
 */
function createImagePreservingExecuteWithNLP(originalExecuteWithNLP) {
    return async (input, chatHistory = [], conversationId = "default") => {
        // Inject strong image preservation directives
        const enhancedChatHistory = [...chatHistory];
        // Add directive at the beginning
        enhancedChatHistory.unshift(new SystemMessage({
            content: `CRITICAL IMAGE DIRECTIVE: 
            1. You must NEVER create or use placeholder image URLs like "/api/placeholder/..." 
            2. You must NEVER generate virtual image links.
            3. You must use ONLY the EXACT image paths from the original context.
            4. If no image paths are in the context, do not include images in your response.
            
            This is a ZERO TOLERANCE requirement - no exceptions allowed.`
        }));
        // Extract original context
        let originalContext = "";
        for (const message of chatHistory) {
            if (message.role === 'system' || (message instanceof SystemMessage)) {
                const content = typeof message.content === 'string' ?
                    message.content : JSON.stringify(message.content);
                if (content.includes('Context from relevant documentation:')) {
                    try {
                        const contextMatch = content.match(/Context from relevant documentation:(.*?)Previous code context:/s);
                        if (contextMatch && contextMatch[1]) {
                            originalContext += contextMatch[1].trim() + "\n";
                        }
                    }
                    catch (e) {
                        console.error("Error extracting context:", e);
                    }
                }
            }
        }
        // Execute with the original function
        const result = await originalExecuteWithNLP(input, enhancedChatHistory, conversationId);
        // Post-process to verify and correct images
        return imagePreservationPostProcessor(result, originalContext, conversationId);
    };
}
/**
 * Direct patch to modify your execution environment for strict image preservation
 */
export function patchAgentForImagePreservation(agent) {
    // 1. Enhance the system prompt with image preservation directives
    if (agent.frontEndDevPrompt) {
        agent.frontEndDevPrompt = enhancedFrontEndDevPrompt(agent.frontEndDevPrompt);
        console.log("Agent prompt enhanced with image preservation directives");
    }
    // 2. Add the image verification tool to the tools array
    if (agent.tools && Array.isArray(agent.tools)) {
        agent.tools.push(searchResultImageVerificationTool);
        console.log("Image verification tool added to agent tools");
    }
    // 3. Enhance the hybrid search tool if it exists
    if (agent.tools && Array.isArray(agent.tools)) {
        const hybridSearchIndex = agent.tools.findIndex(tool => tool.name === 'hybrid_search_tool');
        if (hybridSearchIndex >= 0) {
            agent.tools[hybridSearchIndex] = enhanceHybridSearchTool(agent.tools[hybridSearchIndex]);
            console.log("Hybrid search tool enhanced with image awareness");
        }
    }
    // 4. Wrap the execute functions with image preservation
    if (agent.executeWithCodeHandling) {
        const originalExecuteWithCodeHandling = agent.executeWithCodeHandling;
        agent.executeWithCodeHandling = async (input, chatHistory, conversationId) => {
            return verifyAndCorrectImages(originalExecuteWithCodeHandling, input, chatHistory, conversationId);
        };
        console.log("executeWithCodeHandling enhanced with image preservation");
    }
    if (agent.executeWithNLP) {
        agent.executeWithNLP = createImagePreservingExecuteWithNLP(agent.executeWithNLP);
        console.log("executeWithNLP enhanced with image preservation");
    }
    // 5. Add a post-execution hook if supported
    if (agent.executorGPT && agent.executorGPT.hooks) {
        agent.executorGPT.hooks.beforeExecution = async (input, config) => {
            // Add image preservation directives to the system message
            if (config.chat_history && Array.isArray(config.chat_history)) {
                config.chat_history.unshift(new SystemMessage({
                    content: `CRITICAL: You must NEVER create, generate, or use virtual image links or placeholders. Use ONLY exact image references from context.`
                }));
            }
            return { input, config };
        };
        agent.executorGPT.hooks.afterExecution = async (result, context) => {
            // Verify and fix any image reference issues
            if (typeof result.output === 'string' && context.chat_history) {
                // Extract original context
                let originalContext = "";
                for (const message of context.chat_history) {
                    if (message.role === 'system' || (message instanceof SystemMessage)) {
                        const content = typeof message.content === 'string' ?
                            message.content : JSON.stringify(message.content);
                        if (content.includes('Context from relevant documentation:')) {
                            try {
                                const contextMatch = content.match(/Context from relevant documentation:(.*?)Previous code context:/s);
                                if (contextMatch && contextMatch[1]) {
                                    originalContext += contextMatch[1].trim() + "\n";
                                }
                            }
                            catch (e) {
                                console.error("Error extracting context:", e);
                            }
                        }
                    }
                }
                // Correct any image issues
                return imagePreservationPostProcessor(result, originalContext, context.conversationId || "default");
            }
            return result;
        };
        console.log("Agent executor hooks installed for image preservation");
    }
    console.log("Agent successfully patched for strict image link preservation");
    return agent;
}
// Export all the functions
export { searchResultImageVerificationTool, enhanceHybridSearchTool, imagePreservationPostProcessor, verifyAndCorrectImages, createImagePreservingExecuteWithNLP, enhancedFrontEndDevPrompt };
//# sourceMappingURL=agentIntegration.js.map