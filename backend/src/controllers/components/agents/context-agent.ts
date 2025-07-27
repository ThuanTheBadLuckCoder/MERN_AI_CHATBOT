/*

# Enhanced Elasticsearch-Based Agent System

## Overview
A streamlined agent system that leverages Elasticsearch for vector similarity search and document retrieval with automatic vector embedding and parent/child document resolution, followed by LLM-powered code generation with strict TailwindCSS constraints.

## Architecture

### Phase 1: Vector Embedding & Document Retrieval
- **Automatic Vector Embedding**: User queries are automatically converted to vector embeddings using the configured embedding model
- **Vector Search**: Use Elasticsearch's vector similarity search capabilities with embedded query vectors
- **User Context**: Only process queries from users who have successfully embedded vectors
- **Similarity Algorithm**: Leverage Elasticsearch's built-in similarity algorithms for vector comparison
- **Document Resolution Strategy**: Implement intelligent parent/child document handling

#### Document Resolution Logic
1. **Initial Search**: Perform vector similarity search and retrieve candidate documents
2. **Parent Document Check**: For each retrieved document, examine the `is_parent` metadata field:
   - **If `is_parent: true`**: Document contains complete information and can be sent directly to LLM
   - **If `is_parent: false`**: Document is a child chunk requiring parent resolution
3. **Parent Resolution Process**: For child documents (`is_parent: false`):
   - Extract the `parent_id` attribute from the document metadata
   - Perform additional Elasticsearch search using filter: `document_id: "<parent_id_here>"`
   - Retrieve the complete parent document with `is_parent: true`
   - Replace or supplement child document with parent document content
4. **Result Selection**: Return complete parent documents that contain sufficient context for LLM processing

### Phase 2: LLM Processing
- **Context Integration**: Pass the retrieved complete parent documents as context to the LLM
- **Prompt Execution**: Use the full document content to inform the LLM's response
- **Code Generation**: Generate executable code based on the complete context
- **Image Preservation**: Maintain exact image paths and references from source documents

### Phase 3: Styling Constraints
- **TailwindCSS Only**: Strictly use TailwindCSS utility classes
- **No External Libraries**: Avoid any CSS frameworks or libraries outside TailwindCSS
- **No Custom CSS**: Restrict to predefined TailwindCSS class names only
- **CDN Integration**: Always include proper TailwindCSS CDN path: `<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>`

## Key Differences from custom-agent.ts
- **Simplified Architecture**: Single-purpose focus on Elasticsearch + LLM with vector embedding
- **Vector-First Approach**: Automatic query vectorization and similarity-based document selection
- **Parent/Child Resolution**: Intelligent document hierarchy handling for complete context
- **Strict Styling Constraints**: Enforced TailwindCSS-only styling
- **User Authentication**: Requires successful vector embedding for access

## Enhanced Implementation Flow

### Phase 1: Query Processing & Vector Embedding
1. **Query Vectorization**: Automatically convert user input to vector embeddings
2. **Chat History Analysis**: Examine conversation history for context continuity
3. **Dependency Assessment**: Determine if current query relies on previous exchanges
4. **Context Necessity Check**: Evaluate whether Elasticsearch retrieval is required

### Phase 2: Intelligent Document Retrieval
5. **Vector Similarity Search**: Query Elasticsearch using embedded vectors
6. **Document Type Analysis**: Check `is_parent` metadata for each result:
   ```javascript
   if (document.metadata.is_parent === true) {
     // Use document directly - contains complete information
     processWithLLM(document);
   } else if (document.metadata.is_parent === false) {
     // Resolve parent document
     const parentId = document.metadata.parent_id;
     const parentDocument = await searchByDocumentId(parentId);
     processWithLLM(parentDocument);
   }
   ```
7. **Parent Document Resolution**: For child documents, fetch complete parent using `document_id` filter
8. **Context Compilation**: Ensure all documents have `is_parent: true` before LLM processing

### Phase 3: Intelligent Routing
9. **History-Based Processing**: If query depends on chat history
   - Analyze conversation patterns and user intent progression
   - Use accumulated context from previous interactions
   - Generate response based on conversational continuity
10. **Knowledge-Based Processing**: If query is self-contained
    - Use resolved parent documents from Elasticsearch
    - Ensure complete context availability
    - Proceed with LLM processing

### Phase 4: LLM Decision Making
11. **Context Evaluation**: LLM analyzes both chat history and complete Elasticsearch documents
12. **Source Prioritization**: Determine primary information source:
    - **Chat History Priority**: When user intent is conversational/iterative
    - **Elasticsearch Priority**: When user needs specific document knowledge
    - **Hybrid Approach**: Combine both sources when beneficial
13. **Response Generation**: Create contextually appropriate response with preserved content

### Phase 5: Output Generation & Preservation
14. **Code Execution**: Generate code with TailwindCSS constraints
15. **Content Preservation**: Maintain exact image paths, links, and source code from parent documents
16. **Quality Assurance**: Ensure response addresses user's actual need

## Document Resolution Examples

### Example 1: Parent Document Found
```javascript
// Initial vector search result
{
  pageContent: "Button styling with Tailwind classes...",
  metadata: {
    is_parent: true,
    document_id: "ui_components_001"
  }
}
// Result: Use directly with LLM
```

### Example 2: Child Document Requires Resolution
```javascript
// Initial vector search result
{
  pageContent: "...partial button implementation...",
  metadata: {
    is_parent: false,
    parent_id: "ui_components_001",
    document_id: "ui_components_001_chunk_3"
  }
}

// Resolution process:
// 1. Extract parent_id: "ui_components_001"
// 2. Search: filter = { document_id: "ui_components_001", is_parent: true }
// 3. Retrieve complete parent document
// 4. Use parent document with LLM
```

## Complete Scenario Examples

### Scenario 1: Chat History Priority with Vector Context
**User Query**: "Make that button bigger and change the color to blue"
- **Vector Embedding**: Convert query to embeddings
- **Context Check**: References previous UI element discussion
- **Document Resolution**: Skip Elasticsearch, use chat history
- **Processing**: LLM uses conversation context about specific button
- **Output**: TailwindCSS modifications: `text-lg px-6 py-3 bg-blue-500`

### Scenario 2: Elasticsearch Priority with Parent Resolution
**User Query**: "How do I implement user authentication in React?"
- **Vector Embedding**: Convert query to embeddings for similarity search
- **Context Check**: New topic, no relevant chat history
- **Document Retrieval**: Vector search returns child document with `is_parent: false`
- **Parent Resolution**: Fetch complete parent document using `parent_id`
- **Processing**: Use complete authentication guide with LLM
- **Output**: React auth code with TailwindCSS styling and preserved image paths

### Scenario 3: Hybrid Approach with Complete Context
**User Query**: "Can you apply the same authentication pattern to the dashboard we built earlier?"
- **Vector Embedding**: Convert query to embeddings
- **Context Check**: References both new concept and previous work
- **Document Resolution**: Ensure parent documents are retrieved for complete context
- **Processing**: Merge complete authentication docs + chat history dashboard
- **Output**: Integrated solution using TailwindCSS with exact content preservation

## Vector Embedding & Document Resolution Matrix

| Query Type | Vector Embedding | Document Type | Resolution Action | LLM Input |
|------------|------------------|---------------|-------------------|-----------|
| New Topic | Auto-embed | Parent (`is_parent: true`) | Use directly | Complete document |
| New Topic | Auto-embed | Child (`is_parent: false`) | Resolve parent via `parent_id` | Complete parent document |
| Conversational | Auto-embed | Any | Use chat history | Previous context |
| Hybrid | Auto-embed | Child → Parent | Resolve + merge | Parent doc + chat history |

## Critical Preservation Rules

### Source Code Integrity
- **Zero Tolerance**: Never modify source code from Elasticsearch documents
- **Exact Preservation**: Maintain all paths, links, and TailwindCSS classes exactly as found
- **Image Path Preservation**: Use only exact image references from source documents
- **No Placeholders**: Never create virtual or placeholder image URLs

### Document Resolution Requirements
- **Complete Context**: Only send documents with `is_parent: true` to LLM
- **Automatic Resolution**: Always resolve child documents to their parents
- **Content Completeness**: Ensure sufficient context before LLM processing
- **Metadata Validation**: Verify document hierarchy before proceeding

*/


