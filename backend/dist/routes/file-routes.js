import { Router } from "express";
import { EmbeddingsVectorStore } from "../controllers/multifilesloader-controller.js";
//Protected API
const fileRoutes = Router();
fileRoutes.post("/new", EmbeddingsVectorStore);
export default fileRoutes;
//# sourceMappingURL=file-routes.js.map