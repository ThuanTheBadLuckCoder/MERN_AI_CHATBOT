import app from './app.js';
import { connectToDatabase } from './db/connectionMongoDB.js';
import { connectToElasticSearch } from './elasticsearch/elasticsearchClient.js'

// connections and listeneres with MongoDB
const PORT = process.env.PORT || 5000
connectToDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`Server Open & Connected to Database at ${PORT}`));
}).catch((err) => console.log(err));

connectToElasticSearch()
  .then(() => {
    console.log(`Server Open & Connected to Elasticsearch at ${PORT}`);
  }).catch((err) => console.log(err));