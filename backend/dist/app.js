import express from 'express';
import { config } from 'dotenv';
import morgan from 'morgan';
import appRouter from './routes/index.js';
import cors from 'cors';
config();
const app = express();
// middlewares
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
// remove it in production
app.use(morgan("dev"));
app.use("/api/v1", appRouter);
export default app;
//# sourceMappingURL=app.js.map