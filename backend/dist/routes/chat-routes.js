import { Router } from "express";
import { verifyToken } from "../utils/token-manager.js";
import { chatCompletionValidator, validate } from "../utils/validator.js";
import { deleteChats, generateChatGPTCompletion, generateGoogleMultiCompletion, generateOpenAICompletion, sendChatsToUser, 
// generateChatCompletion,
// generateChatGeminiCompletion,
sendConversationsToUser, } from "../controllers/chat-controllers.js";
//Protected API
const chatRoutes = Router();
/* chatRoutes.post("/new-gemini",
  validate(chatCompletionValidator),
  verifyToken,
  generateChatGeminiMultiCompletion); */
chatRoutes.post("/new-basic", validate(chatCompletionValidator), verifyToken, generateGoogleMultiCompletion);
chatRoutes.post("/new-gpt", validate(chatCompletionValidator), verifyToken, generateChatGPTCompletion);
chatRoutes.post("/new-gpt-3.5", validate(chatCompletionValidator), verifyToken, generateOpenAICompletion);
chatRoutes.get("/all-conversations", verifyToken, sendConversationsToUser);
chatRoutes.get("/conversation-list", verifyToken, sendConversationsToUser);
chatRoutes.get("/:conversationId", verifyToken, sendChatsToUser);
chatRoutes.delete("/delete/:conversationId", verifyToken, deleteChats);
export default chatRoutes;
//# sourceMappingURL=chat-routes.js.map