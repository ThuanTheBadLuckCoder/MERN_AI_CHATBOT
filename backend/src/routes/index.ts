import { Router } from "express";
import userRoutes from "./user-routes.js";
import chatRoutes from "./chat-routes.js";
import elasticRoutes from "./elastic-routes.js"

const appRouter = Router();

appRouter.use("/user", userRoutes); //domain/api/v1/user
appRouter.use("/chat", chatRoutes); //domain/api/v1/chat


appRouter.use("/js_function", elasticRoutes);

export default appRouter;