import { Router } from "express";
import { EmbeddingsGeminiVectorStore } from "../controllers/webloader-controllers.js";
//Protected API
const linkRoutes = Router();
linkRoutes.post("/new", EmbeddingsGeminiVectorStore);
export default linkRoutes;
//# sourceMappingURL=link-routes.js.map