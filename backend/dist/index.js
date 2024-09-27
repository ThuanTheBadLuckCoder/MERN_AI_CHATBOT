import app from './app.js';
import { connectToDatabase } from './db/connection.js';
// connections and listeneres
const PORT = process.env.PORT || 5000;
connectToDatabase()
    .then(() => {
    app.listen(PORT, () => console.log(`Server Open & Connected to Database at ${PORT}`));
}).catch((err) => console.log(err));
// import { client } from "./config/elastic-config.js"
// try {
//   const response = await client.cat.indices({
//     format: "json",
//     h: 'index'      // Equivalent to h=index in Kibana
//   });
//   console.log(response); // Handle the response here
// } catch (error) {
//   console.log(error);
// }
//# sourceMappingURL=index.js.map