import { Router } from "express";
import { saveToDatabase, getAllFile } from "../controllers/multifilesloader-controller.js";
//Protected API
const fileRoutes = Router();
fileRoutes.get("/", getAllFile);
fileRoutes.post("/new", saveToDatabase);
export default fileRoutes;
//# sourceMappingURL=file-routes.js.map