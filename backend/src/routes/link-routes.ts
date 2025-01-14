import { Router } from "express";
import { EmbeddingsVectorStore, EmbeddingsGeminiVectorStore } from "../controllers/webloader-controllers.js";
import handler from "../utils/validate-links.js";


//Protected API
const linkRoutes = Router();
linkRoutes.post("/new", EmbeddingsVectorStore);
linkRoutes.post("/check-url", handler);

export default linkRoutes;