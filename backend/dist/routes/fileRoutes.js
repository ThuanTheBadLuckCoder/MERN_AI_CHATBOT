import { Router } from "express";
import { verifyToken } from "../utils/token-manager.js";
//Protected API
const fileRoutes = Router();
fileRoutes.post("/new");
fileRoutes.get("/all-indices", verifyToken);
export default fileRoutes;
//# sourceMappingURL=fileRoutes.js.map