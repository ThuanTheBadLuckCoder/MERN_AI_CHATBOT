// Debug script for Elasticsearch document storage issue
import { Client } from "@elastic/elasticsearch";

const client = new Client({
    node: 'http://localhost:9200'
});

async function debugElasticsearch() {
    console.log("🔍 Debugging Elasticsearch Document Storage in thesis_tailwindcss index...");
    
    try {
        // 1. Check thesis_tailwindcss index specifically
        console.log("\n1. Checking thesis_tailwindcss index:");
        try {
            const indexInfo = await client.cat.indices({ 
                index: "thesis_tailwindcss",
                format: 'json' 
            });
            if (indexInfo.length > 0) {
                const index = indexInfo[0];
                console.log(`✅ Index found: ${index.index} (docs: ${index['docs.count']}, size: ${index['store.size']})`);
            } else {
                console.log("❌ thesis_tailwindcss index not found");
                return;
            }
        } catch (error) {
            console.log(`❌ Error checking index: ${error.message}`);
            return;
        }
        
        // 2. Check the specific document ID from your logs
        console.log("\n2. Checking specific document ID from logs:");
        const documentId = "fd903b1c-b2f5-4ebf-b79c-3c53ba1feb08-chunk-0";
        
        try {
            const doc = await client.get({
                index: "thesis_tailwindcss",
                id: documentId
            });
            console.log(`✅ Found document: ${doc._id}`);
            console.log(`   Index: ${doc._index}`);
            console.log(`   Source: ${doc._source?.metadata?.source || 'Unknown'}`);
            console.log(`   Content preview: ${doc._source?.pageContent?.substring(0, 100) || 'No content'}...`);
        } catch (error) {
            console.log(`❌ Document not found: ${error.message}`);
        }
        
        // 3. Search for documents with "dark" source
        console.log("\n3. Searching for documents with source 'dark':");
        const searchResult = await client.search({
            index: "thesis_tailwindcss",
            body: {
                query: {
                    term: {
                        "metadata.source": "dark"
                    }
                },
                size: 10
            }
        });
        
        console.log(`Found ${searchResult.hits.hits.length} documents with source 'dark':`);
        searchResult.hits.hits.forEach((hit, index) => {
            console.log(`  ${index + 1}. ID: ${hit._id} - Score: ${hit._score}`);
            console.log(`     Content: ${hit._source?.pageContent?.substring(0, 100)}...`);
        });
        
        // 4. Check the original document ID you mentioned
        console.log("\n4. Checking original document ID:");
        const originalId = "9aa5ec2b-aaa6-4f03-b7eb-b628c0e7a8de";
        
        try {
            const originalDoc = await client.get({
                index: "thesis_tailwindcss",
                id: originalId
            });
            console.log(`✅ Found original document: ${originalDoc._id}`);
            console.log(`   Index: ${originalDoc._index}`);
            console.log(`   Source: ${originalDoc._source?.metadata?.source || 'Unknown'}`);
            console.log(`   Content preview: ${originalDoc._source?.pageContent?.substring(0, 100) || 'No content'}...`);
        } catch (error) {
            console.log(`❌ Original document not found: ${error.message}`);
            
            // Try searching for it
            console.log("\n   Searching for documents with similar ID pattern:");
            const searchResult = await client.search({
                index: "thesis_tailwindcss",
                body: {
                    query: {
                        wildcard: {
                            "_id": "9aa5ec2b-aaa6-4f03-b7eb-b628c0e7a8de*"
                        }
                    },
                    size: 10
                }
            });
            
            console.log(`   Found ${searchResult.hits.hits.length} documents with similar ID pattern:`);
            searchResult.hits.hits.forEach((hit, index) => {
                console.log(`     ${index + 1}. ID: ${hit._id} - Source: ${hit._source?.metadata?.source || 'Unknown'}`);
            });
        }
        
        // 5. Search for content section related documents
        console.log("\n5. Searching for content section related documents:");
        const contentSearchResult = await client.search({
            index: "thesis_tailwindcss",
            body: {
                query: {
                    multi_match: {
                        query: "content section gallery layout",
                        fields: ["pageContent", "metadata.description"],
                        type: "best_fields"
                    }
                },
                size: 5
            }
        });
        
        console.log(`Found ${contentSearchResult.hits.hits.length} content-related documents:`);
        contentSearchResult.hits.hits.forEach((hit, index) => {
            console.log(`  ${index + 1}. ID: ${hit._id} - Score: ${hit._score}`);
            console.log(`     Source: ${hit._source?.metadata?.source || 'Unknown'}`);
            console.log(`     Content: ${hit._source?.pageContent?.substring(0, 100)}...`);
        });
        
        console.log("\n✅ Debug complete!");
        
    } catch (error) {
        console.error("❌ Error in debug:", error);
    }
}

// Run the debug function
debugElasticsearch().catch(console.error); 