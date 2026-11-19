import { Router } from "express";

import {
  createSession,
  getSessions,
  getSession,
  updateSession,
  startSession,
  endSession,
  deleteSession
} from "../controllers/session.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

import {
  createSessionSchema,
  updateSessionSchema
} from "../validators/session.validator.js";

const router = Router();

router.use(protect);

router.post("/", validate(createSessionSchema), createSession);
router.get("/", getSessions);
router.get("/:id", getSession);
router.patch("/:id", validate(updateSessionSchema), updateSession);
router.post("/:id/start", startSession);
router.post("/:id/end", endSession);
router.delete("/:id", deleteSession);

export default router;