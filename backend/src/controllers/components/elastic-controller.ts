import { ElasticClientArgs, ElasticVectorSearch } from "@langchain/community/vectorstores/elasticsearch";
import { Request, Response, NextFunction } from "express";
import { Client, type ClientOptions } from "@elastic/elasticsearch";
import { client, config, embeddingsGemini, embeddingsOpenAI } from "../../config/elastic-config.js";
import User from "../../models/User.js";

// Define interfaces for our expected response structures
interface MetadataSource {
  document_id: string;
  component_name?: string;
  source?: string;
  description?: string;
  file_format?: string;
  languages?: string[];
  component_type?: string;
  framework?: string;
  features?: string[];
  responsive?: boolean;
  created_at?: string;
  has_children?: boolean;
  child_count?: number;
  is_parent?: boolean;
  parent_id?: string;
  chunk_id?: string;
  chunk_index?: number;
  total_chunks?: number;
  snippet_type?: string;
}

// Define a more generic hit structure that works with Elasticsearch's response
interface SearchHit<T = unknown> {
  _source: {
    metadata: MetadataSource;
    text?: string;
  } & T;
}

// Define bucket type for aggregations
interface TermsBucket {
  key: string;
  doc_count: number;
}

interface ElasticAggregations {
  component_types: {
    buckets: TermsBucket[];
  };
  frameworks: {
    buckets: TermsBucket[];
  };
  file_formats: {
    buckets: TermsBucket[];
  };
  languages: {
    buckets: TermsBucket[];
  };
  total_parents: {
    doc_count: number;
  };
  total_children: {
    doc_count: number;
  };
}

export const queryVectorStore = async (req: Request, res: Response, next: NextFunction, message: string) => {
    const index = "*";
    const filter = [
        {
            operator: "wildcard",
            field: "source",
            value: "*",

        },
    ];
    const clientArgs: ElasticClientArgs = {
        client: new Client(config),
        indexName: process.env.ELASTIC_INDEX ?? `${index}`,
    }
    const vectorStore = new ElasticVectorSearch(embeddingsOpenAI, clientArgs);

    const similaritySearchResults = await vectorStore.similaritySearch(
        `${message}`,
        1,
        filter
    );

    const context = similaritySearchResults.map((result) => result.pageContent);
    return context;
}

export const queryGeminiVectorStore = async (req: Request, res: Response, next: NextFunction, message: string) => {
    const index = "*";
    // console.log("messageQueryVectorStore: ", message);
    const filter = [
        {
            operator: "wildcard",
            field: "source",
            value: "*",

        },
    ];
    const clientArgs: ElasticClientArgs = {
        client: new Client(config),
        indexName: process.env.ELASTIC_INDEX ?? `${index}`,
    }
    const vectorStore = new ElasticVectorSearch(embeddingsGemini, clientArgs);

    const similaritySearchResults = await vectorStore.similaritySearch(
        `${message}`,
        1,
        filter
    );

    console.log("similaritySearchResults: ", similaritySearchResults);
    const context = similaritySearchResults.map((result) => result.pageContent);
    // console.log("Context: ", context);
    return context;
}

export const getAllIndexies = async (req: Request, res: Response, next: NextFunction) => {
    try {
        //user token check
        const user = await User.findById(res.locals.jwtData.id);
        if (!user) {
            return res.status(401).send("User not registered OR Token malfunctioned");
        }
        if (user._id.toString() !== res.locals.jwtData.id) {
            return res.status(401).send("Permissions didn't match");
        }
        const indices = await client.cat.indices({
            format: 'json',
            h: ['index']
            
        });
        return res.status(200).json({ message: "OK", indices: indices });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "ERROR", cause: error.message });
    }
}


export const createNewIndexies = async (req: Request, res: Response, next: NextFunction) => {
    //Define index parameters
    const { indexName, settings, mappings } = req.body;
    try {
        if (!indexName) {
            return res.status(400).json({ message: "Index name is required." });
        }

        // Define index parameters
        const indexParams = {
            index: indexName,
            body: {
                settings: settings || {
                    // Example settings; can be customized
                    analysis: {
                        analyzer: {
                            content_analyzer: {
                                type: "standard",
                            },
                        },
                    },
                },
                mappings: mappings || {
                    // Example mappings; customize as needed
                    properties: {
                        pageContent: { type: "text", analyzer: "content_analyzer" },
                        metadata: {
                            properties: {
                                source: { type: "keyword" },
                            },
                        },
                    },
                },
            },
        };

        const response = await client.indices.create(indexParams);
        return res.status(200).json({ message: "Index created successfully.", response });
    } catch (error) {
        return res.status(500).json({ message: "ERROR", cause: error.message })
    }
};

