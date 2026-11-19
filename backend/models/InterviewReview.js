import mongoose from "mongoose";

const interviewReviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },

    // Company is copied from the session so reviews can be grouped per company.
    company: { type: String, required: true, trim: true, maxlength: 150, index: true },
    role: { type: String, required: true, trim: true, maxlength: 150 },
    interviewDate: { type: String, default: "" }, // "YYYY-MM"

    rating: { type: Number, required: true, min: 1, max: 5 },
    difficulty: { type: Number, required: true, min: 1, max: 5 },

    outcome: {
      type: String,
      required: true,
      enum: ["Offer accepted", "Offer declined", "No offer", "Still waiting"],
    },
    source: {
      type: String,
      required: true,
      enum: ["Applied online", "Recruiter reached out", "Employee referral", "Campus or university", "Other"],
    },
    involved: [{ type: String, maxlength: 60 }],
    duration: {
      type: String,
      default: "",
      enum: ["", "Under a week", "1 to 2 weeks", "3 to 4 weeks", "1 to 2 months", "Over 2 months"],
    },

    process: { type: String, required: true, minlength: 40, maxlength: 4000 },
    didWell: { type: String, default: "", maxlength: 2000 },
    couldBeBetter: { type: String, default: "", maxlength: 2000 },

    salary: {
      currency: { type: String, default: "" },
      period: { type: String, enum: ["", "year", "month", "hour"], default: "" },
      from: { type: Number, default: null, min: 0 },
      to: { type: Number, default: null, min: 0 },
    },

    recommend: { type: Boolean, required: true },

    // Show publicly only after moderation.
    status: { type: String, enum: ["pending", "published", "rejected"], default: "pending", index: true },
  },
  { timestamps: true, versionKey: false }
);

// One review per user per session.
interviewReviewSchema.index({ userId: 1, sessionId: 1 }, { unique: true });

const InterviewReview =
  mongoose.models.InterviewReview ||
  mongoose.model("InterviewReview", interviewReviewSchema);

export default InterviewReview;