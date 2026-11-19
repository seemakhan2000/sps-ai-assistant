import { Router } from "express";
import { getModels } from "../controllers/model.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protect);

router.get("/", getModels);

export default router;