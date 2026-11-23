
import mongoose from "mongoose";

const sessionNoteSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    summary: {
      type: String,
      default: "",
    },
    questions: {
      type: [String],
      default: [],
    },
    nextSteps: {
      type: [String],
      default: [],
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const SessionNote = mongoose.model("SessionNote", sessionNoteSchema);

export default SessionNote;
