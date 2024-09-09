import express from 'express'
import { config } from 'dotenv';
import morgan from 'morgan';
import appRouter from './routes/index.js'
import cookieParser from 'cookie-parser';
import cors from 'cors'
import { Client } from '@elastic/elasticsearch'
import bodyParser from 'body-parser'

const client = new Client({
  node: 'http://localhost:9200'
})

config();
const app = express();


// middlewares
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

// middlewares for parsing JSON (Elasticsearch)
app.use(bodyParser.json());


// remove it in production
app.use(morgan("dev"));


app.use("/api/v1", appRouter);
app.use("/health", appRouter);

export default app;

