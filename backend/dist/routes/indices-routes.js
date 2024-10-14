import { Router } from "express";
import { createNewIndexies, getAllIndexies } from "../controllers/components/elastic-controller.js";
import { verifyToken } from "../utils/token-manager.js";
//Protected API
const indexRoutes = Router();
indexRoutes.post("/new", createNewIndexies);
indexRoutes.get("/all-indices", verifyToken, getAllIndexies);
export default indexRoutes;
//# sourceMappingURL=indices-routes.js.map