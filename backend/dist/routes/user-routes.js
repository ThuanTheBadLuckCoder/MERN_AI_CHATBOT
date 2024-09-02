import { Router } from 'express';
import { getAllUsers, userLogin, userSignUp } from '../controllers/user-controllers.js';
import { loginValidator, signupValidator, validate } from '../utils/validator.js';
const userRoutes = Router();
userRoutes.get("/", getAllUsers);
userRoutes.post("/signup", validate(signupValidator), userSignUp);
userRoutes.post("/login", validate(loginValidator), userLogin);
export default userRoutes;
//# sourceMappingURL=user-routes.js.map