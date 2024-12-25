import { Router } from "express";
import { EmbeddingsVectorStore } from "../controllers/webloader-controllers.js";
//Protected API
const linkRoutes = Router();
linkRoutes.post("/new", EmbeddingsVectorStore);
export default linkRoutes;
//# sourceMappingURL=link-routes.js.map