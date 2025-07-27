import { Router } from "express";
import { createNewIndexies, getAllIndexies, getIndexContents, getUniqueMetadataSources } from "../controllers/components/elastic-controller.js";
import { verifyToken } from "../utils/token-manager.js";
//Protected API
const indexRoutes = Router();
indexRoutes.post("/new", createNewIndexies);
indexRoutes.get("/all-indices", verifyToken, getAllIndexies);
indexRoutes.get("/details/:index", getIndexContents);
indexRoutes.get("/sources/:index", getUniqueMetadataSources);
export default indexRoutes;
//# sourceMappingURL=indices-routes.js.map