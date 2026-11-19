import express from "express";
import { protect } from "../middleware/auth.middleware.js";

import {
  askAnswer,
  listAnswers,
  saveTranscript,
} from "../controllers/Answer.controller.js";

const router = express.Router();

// Generate answer
router.post(
  "/sessions/:sessionId/answers",
  express.json({ limit: "6mb" }),
  protect,
  askAnswer
);

// Get answers
router.get(
  "/sessions/:sessionId/answers",
  protect,
  listAnswers
);

// Save transcript
router.post(
  "/sessions/:sessionId/transcript",
  express.json({ limit: "6mb" }),
  protect,
  saveTranscript
);

export default router;