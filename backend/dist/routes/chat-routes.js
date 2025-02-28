import { Router } from "express";
import { verifyToken } from "../utils/token-manager.js";
import { chatCompletionValidator, validate } from "../utils/validator.js";
import { deleteChats, generateChatGeminiMultiCompletion, sendChatsToUser, 
// generateChatCompletion,
// generateChatGeminiCompletion,
sendConservationsToUser, } from "../controllers/chat-controllers.js";
//Protected API
const chatRoutes = Router();
// chatRoutes.post(
//   "/new-gpt",
//   validate(chatCompletionValidator),
//   verifyToken,
//   generateChatCompletion
// );
chatRoutes.post("/new-gemini", validate(chatCompletionValidator), verifyToken, generateChatGeminiMultiCompletion);
chatRoutes.get("/all-conservations", verifyToken, sendConservationsToUser);
chatRoutes.get("/:conversationId", verifyToken, sendChatsToUser);
chatRoutes.delete("/delete/:conversationId", verifyToken, deleteChats);
export default chatRoutes;
//# sourceMappingURL=chat-routes.js.map