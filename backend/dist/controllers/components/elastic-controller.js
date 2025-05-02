import { ElasticVectorSearch } from "@langchain/community/vectorstores/elasticsearch";
import { Client } from "@elastic/elasticsearch";
import { client, config, embeddingsGemini, embeddingsOpenAI } from "../../config/elastic-config.js";
import User from "../../models/User.js";
export const queryVectorStore = async (req, res, next, message) => {
    const index = "*";
    const filter = [
        {
            operator: "wildcard",
            field: "source",
            value: "*",
        },
    ];
    const clientArgs = {
        client: new Client(config),
        indexName: process.env.ELASTIC_INDEX ?? `${index}`,
    };
    const vectorStore = new ElasticVectorSearch(embeddingsOpenAI, clientArgs);
    const similaritySearchResults = await vectorStore.similaritySearch(`${message}`, 1, filter);
    const context = similaritySearchResults.map((result) => result.pageContent);
    return context;
};
export const queryGeminiVectorStore = async (req, res, next, message) => {
    const index = "*";
    // console.log("messageQueryVectorStore: ", message);
    const filter = [
        {
            operator: "wildcard",
            field: "source",
            value: "*",
        },
    ];
    const clientArgs = {
        client: new Client(config),
        indexName: process.env.ELASTIC_INDEX ?? `${index}`,
    };
    const vectorStore = new ElasticVectorSearch(embeddingsGemini, clientArgs);
    const similaritySearchResults = await vectorStore.similaritySearch(`${message}`, 1, filter);
    console.log("similaritySearchResults: ", similaritySearchResults);
    const context = similaritySearchResults.map((result) => result.pageContent);
    // console.log("Context: ", context);
    return context;
};
export const getAllIndexies = async (req, res, next) => {
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
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "ERROR", cause: error.message });
    }
};
export const createNewIndexies = async (req, res, next) => {
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
    }
    catch (error) {
        return res.status(500).json({ message: "ERROR", cause: error.message });
    }
};
export const getIndexContents = async (req, res, next) => {
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
        const documents = response.hits.hits.map((doc) => ({
            metadata: doc._source.metadata,
            text: doc._source.text
        }));
        return res.status(200).json({
            message: "OK",
            index: index,
            documents: documents,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "ERROR", cause: error.message });
    }
};
/*
GET frontend_developer/_search
{
  "size": 0,
  "aggs": {
    "unique_metadata_sources": {
      "composite": {
        "sources": [
          {
            "metadata_source": {
              "terms": {
                "field": "metadata.source"
              }
            }
          }
        ],
        "size": 10000
      }
    }
  }
}
*/
export const getIndexSources = async (req, res, next) => {
    try {
        const { index } = req.params;
        if (!index) {
            return res.status(400).json({ message: "Index name is required" });
        }
        // Create Elasticsearch client
        const client = new Client(config);
        // First, get only parent documents to avoid duplicates
        const response = await client.search({
            index: `${index}`,
            size: 1000, // Adjust size as needed
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
                    "metadata.has_children",
                    "metadata.child_count"
                ],
                sort: [
                    { "metadata.created_at": { order: "desc" } }
                ]
            }
        });
        // Transform the response to a more frontend-friendly format
        const componentSources = response.hits.hits.map((hit) => {
            if (!hit._source || !hit._source.metadata) {
                return {
                    id: "unknown",
                    name: "Unknown Component",
                    languages: [],
                    features: [],
                    responsive: false,
                    has_chunks: false,
                    chunk_count: 0
                };
            }
            const metadata = hit._source.metadata;
            return {
                id: metadata.document_id,
                name: metadata.component_name || metadata.source || "Unnamed",
                description: metadata.description,
                file_format: metadata.file_format,
                languages: metadata.languages || [],
                type: metadata.component_type,
                framework: metadata.framework,
                features: metadata.features || [],
                responsive: metadata.responsive || false,
                created_at: metadata.created_at,
                has_chunks: metadata.has_children || false,
                chunk_count: metadata.child_count || 0
            };
        });
        // Get overall stats
        const statsResponse = await client.search({
            index: `${index}`,
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
        // Type assertion for the aggregations response
        const aggregations = statsResponse.aggregations;
        return res.status(200).json({
            message: "OK",
            components: componentSources,
            stats: {
                total: componentSources.length,
                component_types: aggregations.component_types.buckets,
                frameworks: aggregations.frameworks.buckets,
                file_formats: aggregations.file_formats.buckets,
                languages: aggregations.languages.buckets,
                total_parents: aggregations.total_parents.doc_count,
                total_children: aggregations.total_children.doc_count
            }
        });
    }
    catch (error) {
        console.error("Error retrieving index sources:", error);
        return res.status(500).json({
            message: "Failed to retrieve index sources",
            cause: error.message
        });
    }
};
//# sourceMappingURL=elastic-controller.js.map