
import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    mode: {
      type: String,
      enum: ["interview", "regular", "mock"],
      required: true
    },

    role: {
      type: String,
      trim: true,
      maxlength: 150
    },

    company: {
      type: String,
      trim: true,
      maxlength: 150
    },

    resumeDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null
    },

    documentIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document"
    }],

    instructions: {
      type: String,
      maxlength: 20000,
      default: ""
    },

    language: {
      type: String,
      default: "en"
    },

    model: {
      type: String,
      required: true
    },

    answerFormat: {
      type: String,
      enum: ["bullet_points", "script_bullets", "full_script"],
      default: "bullet_points"
    },

    saveTranscript: {
      type: Boolean,
      default: false
    },

    state: {
      type: String,
      enum: ["ready", "live", "ended"],
      default: "ready"
    },

    timerDuration: {
      type: Number,
      default: 600,
      min: 60
    },

    remainingTime: {
      type: Number,
      default: 600,
      min: 0
    },

    startedAt: Date,
    endedAt: Date,

    lastLeftAt: Date,

    resumableUntil: Date
  },
  {
    timestamps: true,
    versionKey: false
  }
);

sessionSchema.index({ userId: 1, createdAt: -1 });
sessionSchema.index({ userId: 1, state: 1 });

const Session = mongoose.model("Session", sessionSchema);

export default Session;