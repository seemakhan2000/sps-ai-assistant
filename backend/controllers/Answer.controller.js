
import { GoogleGenAI } from "@google/genai";
import Session from "../models/Session.js";
import { Answer, TranscriptLine } from "../models/Answer.model.js";

/* -------------------------------------------------
   GEMINI CONFIGURATION
------------------------------------------------- */

const geminiApiKey = process.env.GEMINI_API_KEY;

const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
    })
  : null;

const FALLBACK_MODEL =
  process.env.DEFAULT_AI_MODEL || "gemini-2.5-flash-lite";

/* -------------------------------------------------
   ANSWER FORMAT RULES
------------------------------------------------- */

const FORMAT_RULES = {
  bullet_points: "Answer in short, clear bullet points.",

  script_bullets:
    "Answer in bullet points where each bullet is a complete sentence the user can say aloud.",

  full_script:
    "Answer as a complete, natural script the user can read aloud word for word.",
};

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
   FIND USER'S SESSION
------------------------------------------------- */

async function findOwnedSession(req) {
  return Session.findOne({
    _id: req.params.sessionId,
    userId: req.user.id,
  });
}

/* -------------------------------------------------
   POST /sessions/:sessionId/answers
   Generate AI Answer
------------------------------------------------- */

export async function askAnswer(req, res) {
  try {
    // Check Gemini API configuration
    if (!ai) {
      return res.status(503).json({
        message:
          "Gemini API key is missing. Please configure GEMINI_API_KEY in backend .env.",
      });
    }

    const {
      question,
      transcript = "",
      image,
    } = req.body || {};

    // Validate question
    if (
      typeof question !== "string" ||
      !question.trim()
    ) {
      return res.status(400).json({
        message: "Question is required.",
      });
    }

    if (question.length > 4000) {
      return res.status(400).json({
        message: "Question must not exceed 4000 characters.",
      });
    }

    // Find authenticated user's session
    const session = await findOwnedSession(req);

    if (!session) {
      return res.status(404).json({
        message: "Session not found.",
      });
    }

    // Validate screenshot
    const imagePart = image
      ? parseImage(image)
      : null;

    if (image && !imagePart) {
      return res.status(400).json({
        message:
          "Invalid image. Only JPEG, PNG and WebP screenshots are supported.",
      });
    }

    // Prepare Gemini request parts
    const parts = [
      {
        text:
          (transcript
            ? `Recent conversation:\n${String(transcript).slice(-6000)}\n\n`
            : "") +
          `Question:\n${question.trim()}`,
      },
    ];

    // Attach screenshot when provided
    if (imagePart) {
      parts.push({
        inlineData: imagePart,
      });
    }

    /*
      IMPORTANT:
      Always use the Gemini model configured in .env.
      Do not use session.model here because older sessions
      may contain OpenAI model IDs such as gpt-4.1.
    */

    const model = FALLBACK_MODEL;

    const startedAt = Date.now();

    // Generate answer using Gemini
    const response = await ai.models.generateContent({
      model,

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

    const answerText = (
      response.text || ""
    ).trim();

    if (!answerText) {
      return res.status(502).json({
        message:
          "Gemini returned an empty answer. Please try again.",
      });
    }

    // Save generated answer in MongoDB
    const saved = await Answer.create({
      sessionId: session._id,
      userId: req.user.id,

      question: question.trim(),
      answer: answerText,

      source: imagePart
        ? "screenshot"
        : "manual",

      hasImage: Boolean(imagePart),

      model,
      language: session.language || "en",

      latencyMs: Date.now() - startedAt,
    });

    return res.status(200).json({
      success: true,
      id: saved._id,
      answer: answerText,
      source: imagePart
        ? "screenshot"
        : "manual",
      model,
      latencyMs: saved.latencyMs,
    });
  } catch (error) {
    console.error(
      "askAnswer failed:",
      error
    );

    // Gemini API errors
    if (
      error.status === 429 ||
      error.status === 404 ||
      error.status === 400
    ) {
      return res.status(502).json({
        message:
          "Gemini AI request failed. Please check your model, API key or API quota.",
        details: error.message,
      });
    }

    return res.status(500).json({
      message:
        "Unable to generate an answer right now.",
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

    if (!session) {
      return res.status(404).json({
        message: "Session not found.",
      });
    }

    const answers = await Answer.find({
      sessionId: session._id,
      userId: req.user.id,
    })
      .sort({
        createdAt: 1,
      })
      .select(
        "question answer source hasImage createdAt model language latencyMs"
      )
      .lean();

    return res.status(200).json({
      success: true,
      answers,
    });
  } catch (error) {
    console.error(
      "listAnswers failed:",
      error
    );

    return res.status(500).json({
      message: "Unable to load answers.",
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

    if (!session) {
      return res.status(404).json({
        message: "Session not found.",
      });
    }

    // Respect user's Save Transcript setting
    if (!session.saveTranscript) {
      return res.status(204).end();
    }

    const lines = Array.isArray(req.body?.lines)
      ? req.body.lines
      : [];

    const docs = lines
      .filter(
        (line) =>
          typeof line === "string" &&
          line.trim()
      )
      .slice(0, 50)
      .map((text) => ({
        sessionId: session._id,
        userId: req.user.id,
        text: text.trim().slice(0, 4000),
      }));

    if (docs.length > 0) {
      await TranscriptLine.insertMany(docs);
    }

    return res.status(201).json({
      success: true,
      saved: docs.length,
    });
  } catch (error) {
    console.error(
      "saveTranscript failed:",
      error
    );

    return res.status(500).json({
      message: "Unable to save transcript.",
    });
  }
}
