
import { GoogleGenAI } from "@google/genai";
import mongoose from "mongoose";

import Session from "../models/Session.js";
import {
  Answer,
  TranscriptLine,
} from "../models/Answer.model.js";

/* -------------------------------------------------
   GEMINI CONFIGURATION
------------------------------------------------- */

const geminiApiKey = process.env.GEMINI_API_KEY;

const ai = geminiApiKey
  ? new GoogleGenAI({ apiKey: geminiApiKey })
  : null;

const AI_MODEL =
  process.env.DEFAULT_AI_MODEL || "gemini-2.5-flash";

/* -------------------------------------------------
   ANSWER FORMAT RULES
------------------------------------------------- */

const FORMAT_RULES = {
  bullet_points:
    "Answer in short, clear bullet points.",

  script_bullets:
    "Answer in bullet points where each bullet is a complete sentence the user can say aloud.",

  full_script:
    "Answer as a complete, natural script the user can read aloud word for word.",
};

/* -------------------------------------------------
   AUTHENTICATION HELPERS
------------------------------------------------- */

function getUserId(req) {
  return req.user?._id || req.user?.id || req.user?.userId;
}

async function findOwnedSession(req) {
  const userId = getUserId(req);

  if (!userId) {
    const error = new Error("User authentication required.");
    error.statusCode = 401;
    throw error;
  }

  const sessionId = req.params.sessionId;

  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    const error = new Error("Invalid session ID.");
    error.statusCode = 400;
    throw error;
  }

  const session = await Session.findOne({
    _id: sessionId,
    userId,
  });

  if (!session) {
    const error = new Error("Session not found.");
    error.statusCode = 404;
    throw error;
  }

  return session;
}

/* -------------------------------------------------
   SYSTEM PROMPT
------------------------------------------------- */

function buildSystemPrompt(session) {
  const parts = [
    "You are SPS AI Assistant, a real-time AI assistant helping the user during a live call.",
    "Give a direct, accurate and useful answer immediately.",
    "Do not include unnecessary introductions or preambles.",
    "Keep answers concise unless detailed information is required.",
    FORMAT_RULES[session.answerFormat] ||
      FORMAT_RULES.bullet_points,
    `Reply in this language code: ${session.language || "en"}.`,
  ];

  if (
    session.mode === "interview" ||
    session.mode === "mock"
  ) {
    parts.push(
      `The user is in a ${session.mode} interview for the role "${session.role || ""}" at "${session.company || ""}".`
    );

    if (session.jobDescription) {
      parts.push(
        `Job description:\n${session.jobDescription}`
      );
    }
  }

  if (session.instructions) {
    parts.push(
      `Additional instructions from the user:\n${session.instructions}`
    );
  }

  return parts.join("\n\n");
}

/* -------------------------------------------------
   IMAGE PARSER
------------------------------------------------- */

function parseImage(dataUrl) {
  if (typeof dataUrl !== "string") {
    return null;
  }

  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i.exec(
    dataUrl
  );

  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    data: match[2],
  };
}

/* -------------------------------------------------
   POST /sessions/:sessionId/answers
   Generate AI Answer
------------------------------------------------- */

export async function askAnswer(req, res) {
  try {
    if (!ai) {
      return res.status(503).json({
        success: false,
        message: "GEMINI_API_KEY is not configured.",
      });
    }

    const session = await findOwnedSession(req);
    const userId = getUserId(req);

    const {
      question,
      transcript = "",
      image,
    } = req.body || {};

    if (
      typeof question !== "string" ||
      !question.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Question is required.",
      });
    }

    if (question.length > 4000) {
      return res.status(400).json({
        success: false,
        message: "Question must not exceed 4000 characters.",
      });
    }

    const imagePart = image
      ? parseImage(image)
      : null;

    if (image && !imagePart) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid image. Only JPEG, PNG and WebP screenshots are supported.",
      });
    }

    const parts = [
      {
        text:
          (transcript
            ? `Recent conversation:\n${String(transcript).slice(-6000)}\n\n`
            : "") +
          `Question:\n${question.trim()}`,
      },
    ];

    if (imagePart) {
      parts.push({
        inlineData: imagePart,
      });
    }

    const startedAt = Date.now();

    const response = await ai.models.generateContent({
      model: AI_MODEL,
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      config: {
        systemInstruction: buildSystemPrompt(session),
        temperature: 0.4,
      },
    });

    const answerText = (response.text || "").trim();

    if (!answerText) {
      return res.status(502).json({
        success: false,
        message: "Gemini returned an empty answer.",
      });
    }

    const saved = await Answer.create({
      sessionId: session._id,
      userId,
      question: question.trim(),
      answer: answerText,
      source: imagePart ? "screenshot" : "manual",
      hasImage: Boolean(imagePart),
      model: AI_MODEL,
      language: session.language || "en",
      latencyMs: Date.now() - startedAt,
    });

    return res.status(200).json({
      success: true,
      id: saved._id,
      answer: answerText,
      source: saved.source,
      model: AI_MODEL,
      latencyMs: saved.latencyMs,
    });
  } catch (error) {
    console.error("askAnswer failed:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.statusCode
          ? error.message
          : "Unable to generate an answer right now.",
    });
  }
}

