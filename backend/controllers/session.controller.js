
import mongoose from "mongoose";
import Session from "../models/Session.js";

/**
 * Local async handler
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Application error
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validate MongoDB ObjectId
 */
const validateSessionId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid session ID.", 400);
  }
};

/**
 * Get authenticated user's ID
 */
const getUserId = (req) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    throw new AppError("Authentication required.", 401);
  }

  return userId;
};

/**
 * CREATE SESSION
 * POST /api/sessions
 */
export const createSession = asyncHandler(async (req, res) => {
  const userId = getUserId(req);

  const {
    mode,
    role = "",
    company = "",
    resumeDocumentId = null,
    documentIds = [],
    instructions = "",
    language = "en",
    model,
    answerFormat = "bullet_points",
    saveTranscript = false
  } = req.body;

  if (!["interview", "regular", "mock"].includes(mode)) {
    throw new AppError("Invalid session mode.", 400);
  }

  if (
    (mode === "interview" || mode === "mock") &&
    (!role.trim() || !company.trim())
  ) {
    throw new AppError(
      "Role and company are required for interview sessions.",
      400
    );
  }

  if (!model) {
    throw new AppError("Please select an AI model.", 400);
  }

  const timerDuration = 600;

  const session = await Session.create({
    userId,
    mode,
    role: role.trim(),
    company: company.trim(),
    resumeDocumentId: resumeDocumentId || null,
    documentIds,
    instructions,
    language,
    model,
    answerFormat,
    saveTranscript,
    state: "ready",
    timerDuration,
    remainingTime: timerDuration
  });

  res.status(201).json({
    success: true,
    message: "Session created successfully.",
    data: { session }
  });
});

/**
 * GET ALL SESSIONS
 * GET /api/sessions
 */
export const getSessions = asyncHandler(async (req, res) => {
  const userId = getUserId(req);

  const {
    mode,
    state,
    search,
    page = 1,
    limit = 50
  } = req.query;

  const filter = { userId };

  if (mode && ["interview", "regular", "mock"].includes(mode)) {
    filter.mode = mode;
  }

  if (state && ["ready", "live", "ended"].includes(state)) {
    filter.state = state;
  }

  if (search && String(search).trim()) {
    const searchRegex = new RegExp(
      String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );

    filter.$or = [
      { role: searchRegex },
      { company: searchRegex },
      { instructions: searchRegex }
    ];
  }

  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const skip = (currentPage - 1) * pageSize;

  const [sessions, total] = await Promise.all([
    Session.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),

    Session.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    data: {
      sessions,
      total,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  });
});

/**
 * GET SINGLE SESSION
 * GET /api/sessions/:id
 */
export const getSession = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  validateSessionId(id);

  const session = await Session.findOne({
    _id: id,
    userId
  }).lean();

  if (!session) {
    throw new AppError("Session not found.", 404);
  }

  res.status(200).json({
    success: true,
    data: { session }
  });
});

/**
 * UPDATE SESSION
 * PATCH /api/sessions/:id
 *
 * Only ready sessions can be edited.
 */
export const updateSession = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  validateSessionId(id);

  const session = await Session.findOne({
    _id: id,
    userId
  });

  if (!session) {
    throw new AppError("Session not found.", 404);
  }

  if (session.state !== "ready") {
    throw new AppError(
      "Only sessions that have not started can be edited.",
      409
    );
  }

  const allowedFields = [
    "mode",
    "role",
    "company",
    "resumeDocumentId",
    "documentIds",
    "instructions",
    "language",
    "model",
    "answerFormat",
    "saveTranscript"
  ];

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      session[field] = req.body[field];
    }
  }

  if (!["interview", "regular", "mock"].includes(session.mode)) {
    throw new AppError("Invalid session mode.", 400);
  }

  if (
    ["interview", "mock"].includes(session.mode) &&
    (!session.role?.trim() || !session.company?.trim())
  ) {
    throw new AppError(
      "Role and company are required for interview sessions.",
      400
    );
  }

  if (session.role) session.role = session.role.trim();
  if (session.company) session.company = session.company.trim();

  await session.save();

  res.status(200).json({
    success: true,
    message: "Session updated successfully.",
    data: { session }
  });
});

/**
 * START SESSION
 * POST /api/sessions/:id/start
 */
export const startSession = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  validateSessionId(id);

  const session = await Session.findOne({
    _id: id,
    userId
  });

  if (!session) {
    throw new AppError("Session not found.", 404);
  }

  if (session.state === "live") {
    throw new AppError("This session is already running.", 409);
  }

  if (session.state === "ended") {
    throw new AppError(
      "This session has already ended and cannot be started again.",
      409
    );
  }

  session.state = "live";
  session.startedAt = new Date();
  session.endedAt = undefined;
  session.lastLeftAt = undefined;
  session.resumableUntil = undefined;

  if (!session.remainingTime || session.remainingTime <= 0) {
    session.remainingTime = session.timerDuration || 600;
  }

  await session.save();

  res.status(200).json({
    success: true,
    message: "Session started successfully.",
    data: { session }
  });
});

/**
 * END SESSION
 * POST /api/sessions/:id/end
 */
export const endSession = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  validateSessionId(id);

  const session = await Session.findOne({
    _id: id,
    userId
  });

  if (!session) {
    throw new AppError("Session not found.", 404);
  }

  if (session.state === "ended") {
    throw new AppError("This session has already ended.", 409);
  }

  if (session.state !== "live") {
    throw new AppError("This session has not been started.", 409);
  }

  session.state = "ended";
  session.endedAt = new Date();
  session.lastLeftAt = new Date();
  session.resumableUntil = undefined;

  await session.save();

  res.status(200).json({
    success: true,
    message: "Session ended successfully.",
    data: { session }
  });
});

/** DELETE SESSION**/
export const deleteSession = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;

  validateSessionId(id);

  const session = await Session.findOne({
    _id: id,
    userId
  });

  if (!session) {
    throw new AppError("Session not found.", 404);
  }

  if (session.state === "live") {
    throw new AppError(
      "A live session cannot be deleted. End it first.",
      409
    );
  }

  await session.deleteOne();

  res.status(200).json({
    success: true,
    message: "Session deleted successfully."
  });
});