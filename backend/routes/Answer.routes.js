import express from "express";
import rateLimit from "express-rate-limit";

import { protect } from "../middleware/auth.middleware.js";

import {
  askAnswer,
  listAnswers,
  saveTranscript,
  listTranscript,
  transcribeAudio,
} from "../controllers/Answer.controller.js";

const router = express.Router();

const transcribeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many audio requests." },
});

router.use(protect);

router.post("/sessions/:sessionId/answers", askAnswer);
router.get("/sessions/:sessionId/answers", listAnswers);
router.post("/sessions/:sessionId/transcript", saveTranscript);
router.get("/sessions/:sessionId/transcript", listTranscript);
router.post("/sessions/:sessionId/transcribe", transcribeLimiter, transcribeAudio);

export default router;