/* -------------------------------------------------
   GET /sessions/:sessionId/answers
   Get Saved Answers
------------------------------------------------- */

export async function listAnswers(req, res) {
  try {
    const session = await findOwnedSession(req);
    const userId = getUserId(req);

    const answers = await Answer.find({
      sessionId: session._id,
      userId,
    })
      .sort({ createdAt: 1 })
      .select(
        "question answer source hasImage createdAt model language latencyMs"
      )
      .lean();

    return res.status(200).json({
      success: true,
      answers,
    });
  } catch (error) {
    console.error("listAnswers failed:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.statusCode
          ? error.message
          : "Unable to load answers.",
    });
  }
}

/* -------------------------------------------------
   POST /sessions/:sessionId/transcript
   Save Transcript
------------------------------------------------- */

export async function saveTranscript(req, res) {
  try {
    const session = await findOwnedSession(req);
    const userId = getUserId(req);

    if (!session.saveTranscript) {
      return res.status(200).json({
        success: true,
        saved: 0,
        message: "Transcript saving is disabled for this session.",
      });
    }

    const lines = Array.isArray(req.body?.lines)
      ? req.body.lines
      : [];

    if (lines.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Maximum 50 transcript lines per request.",
      });
    }

    const docs = lines
      .filter(
        (line) =>
          typeof line === "string" &&
          line.trim().length > 0
      )
      .map((text) => ({
        sessionId: session._id,
        userId,
        text: text.trim().slice(0, 4000),
      }));

    if (docs.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid transcript lines provided.",
      });
    }

    await TranscriptLine.insertMany(docs);

    return res.status(201).json({
      success: true,
      saved: docs.length,
    });
  } catch (error) {
    console.error("saveTranscript failed:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.statusCode
          ? error.message
          : "Unable to save transcript.",
    });
  }
}
/* GET /sessions/:sessionId/transcript */
export async function listTranscript(req, res) {
  try {
    const session = await findOwnedSession(req);
    const userId = getUserId(req);

    const lines = await TranscriptLine.find({
      sessionId: session._id,
      userId,
    })
      .sort({ createdAt: 1 })
      .limit(1000)
      .select("text")
      .lean();

    return res.status(200).json({
      success: true,
      lines: lines.map((l) => l.text),
    });
  } catch (error) {
    console.error("listTranscript failed:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Unable to load transcript.",
    });
  }
}

/* POST /sessions/:sessionId/transcribe  (tab audio chunk -> text) */
export async function transcribeAudio(req, res) {
  try {
    if (!ai) {
      return res.status(503).json({
        success: false,
        message: "GEMINI_API_KEY is not configured.",
      });
    }

    await findOwnedSession(req);

    const { audio, mimeType = "audio/webm", language = "en" } = req.body || {};

    if (typeof audio !== "string" || !audio) {
      return res.status(400).json({ success: false, message: "Audio is required." });
    }

    if (audio.length > 900000) {
      return res.status(413).json({ success: false, message: "Audio chunk is too large." });
    }

    if (!/^audio\/(webm|ogg|mp4|mpeg|wav)$/i.test(mimeType)) {
      return res.status(400).json({ success: false, message: "Unsupported audio type." });
    }

    const response = await ai.models.generateContent({
      model: AI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                `Transcribe the speech in this audio verbatim. Language code: ${String(language).slice(0, 8)}. ` +
                `Add normal punctuation. Output only the transcript text. ` +
                `If there is no clear human speech, output exactly: NO_SPEECH`,
            },
            { inlineData: { mimeType, data: audio } },
          ],
        },
      ],
      config: { temperature: 0 },
    });

    let text = (response.text || "").trim();
    if (!text || /NO_SPEECH/i.test(text)) text = "";

    return res.status(200).json({ success: true, text });
  } catch (error) {
    console.error("transcribeAudio failed:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Unable to transcribe audio.",
    });
  }
}