export const getIndexContents = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { index } = req.params;
        if (!index) {
            return res.status(400).json({ message: "Index name is required" });
        }

        // Fetch documents from the index
        const response = await client.search({
            index: index,
            size: 100, // Number of documents per batch (2147483647 is MAX)
            query: { match_all: {} }, // Retrieves all documents
            _source: ['metadata', 'text'] // Fetch only the 'metadata' and 'text' fields
        });

        const documents = response.hits.hits.map((doc: any) => ({
            metadata: doc._source.metadata,
            text: doc._source.text
        }));
        

        return res.status(200).json({
            message: "OK",
            index: index,
            documents: documents,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "ERROR", cause: error.message });
    }
};

export const getIndexSources = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { index } = req.params;
        if (!index) {
            return res.status(400).json({ message: "Index name is required" });
        }

<<<<<<< Updated upstream
        // Create Elasticsearch client
        const client = new Client(config);

        // First, get only parent documents to understand the hierarchy
        const parentsResponse = await client.search({
            index: `${index}`,
            size: 100,
            body: {
                query: {
                    term: {
                        "metadata.is_parent": true
                    }
                },
                _source: [
                    "metadata.document_id",
                    "metadata.component_name",
                    "metadata.source",
                    "metadata.description",
                    "metadata.file_format",
                    "metadata.languages",
                    "metadata.component_type",
                    "metadata.framework",
                    "metadata.features",
                    "metadata.responsive",
                    "metadata.created_at",
                    "metadata.is_parent",
                    "metadata.has_children",
                    "metadata.child_count",
                    "text"
                ],
                sort: [
                    { "metadata.created_at": { order: "desc" } }
                ]
            }
        });

        // Define types for our Elasticsearch documents
        interface ElasticMetadata {
            document_id: string;
            component_name?: string;
            source?: string;
            description?: string;
            file_format?: string;
            languages?: string[];
            component_type?: string;
            framework?: string;
            features?: string[];
            responsive?: boolean;
            created_at?: string;
            is_parent?: boolean;
            has_children?: boolean;
            child_count?: number;
            parent_id?: string;
            chunk_id?: string;
            chunk_index?: number;
            total_chunks?: number;
            snippet_type?: string;
        }

        interface ElasticDocument {
            _id: string;
            _source: {
                metadata: ElasticMetadata;
                text?: string;
            };
        }

        // If there are multiple parents, we'll pick the one with children
        // (this assumes that the parent with chunks is the one you want)
        const parents = parentsResponse.hits.hits as ElasticDocument[];
        let targetParent: ElasticDocument | null = null;
        
        for (const parent of parents) {
            if (parent._source.metadata.has_children) {
                targetParent = parent;
                break;
            }
        }
        
        // If no parent with children was found, use the first parent
        if (!targetParent && parents.length > 0) {
            targetParent = parents[0];
        }
        
        if (!targetParent) {
            return res.status(404).json({ message: "No parent documents found" });
        }

        // Now get all child documents of the target parent
        const childrenResponse = await client.search({
            index: `${index}`,
            size: 100,
            body: {
                query: {
                    term: {
                        "metadata.parent_id": targetParent._source.metadata.document_id
                    }
                },
                _source: [
                    "metadata.document_id",
                    "metadata.component_name",
                    "metadata.source",
                    "metadata.file_format",
                    "metadata.languages",
                    "metadata.component_type",
                    "metadata.framework",
                    "metadata.features",
                    "metadata.responsive",
                    "metadata.created_at",
                    "metadata.is_parent",
                    "metadata.parent_id",
                    "metadata.chunk_id",
                    "metadata.chunk_index",
                    "metadata.total_chunks",
                    "metadata.snippet_type",
                    "text"
                ],
                sort: [
                    { "metadata.chunk_index": { order: "asc" } }
                ]
            }
        });

        // Format the parent
        const formattedParent = {
            id: targetParent._id,
            name: targetParent._source.metadata.component_name || targetParent._source.metadata.source || "Unnamed",
            description: targetParent._source.metadata.description,
            file_format: targetParent._source.metadata.file_format,
            languages: targetParent._source.metadata.languages || [],
            type: targetParent._source.metadata.component_type,
            framework: targetParent._source.metadata.framework,
            features: targetParent._source.metadata.features || [],
            responsive: targetParent._source.metadata.responsive || false,
            created_at: targetParent._source.metadata.created_at,
            is_parent: true,
            parent_id: null,
            has_chunks: targetParent._source.metadata.has_children || false,
            chunk_count: targetParent._source.metadata.child_count || 0,
            document_id: targetParent._source.metadata.document_id,
            code: targetParent._source.text || ""
        };

        // Format the children
        const formattedChildren = (childrenResponse.hits.hits as ElasticDocument[]).map((hit) => {
            return {
                id: hit._id,
                name: hit._source.metadata.component_name || hit._source.metadata.source || "Unnamed",
                file_format: hit._source.metadata.file_format,
                languages: hit._source.metadata.languages || [],
                type: hit._source.metadata.component_type,
                framework: hit._source.metadata.framework,
                features: hit._source.metadata.features || [],
                responsive: hit._source.metadata.responsive || false,
                created_at: hit._source.metadata.created_at,
                is_parent: false,
                parent_id: hit._source.metadata.parent_id,
                chunk_id: hit._source.metadata.chunk_id,
                chunk_index: hit._source.metadata.chunk_index,
                total_chunks: hit._source.metadata.total_chunks,
                snippet_type: hit._source.metadata.snippet_type,
                document_id: hit._source.metadata.document_id,
                code: hit._source.text || ""
            };
        });

        // Combine parent and children
        const allDocuments = [formattedParent, ...formattedChildren];

        // Get overall stats (optional, you can keep this part if needed)
        const statsResponse = await client.search({
            index: `${index}`,
=======
        // Fetch documents from the index
        const response = await client.search({
            index: `${index}`, // Replace with your index name
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
            size: 0,
            body: {
                aggs: {
                    component_types: {
                        terms: {
                            field: "metadata.component_type.keyword",
                            size: 20
                        }
                    },
                    frameworks: {
                        terms: {
                            field: "metadata.framework.keyword",
                            size: 20
                        }
                    },
                    file_formats: {
                        terms: {
                            field: "metadata.file_format.keyword",
                            size: 20
                        }
                    },
                    languages: {
                        terms: {
                            field: "metadata.languages.keyword",
                            size: 20
                        }
                    },
                    total_parents: {
                        filter: {
                            term: {
                                "metadata.is_parent": true
                            }
                        }
                    },
                    total_children: {
                        filter: {
                            term: {
                                "metadata.is_parent": false
                            }
                        }
                    }
                }
            }
        });

        const aggregations = statsResponse.aggregations as any;

        return res.status(200).json({
            message: "OK",
            all_documents: allDocuments,
            stats: {
                total: allDocuments.length,
                component_types: aggregations.component_types.buckets,
                frameworks: aggregations.frameworks.buckets,
                file_formats: aggregations.file_formats.buckets,
                languages: aggregations.languages.buckets,
                total_parents: 1, // Override with 1 since we're only returning 1 parent
                total_children: formattedChildren.length
            }
        });
    } catch (error) {
        console.error("Error retrieving index sources:", error);
        return res.status(500).json({ 
            message: "Failed to retrieve index sources", 
            cause: error.message 
        });
    }
};


