import { GoogleGenAI } from "@google/genai";
import { TranscriptLine } from "../models/Answer.model.js";

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const NOTES_MODEL = process.env.DEFAULT_AI_MODEL || "gemini-2.5-flash";
const FALLBACK_MODEL = process.env.FALLBACK_AI_MODEL || "gemini-2.0-flash";

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isOverloaded(err) {
  const msg = String(err?.message || "");
  return (
    err?.status === 503 ||
    err?.code === 503 ||
    err?.status === 429 ||
    err?.code === 429 ||
    /UNAVAILABLE|overloaded|high demand|RESOURCE_EXHAUSTED/i.test(msg)
  );
}

// 2 koshish primary model par, phir 1 fallback model par
async function generateWithRetry(request) {
  const attempts = [NOTES_MODEL, NOTES_MODEL, FALLBACK_MODEL];

  for (let i = 0; i < attempts.length; i++) {
    try {
      return await ai.models.generateContent({
        ...request,
        model: attempts[i],
      });
    } catch (err) {
      if (!isOverloaded(err)) throw err; // doosra error ho to retry nahi
      if (i < attempts.length - 1) await sleep(1500 * (i + 1));
    }
  }

  throw httpError(
    "The AI service is busy right now. Please try again in a minute.",
    503
  );
}

export async function generateNotes(session, clientTranscript = []) {
  if (!ai) throw httpError("GEMINI_API_KEY is not configured.", 503);

  // 1) DB transcript (last 500 lines, phir chronological order mein)
  const dbLines = await TranscriptLine.find({
    sessionId: session._id,
    userId: session.userId,
  })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  let lines = dbLines
    .reverse()
    .map((l) => l.text)
    .filter(Boolean);

  // 2) Fallback: frontend ki transcript
  if (!lines.length && clientTranscript.length) {
    lines = clientTranscript;
  }

  const transcript = lines.join("\n").trim();

  if (!transcript) {
    throw httpError(
      "No transcript available for this session. Speak during the call or enable Save transcript.",
      400
    );
  }

  const prompt = `
You are an expert interview and meeting note-taking assistant.

Session type: ${session.mode}
Role: ${session.role || "-"}
Company: ${session.company || "-"}

Analyze the transcript below and return valid JSON only:

{
  "summary": "A concise summary of the session",
  "questions": ["Important question 1"],
  "nextSteps": ["Recommended next step 1"]
}

Rules:
- Use only information from the transcript.
- Do not invent facts.
- Extract important questions.
- Suggest practical next steps.
- If information is unavailable, return an empty array.
- Write in language code: ${session.language || "en"}.

TRANSCRIPT:
${transcript.slice(-20000)}
`;

  const response = await generateWithRetry({
    contents: prompt,
    config: { temperature: 0.3, responseMimeType: "application/json" },
  });

  const cleaned = (response.text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw httpError("AI returned an invalid response.", 502);
  }

  let result;
  try {
    result = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw httpError("AI returned invalid JSON.", 502);
  }

  const strings = (arr) =>
    Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];

  return {
    summary: typeof result.summary === "string" ? result.summary : "",
    questions: strings(result.questions),
    nextSteps: strings(result.nextSteps),
  };
}