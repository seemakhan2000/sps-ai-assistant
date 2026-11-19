
import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    content: {
      type: String,
      default: ""
    },

    kind: {
      type: String,
      enum: ["reference", "resume"],
      default: "reference",
      required: true
    },

    fileName: {
      type: String,
      default: ""
    },

    fileUrl: {
      type: String,
      default: ""
    },

    cloudinaryPublicId: {
      type: String,
      default: ""
    },

    cloudinaryResourceType: {
      type: String,
      default: "raw"
    },

    cloudinaryType: {
      type: String,
      default: "authenticated"
    },

    source: {
      type: String,
      enum: ["manual", "upload"],
      default: "manual"
    },

    mimeType: {
      type: String,
      default: ""
    },

    fileSize: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

const Document =
  mongoose.models.Document ||
  mongoose.model("Document", documentSchema);

export default Document;
