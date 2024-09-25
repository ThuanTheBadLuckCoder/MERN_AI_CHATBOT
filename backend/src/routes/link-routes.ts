import { Router } from "express";
import { addVectorStore } from "../controllers/webloader-controllers.js";


//Protected API
const linkRoutes = Router();
linkRoutes.post("/new", addVectorStore);

export default linkRoutes;