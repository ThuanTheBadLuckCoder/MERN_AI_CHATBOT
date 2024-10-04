import { Router } from "express";
import { createNewIndexies } from "../controllers/webloader-controllers.js";


//Protected API
const indexRoutes = Router();
indexRoutes.post("/new", createNewIndexies);

export default indexRoutes;