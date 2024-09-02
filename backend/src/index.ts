import express from 'express'

const app = express();

// middlewares
app.use(express.json());


// connection and listeneres
app.listen(5000, () => console.log("Server Open"));
