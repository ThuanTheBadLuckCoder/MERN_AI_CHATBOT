import { Router } from "express";
import { EmbeddingsVectorStore, EmbeddingsGeminiVectorStore } from "../controllers/webloader-controllers.js";


//Protected API
const linkRoutes = Router();
linkRoutes.post("/new", EmbeddingsVectorStore);

export default linkRoutes;