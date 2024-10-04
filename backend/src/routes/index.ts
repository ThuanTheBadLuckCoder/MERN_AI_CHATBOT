import { Router } from "express";
import userRoutes from "./user-routes.js";
import chatRoutes from "./chat-routes.js";
import linkRoutes from "./link-routes.js";
import fileRoutes from "./file-routes.js"
import indicesRoutes from "./indices-routes.js";

const appRouter = Router();

appRouter.use("/user", userRoutes); //domain/api/v1/user
appRouter.use("/chat", chatRoutes); //domain/api/v1/chats
appRouter.use("/link", linkRoutes); //domain/api/v1/link
appRouter.use("/file", fileRoutes); //domain/api/v1/file
appRouter.use("/index", indicesRoutes); //domain/api/v1/index

export default appRouter;