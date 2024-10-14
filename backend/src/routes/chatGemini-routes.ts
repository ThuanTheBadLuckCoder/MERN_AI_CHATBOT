import { Router } from "express";
import { verifyToken } from "../utils/token-manager.js";
import { chatCompletionValidator, validate } from "../utils/validator.js";
import {
  generateChatCompletion,
} from "../controllers/chatGemini-controllers.js";

//Protected API
const chatGeminiRoutes = Router();
chatGeminiRoutes.post(
  "/new",
  validate(chatCompletionValidator),
  verifyToken,
  generateChatCompletion
);

export default chatGeminiRoutes;