/*
# Military-Discipline Context Agent
# 100% UI Structure Preservation with Selective Color/Font Editing
*/

import { DynamicTool } from "@langchain/core/tools";
import { model } from "../../../config/openai-config.js";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { AgentExecutor, type AgentStep } from "langchain/agents";
import { formatToOpenAIFunctionMessages } from "langchain/agents/format_scratchpad";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { ElasticClientArgs, ElasticVectorSearch } from "@langchain/community/vectorstores/elasticsearch";
import { Client } from "@elastic/elasticsearch";
import { config, embeddingsOpenAI } from "../../../config/elastic-config.js";
import { z } from "zod";
import { convertToOpenAIFunction } from "@langchain/core/utils/function_calling";
import { OpenAIFunctionsAgentOutputParser } from "langchain/agents/openai/output_parser";
import * as cheerio from "cheerio";

// ElasticSearch configuration
const clientArgs: ElasticClientArgs = {
    client: new Client(config),
    indexName: process.env.ELASTIC_INDEX ?? `thesis_tailwindcss`,
};
const elasticVectorSearch = new ElasticVectorSearch(embeddingsOpenAI, clientArgs);

// Utility: Print selected document info (ID and code content)
function printSelectedDocumentInfo(parentDocs: any[]) {
    console.log(`[DEBUG] printSelectedDocumentInfo called. parentDocs.length = ${parentDocs.length}`);
    if (parentDocs.length === 0) {
        console.log('[DEBUG] No parent documents found to print.');
    }
    parentDocs.forEach((doc, idx) => {
        console.log(`Selected Document #${idx + 1}:`);
        console.log(`ID: ${doc.metadata?.document_id}`);
        console.log(`Code File Content:\n${doc.pageContent}`);
    });
}

