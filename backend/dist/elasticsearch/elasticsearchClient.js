import { Client } from "@elastic/elasticsearch";
// Elasticsearch Client
const client = new Client({
    node: 'http://localhost:9200'
});
export async function connectToElasticSearch() {
    try {
        // Check cluster health to ensure the connection is successful
        const health = await client.cluster.health();
        // console.log('Elasticsearch cluster health:', health);
    }
    catch (err) {
        console.error('Elasticsearch connection error:', err);
        throw err; // Throw error to handle connection failure outside
    }
}
async function disconnectFromElasticSearch() {
    try {
        // Close the client connection
        await client.close();
        console.log('Disconnected from Elasticsearch');
    }
    catch (error) {
        console.error('Error while disconnecting from Elasticsearch:', error);
        throw error; // Throw error to handle disconnection failure outside
    }
}
export { disconnectFromElasticSearch };
//# sourceMappingURL=elasticsearchClient.js.map