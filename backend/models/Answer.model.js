import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    question: { type: String, required: true, maxlength: 4000 },
    answer: { type: String, required: true },
    source: {
      type: String,
      enum: ["manual", "screenshot"],
      default: "manual",
    },
    // Screenshots are not stored (too large), only a flag.
    hasImage: { type: Boolean, default: false },
    model: { type: String },
    language: { type: String },
    latencyMs: { type: Number },
  },
  { timestamps: true }
);

export const Answer = mongoose.model("Answer", answerSchema);

/* ------------------------------------------------- */

const transcriptSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, required: true, maxlength: 4000 },
  },
  { timestamps: true }
);

export const TranscriptLine = mongoose.model(
  "TranscriptLine",
  transcriptSchema
);