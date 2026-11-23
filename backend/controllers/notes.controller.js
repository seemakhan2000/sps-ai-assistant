import mongoose from "mongoose";
import Session from "../models/Session.js";
import SessionNote from "../models/SessionNote.js";
import { generateNotes } from "../services/notes.service.js";

function getUserId(req) {
  return req.user?._id || req.user?.id || req.user?.userId;
}

async function getOwnedSession(req) {
  const userId = getUserId(req);

  if (!userId) {
    const error = new Error("User authentication required.");
    error.statusCode = 401;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.sessionId)) {
    const error = new Error("Invalid session ID.");
    error.statusCode = 400;
    throw error;
  }

  const session = await Session.findOne({
    _id: req.params.sessionId,
    userId,
  });

  if (!session) {
    const error = new Error("Session not found.");
    error.statusCode = 404;
    throw error;
  }

  return { session, userId };
}

export async function generateSessionNotes(req, res, next) {
  try {
    const { session, userId } = await getOwnedSession(req);

    const clientTranscript = Array.isArray(req.body?.transcript)
      ? req.body.transcript
          .filter((s) => typeof s === "string" && s.trim())
          .slice(-500)
      : [];

    const notes = await generateNotes(session, clientTranscript);

    const savedNotes = await SessionNote.findOneAndUpdate(
      { sessionId: session._id, userId },
      {
        $set: {
          summary: notes.summary,
          questions: notes.questions,
          nextSteps: notes.nextSteps,
          generatedAt: new Date(),
        },
        $setOnInsert: {
          sessionId: session._id,
          userId,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "AI Notes generated successfully.",
      notes: savedNotes,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSessionNotes(req, res, next) {
  try {
    const { session, userId } = await getOwnedSession(req);

    const notes = await SessionNote.findOne({
      sessionId: session._id,
      userId,
    }).lean();

    return res.status(200).json({
      success: true,
      notes,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteSessionNotes(req, res, next) {
  try {
    const { session, userId } = await getOwnedSession(req);

    await SessionNote.findOneAndDelete({
      sessionId: session._id,
      userId,
    });

    return res.status(200).json({
      success: true,
      message: "AI Notes deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}