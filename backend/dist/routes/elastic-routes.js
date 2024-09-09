import { Router } from 'express';
import { sendContextToSystem } from "../controllers/context-controller.js";
const elasticRoutes = Router();
elasticRoutes.get("/_doc/6y_81JEBZ_vxNztSEq3N", sendContextToSystem);
export default elasticRoutes;
//# sourceMappingURL=elastic-routes.js.map