// MILITARY-GRADE UI STRUCTURE DETECTOR
function isColorFontOnlyRequest(input: string): boolean {
    const colorFontKeywords = [
        'color', 'background', 'bg-', 'text-', 'font', 'bold', 'italic', 'weight', 'style',
        'blue', 'red', 'green', 'yellow', 'purple', 'pink', 'gray', 'black', 'white',
        'primary', 'secondary', 'accent', 'typography', 'size', 'family', 'darker', 'lighter'
    ];
    const structuralKeywords = [
        'div', 'section', 'layout', 'grid', 'flex', 'column', 'row', 'responsive', 'mobile',
        'tablet', 'desktop', 'width', 'height', 'margin', 'padding', 'position', 'structure',
        'component', 'element', 'container', 'wrapper', 'add', 'remove', 'delete', 'move'
    ];
    
    const lower = input.toLowerCase();
    const hasColorFont = colorFontKeywords.some(k => lower.includes(k));
    const hasStructural = structuralKeywords.some(k => lower.includes(k));
    
    // Only allow if ONLY color/font terms, NO structural terms
    return hasColorFont && !hasStructural;
}

// MILITARY-GRADE COLOR/FONT UPDATER
function updateColorsAndFonts(html: string, userRequest: string): string {
    const $ = cheerio.load(html);
    const lower = userRequest.toLowerCase();
    
    // Color mappings
    const colorMappings = {
        'blue': { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500' },
        'red': { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500' },
        'green': { bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-500' },
        'yellow': { bg: 'bg-yellow-500', text: 'text-yellow-500', border: 'border-yellow-500' },
        'purple': { bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500' },
        'pink': { bg: 'bg-pink-500', text: 'text-pink-500', border: 'border-pink-500' },
        'gray': { bg: 'bg-gray-500', text: 'text-gray-500', border: 'border-gray-500' },
        'black': { bg: 'bg-black', text: 'text-black', border: 'border-black' },
        'white': { bg: 'bg-white', text: 'text-white', border: 'border-white' }
    };
    
    // Find requested color
    let targetColor = null;
    for (const [color, classes] of Object.entries(colorMappings)) {
        if (lower.includes(color)) {
            targetColor = classes;
            break;
        }
    }
    
    if (targetColor) {
        $('[class]').each((_, el) => {
            let classes = $(el).attr('class') || '';
            
            // Update background colors
            if (lower.includes('background') || lower.includes('bg')) {
                classes = classes.replace(/bg-\w+-?\w*/g, targetColor.bg);
            }
            
            // Update text colors
            if (lower.includes('text') || lower.includes('color')) {
                classes = classes.replace(/text-\w+-?\w*/g, targetColor.text);
            }
            
            // Update border colors
            if (lower.includes('border')) {
                classes = classes.replace(/border-\w+-?\w*/g, targetColor.border);
            }
            
            $(el).attr('class', classes);
        });
    }
    
    // Font weight updates
    if (lower.includes('bold')) {
        $('[class]').each((_, el) => {
            let classes = $(el).attr('class') || '';
            classes = classes.replace(/font-\w+/g, 'font-bold');
            $(el).attr('class', classes);
        });
    }
    
    if (lower.includes('light')) {
        $('[class]').each((_, el) => {
            let classes = $(el).attr('class') || '';
            classes = classes.replace(/font-\w+/g, 'font-light');
            $(el).attr('class', classes);
        });
    }
    
    return $.html();
}

// MILITARY-GRADE PARENT DOCUMENT RESOLVER
async function resolveParentDocuments(results: any[]): Promise<any[]> {
    const parentDocs: any[] = [];
    const seenParentIds = new Set();
    
    for (const doc of results) {
        if (doc.metadata?.is_parent === true) {
            if (!seenParentIds.has(doc.metadata.document_id)) {
                parentDocs.push(doc);
                seenParentIds.add(doc.metadata.document_id);
            }
        } else if (doc.metadata?.is_parent === false && doc.metadata?.parent_id) {
            try {
                // Use direct Elasticsearch query for parent resolution
                const client = new Client(config);
                const response = await client.search({
                    index: clientArgs.indexName,
                    body: {
                        query: {
                            bool: {
                                must: [
                                    { term: { "metadata.document_id.keyword": doc.metadata.parent_id } },
                                    { term: { "metadata.is_parent": true } }
                                ]
                            }
                        },
                        size: 1
                    }
                });
                
                if (response.hits.hits.length > 0) {
                    const hit = response.hits.hits[0];
                    const source = hit._source as any;
                    const parentDoc = {
                        pageContent: source.text || source.pageContent || "",
                        metadata: source.metadata || {}
                    };
                    
                    if (!seenParentIds.has(parentDoc.metadata.document_id)) {
                        parentDocs.push(parentDoc);
                        seenParentIds.add(parentDoc.metadata.document_id);
                    }
                }
            } catch (error) {
                // (No logging)
            }
        }
    }
    
    return parentDocs;
}

// MILITARY-GRADE CONTEXT SEARCH TOOL
const militaryContextSearchTool = new DynamicTool({
    name: 'military_context_search_tool',
    description: 'Performs vector search with absolute parent document resolution',
    func: async (input: string) => {
        try {
            let query: string;
            try {
                const parsed = JSON.parse(input);
                query = typeof parsed === 'string' ? parsed : parsed.query;
            } catch {
                query = input;
            }
            
            // Step 1: Vector search
            const results = await elasticVectorSearch.similaritySearch(query, 1);
            console.log(`[DEBUG] similaritySearch returned ${results.length} results.`);
            
            // Step 2: FORCE parent document resolution
            const parentDocs = await resolveParentDocuments(results);
            console.log(`[DEBUG] resolveParentDocuments returned ${parentDocs.length} parentDocs.`);
            
            // Print out ID and code file content for each selected document
            printSelectedDocumentInfo(parentDocs);

            return JSON.stringify({
                context: parentDocs.map(d => d.pageContent),
                metadata: parentDocs.map(d => d.metadata),
                totalParents: parentDocs.length
            });
        } catch (error) {
            return JSON.stringify({ context: [], metadata: [], totalParents: 0 });
        }
    }
});

// MILITARY-GRADE PROMPT WITH ABSOLUTE ENFORCEMENT
const militaryPrompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `YOU ARE A MILITARY-DISCIPLINE FRONT-END AGENT. FOLLOW ORDERS EXACTLY.

ABSOLUTE LAWS (ZERO TOLERANCE):
1. NEVER MODIFY UI STRUCTURE from context - div layouts, grids, flexbox, responsive classes are FORBIDDEN TO CHANGE
2. NEVER CREATE FAKE IMAGE LINKS - use ONLY exact image paths from context
3. NEVER MODIFY margins, padding, width, height, positioning classes
4. NEVER ADD or REMOVE HTML elements or containers
5. NEVER CHANGE responsive breakpoint classes (sm:, md:, lg:, xl:)
6. THE CODE YOU GENERATE MUST BE AT LEAST 95% AND AT MOST 100% SIMILAR TO THE CODE CONTEXT PROVIDED TO YOU. DO NOT GO BELOW 95% OR ABOVE 100% SIMILARITY. STRICTLY ENFORCE THIS RANGE.

ONLY PERMITTED MODIFICATIONS:
- Color changes (bg-*, text-*, border-* classes)
- Font changes (font-* classes)
- NOTHING ELSE

EXECUTION PROTOCOL:
- If context provided: Use EXACT structure, preserve ALL image paths
- If no context: Generate new code with TailwindCSS CDN
- Always include: <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>

CONTEXT DATA: {context}
METADATA: {metadata}`
    ],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
]);

// TOOLS ARRAY
const tools = [militaryContextSearchTool];

// MODEL WITH FUNCTIONS
const modelWithFunctions = model.bind({
    functions: tools.map((tool) => convertToOpenAIFunction(tool)),
});

// OUTPUT PARSER
const outputParser = new OpenAIFunctionsAgentOutputParser();

// MILITARY-GRADE RUNNABLE AGENT
const militaryRunnableAgent = RunnableSequence.from([
    {
        input: (i: { input: string; steps: AgentStep[]; conversationId?: string }) => i.input,
        agent_scratchpad: (i: { input: string; steps: AgentStep[] }) =>
            formatToOpenAIFunctionMessages(i.steps),
        context: async (i: { input: string; steps: AgentStep[]; conversationId?: string }) => {
            // STEP 1: Check if this is color/font only request
            const isColorFontOnly = isColorFontOnlyRequest(i.input);
            
            // STEP 2: Get context from Elasticsearch
            const searchResult = await militaryContextSearchTool.func(i.input);
            let contextResults = [];
            let metadata = [];
            
            if (searchResult) {
                try {
                    const parsed = JSON.parse(searchResult);
                    contextResults = parsed.context || [];
                    metadata = parsed.metadata || [];
                } catch (e) {
                    contextResults = [];
                    metadata = [];
                }
            }
            
            // STEP 3: MILITARY DECISION MATRIX
            if (contextResults.length > 0) {
                const contextCode = contextResults[0];
                
                if (isColorFontOnly) {
                    // DIRECT MODIFICATION - NO LLM INVOLVED
                    const modifiedCode = updateColorsAndFonts(contextCode, i.input);
                    return `DIRECT_MODIFICATION:${modifiedCode}`;
                } else {
                    // STRUCTURE MUST BE PRESERVED - PASS TO LLM WITH STRICT ORDERS
                    return contextCode;
                }
            }
            
            // STEP 4: No context - allow LLM to generate new
            return "";
        },
        metadata: async (i: { input: string; steps: AgentStep[] }) => {
            const searchResult = await militaryContextSearchTool.func(i.input);
            if (searchResult) {
                try {
                    const parsed = JSON.parse(searchResult);
                    return JSON.stringify(parsed.metadata || []);
                } catch {
                    return "[]";
                }
            }
            return "[]";
        },
        chat_history: (i: { input: string; steps: AgentStep[]; chat_history: BaseMessage[] }) =>
            i.chat_history || [],
    },
    militaryPrompt,
    modelWithFunctions,
    outputParser,
]);

// MILITARY EXECUTOR WITH INTERCEPTION
const militaryExecutor = AgentExecutor.fromAgentAndTools({
    agent: militaryRunnableAgent,
    tools,
    // verbose: false, // default is false, so omit or set explicitly
    handleParsingErrors: true,
    returnIntermediateSteps: true,
});

// EXECUTION WRAPPER WITH MILITARY INTERCEPTION
async function executeWithMilitaryDiscipline(
    input: string,
    chatHistory: BaseMessage[] = [],
    conversationId: string = "default"
) {
    try {
        // PRE-EXECUTION: Check for direct modification
        const searchResult = await militaryContextSearchTool.func(input);
        let contextResults = [];
        
        if (searchResult) {
            try {
                const parsed = JSON.parse(searchResult);
                contextResults = parsed.context || [];
            } catch (e) {
                contextResults = [];
            }
        }
        
        // If we have context and it's color/font only, return direct modification
        if (contextResults.length > 0 && isColorFontOnlyRequest(input)) {
            const modifiedCode = updateColorsAndFonts(contextResults[0], input);
            return {
                output: `Here's your updated code with the color/font changes:\n\n\`\`\`html\n${modifiedCode}\n\`\`\``,
                intermediateSteps: []
            };
        }
        
        // Otherwise, execute with military discipline
        const result = await militaryExecutor.invoke({
            input,
            chat_history: chatHistory,
            conversationId
        });
        
        // POST-EXECUTION: Verify no structure was modified if context was used
        if (contextResults.length > 0 && typeof result.output === 'string') {
            // Extract code blocks
            const codeBlockRegex = /```[\s\S]*?```/g;
            const matches = result.output.match(codeBlockRegex);
            
            if (matches && matches.length > 0) {
                const generatedCode = matches[0].replace(/```[\w]*\n/, '').replace(/```$/, '');
                
                // Verify structure preservation (simplified check)
                const originalStructure = extractStructuralElements(contextResults[0]);
                const generatedStructure = extractStructuralElements(generatedCode);
                
                if (!structuresMatch(originalStructure, generatedStructure)) {
                    // VIOLATION DETECTED - RESTORE ORIGINAL
                    result.output = `Here's the preserved code structure:\n\n\`\`\`html\n${contextResults[0]}\n\`\`\`\n\n[MILITARY NOTE: Original structure preserved as requested]`;
                }
            }
        }
        
        return result;
    } catch (error) {
        return {
            output: "I DON'T KNOW - Error occurred during military execution",
            intermediateSteps: []
        };
    }
}

// STRUCTURE COMPARISON FUNCTIONS
function extractStructuralElements(html: string): string[] {
    const $ = cheerio.load(html);
    const structural = [];
    
    $('div, section, main, nav, header, footer, article, aside').each((_, el) => {
        const classes = $(el).attr('class') || '';
        // Extract only structural classes
        const structuralClasses = classes.split(' ').filter(cls => 
            cls.includes('grid') || cls.includes('flex') || cls.includes('col') || 
            cls.includes('row') || cls.includes('sm:') || cls.includes('md:') || 
            cls.includes('lg:') || cls.includes('xl:') || cls.includes('w-') || 
            cls.includes('h-') || cls.includes('p-') || cls.includes('m-')
        );
        structural.push(`${el.tagName}:${structuralClasses.join(',')}`);
    });
    
    return structural;
}

function structuresMatch(original: string[], generated: string[]): boolean {
    if (original.length !== generated.length) return false;
    
    for (let i = 0; i < original.length; i++) {
        if (original[i] !== generated[i]) return false;
    }
    
    return true;
}

// Reference citation utility (similar to custom-agent)
function extractReferenceCitations(parentDocs) {
    // Helper to truncate description
    function truncateDescription(content, maxLength = 150) {
        if (!content || content.length <= maxLength) return content;
        return content.substring(0, maxLength) + "...";
    }
    // Helper to extract title
    function extractTitle(metadata, pageContent) {
        if (metadata && metadata.title) return metadata.title;
        if (metadata && metadata.document_id) {
            return metadata.document_id.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        const firstLine = pageContent.split('\n')[0].trim();
        if (firstLine.length > 10 && firstLine.length < 100) return firstLine;
        const words = pageContent.split(/\s+/).slice(0, 5).join(' ');
        return words.length > 3 ? words + '...' : 'Document Reference';
    }
    // Build references array
    return (parentDocs || []).map(doc => ({
        title: extractTitle(doc.metadata, doc.pageContent),
        description: truncateDescription(doc.pageContent, 150),
        documentId: doc.metadata?.document_id,
        type: doc.metadata?.type || undefined,
        source: doc.metadata?.source || undefined
    }));
}

export { 
    militaryExecutor, 
    executeWithMilitaryDiscipline,
    militaryContextSearchTool,
    isColorFontOnlyRequest,
    updateColorsAndFonts,
    extractReferenceCitations // Export the new function
};