import { Router } from "express";
import { getAllUsers, requestPasswordReset, userLogin, userLogout, userSignup, verifyOTPUser, verifyUser, } from "../controllers/user-controllers.js";
import { loginValidator, signupValidator, validate, } from "../utils/validator.js";
import { verifyToken } from "../utils/token-manager.js";
const userRoutes = Router();
userRoutes.get("/", getAllUsers);
userRoutes.post("/signup", validate(signupValidator), userSignup);
userRoutes.post("/login", validate(loginValidator), userLogin);
userRoutes.get("/auth-status", verifyToken, verifyUser);
userRoutes.get("/logout", verifyToken, userLogout);
userRoutes.post("/request-reset", requestPasswordReset);
userRoutes.post("/auth-otp", verifyOTPUser);
export default userRoutes;
//# sourceMappingURL=user-routes.js.map