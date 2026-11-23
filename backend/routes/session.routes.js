
import { Router } from "express";

import {
  createSession,
  getSessions,
  getSession,
  updateSession,
  startSession,
  endSession,
  deleteSession,
} from "../controllers/session.controller.js";

import {
  generateSessionNotes,
  getSessionNotes,
  deleteSessionNotes,
} from "../controllers/notes.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

import {
  createSessionSchema,
  updateSessionSchema,
} from "../validators/session.validator.js";

const router = Router();

router.use(protect);

// Session routes
router.post("/", validate(createSessionSchema), createSession);
router.get("/", getSessions);
router.get("/:id", getSession);
router.patch("/:id", validate(updateSessionSchema), updateSession);
router.post("/:id/start", startSession);
router.post("/:id/end", endSession);
router.delete("/:id", deleteSession);

// AI Notes routes
router.post("/:sessionId/ai-notes/generate", generateSessionNotes);
router.get("/:sessionId/ai-notes", getSessionNotes);
router.delete("/:sessionId/ai-notes", deleteSessionNotes);

export default router;
