import { Router } from "express";
import { verifyToken } from "../utils/token-manager.js";
import { saveToDatabase, getAllFile } from "../controllers/multifilesloader-controller.js";
import { validate, fileValidator } from "../utils/validator.js"

//Protected API
const fileRoutes = Router();

fileRoutes.get("/", getAllFile);
fileRoutes.post("/new", saveToDatabase);

export default fileRoutes;