export const getUniqueMetadataSources = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { index } = req.params;
        if (!index) {
            return res.status(400).json({ message: "Index name is required" });
        }

        // Create Elasticsearch client
        const client = new Client(config);

        // Modify the aggregation to include all documents, not just samples
        const response = await client.search({
            index: `${index}`,
            size: 0,
            body: {
                aggs: {
                    unique_metadata_sources: {
                        composite: {
                            sources: [
                                {
                                    metadata_source: {
                                        terms: {
                                            field: "metadata.source"
                                        }
                                    }
                                }
                            ],
                            size: 1000
                        }
                    }
                }
            }
        });

        // Get the unique source names
        const sourcesAggs = response.aggregations as any;
        const sources: string[] = [];

        if (
            sourcesAggs && 
            'unique_metadata_sources' in sourcesAggs &&
            'buckets' in sourcesAggs.unique_metadata_sources
        ) {
            const buckets = sourcesAggs.unique_metadata_sources.buckets;
            
            for (const bucket of buckets) {
                sources.push(bucket.key.metadata_source);
            }
        }

        // Now, for each source, get ALL its documents
        const allSourcesWithDocs: any[] = [];

        for (const sourceName of sources) {
            // Query to get all documents for this source
            const docsResponse = await client.search({
                index: `${index}`,
                size: 10000, // Large size to get all documents
                body: {
                    query: {
                        term: {
                            "metadata.source": sourceName
                        }
                    },
                    _source: {
                        excludes: ["embedding"] // Exclude embedding field
                    },
                    sort: [
                        { "metadata.is_parent": { order: "desc" } },
                        { "metadata.created_at": { order: "desc" } },
                        { "metadata.chunk_index": { order: "asc" } }
                    ]
                }
            });

            // Format all documents from this source
            const allDocuments = docsResponse.hits.hits.map((hit: any) => {
                return {
                    _index: hit._index,
                    _id: hit._id,
                    _score: hit._score,
                    _ignored: hit._ignored,
                    _source: hit._source
                };
            });

            allSourcesWithDocs.push({
                source_name: sourceName,
                doc_count: allDocuments.length,
                documents: allDocuments // Changed from "sample_docs" to "documents"
            });
        }

        return res.status(200).json({
            message: "OK",
            metadata_sources: allSourcesWithDocs,
            total_sources: allSourcesWithDocs.length
        });
    } catch (error) {
        console.error("Error retrieving unique metadata sources:", error);
        return res.status(500).json({ 
            message: "Failed to retrieve unique metadata sources", 
            cause: error instanceof Error ? error.message : String(error)
        });
    }
};