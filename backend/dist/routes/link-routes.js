import { Router } from "express";
import { addVectorStore, getAllIndexies } from "../controllers/webloader-controllers.js";
import { verifyToken } from "../utils/token-manager.js";
//Protected API
const linkRoutes = Router();
linkRoutes.post("/new", addVectorStore);
linkRoutes.get("/all-indices", verifyToken, getAllIndexies);
export default linkRoutes;
//# sourceMappingURL=link-routes.js.map