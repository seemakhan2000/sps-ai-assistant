import { Readable } from "node:stream";

import mongoose from "mongoose";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";

import Document from "../models/Document.js";
import cloudinary from "../config/cloudinary.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TEXT_LENGTH = 50000;

function getUserId(req) {
  return req.user?._id || req.user?.id;
}

function uploadToCloudinary(file, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        type: "authenticated",
        folder,
        use_filename: true,
        unique_filename: true,
        overwrite: false
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    Readable.from(file.buffer).pipe(stream);
  });
}

function getSignedFileUrl(publicId) {
  return cloudinary.url(publicId, {
    resource_type: "raw",
    type: "authenticated",
    sign_url: true,
    secure: true
  });
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

// Reads the text inside a PDF / DOCX so the AI (and the page) can use it.
async function extractTextFromBuffer(buffer, mimeType = "", fileName = "") {
  const name = String(fileName).toLowerCase();

  try {
    if (mimeType === "application/pdf" || name.endsWith(".pdf")) {
      const result = await pdfParse(buffer);
      return normalizeText(result.text);
    }

    if (name.endsWith(".docx") || mimeType.includes("wordprocessingml")) {
      const result = await mammoth.extractRawText({ buffer });
      return normalizeText(result.value);
    }
  } catch (error) {
    console.error("Text extraction failed:", error.message);
  }

  return "";
}

// GET /api/documents
export async function getDocuments(req, res, next) {
  try {
    const userId = getUserId(req);

    const documents = await Document.find({ userId })
      .select("-__v")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: documents.length,
      data: { documents }
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/documents
export async function uploadDocument(req, res, next) {
  let cloudinaryPublicId = null;

  try {
    const userId = getUserId(req);
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Please select a PDF or DOCX file."
      });
    }

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid authenticated user."
      });
    }

    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: "File size must not exceed 10 MB."
      });
    }

    const kind = req.body.kind || "reference";

    if (!["resume", "reference"].includes(kind)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document type."
      });
    }

    // Upload actual file to Cloudinary.
    const uploaded = await uploadToCloudinary(
      file,
      process.env.CLOUDINARY_FOLDER ||
        "sps-ai-assistant/documents"
    );

    cloudinaryPublicId = uploaded.public_id;

    // Generate a signed delivery URL.
    const fileUrl = getSignedFileUrl(uploaded.public_id);

    // Read the text inside the file (PDF / DOCX).
    const extractedText = await extractTextFromBuffer(
      file.buffer,
      file.mimetype,
      file.originalname
    );

    // Save metadata (and the extracted text) in MongoDB.
    const document = await Document.create({
      userId,
      title: file.originalname.replace(/\.[^.]+$/, ""),
      content: extractedText,
      kind,
      fileName: file.originalname,
      fileUrl,
      cloudinaryPublicId: uploaded.public_id,
      cloudinaryResourceType: "raw",
      cloudinaryType: "authenticated",
      source: "upload",
      mimeType: file.mimetype,
      fileSize: file.size
    });

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully.",
      data: { document }
    });
  } catch (error) {
    // Prevent orphaned files if MongoDB save fails.
    if (cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(
          cloudinaryPublicId,
          {
            resource_type: "raw",
            type: "authenticated",
            invalidate: true
          }
        );
      } catch (cleanupError) {
        console.error(
          "Cloudinary cleanup failed:",
          cleanupError.message
        );
      }
    }

    next(error);
  }
}

// POST /api/documents/manual
export async function createManualDocument(req, res, next) {
  try {
    const userId = getUserId(req);
    const { title, content, kind } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Document title is required."
      });
    }

    if (!["resume", "reference"].includes(kind || "reference")) {
      return res.status(400).json({
        success: false,
        message: "Invalid document type."
      });
    }

    const document = await Document.create({
      userId,
      title: title.trim(),
      content: content || "",
      kind: kind || "reference",
      source: "manual"
    });

    return res.status(201).json({
      success: true,
      message: "Document created successfully.",
      data: { document }
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/documents/:id   { fileName }
export async function renameDocument(req, res, next) {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const fileName = String(req.body?.fileName || "").trim();

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID."
      });
    }

    if (!fileName || fileName.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 1 and 150 characters."
      });
    }

    const document = await Document.findOne({ _id: id, userId });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found."
      });
    }

    document.fileName = fileName;
    document.title = fileName.replace(/\.[^.]+$/, "") || fileName;

    await document.save();

    return res.status(200).json({
      success: true,
      message: "Document renamed successfully.",
      data: { document }
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/documents/:id
export async function deleteDocument(req, res, next) {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID."
      });
    }

    const document = await Document.findOne({
      _id: id,
      userId
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found."
      });
    }

    // Delete Cloudinary asset first.
    if (
      document.source === "upload" &&
      document.cloudinaryPublicId
    ) {
      const result = await cloudinary.uploader.destroy(
        document.cloudinaryPublicId,
        {
          resource_type: "raw",
          type: document.cloudinaryType || "authenticated",
          invalidate: true
        }
      );

      if (result.result !== "ok" &&
          result.result !== "not found") {
        return res.status(502).json({
          success: false,
          message: "Unable to delete file from Cloudinary."
        });
      }
    }

    await document.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully."
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/documents/:id/file
export async function getDocumentFile(req, res, next) {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID."
      });
    }

    const document = await Document.findOne({
      _id: id,
      userId
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found."
      });
    }

    if (document.source !== "upload" || !document.cloudinaryPublicId) {
      return res.status(404).json({
        success: false,
        message: "This document has no uploaded file."
      });
    }

    // Fresh signed link for the private (authenticated) Cloudinary file.
    const upstream = await fetch(
      getSignedFileUrl(document.cloudinaryPublicId)
    );

    if (!upstream.ok) {
      return res.status(502).json({
        success: false,
        message: "Unable to load the file."
      });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader(
      "Content-Type",
      document.mimeType ||
        upstream.headers.get("content-type") ||
        "application/octet-stream"
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(
        document.fileName || "document"
      )}`
    );

    res.setHeader("Cache-Control", "private, max-age=300");

    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}

// POST /api/documents/:id/extract-text
// For files uploaded before text reading existed: reads the file once and
// saves its text in `content`.
export async function extractDocumentText(req, res, next) {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID."
      });
    }

    const document = await Document.findOne({ _id: id, userId });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found."
      });
    }

    if (document.source !== "upload" || !document.cloudinaryPublicId) {
      return res.status(200).json({
        success: true,
        data: { document }
      });
    }

    if (!document.content) {
      const upstream = await fetch(
        getSignedFileUrl(document.cloudinaryPublicId)
      );

      if (!upstream.ok) {
        return res.status(502).json({
          success: false,
          message: "Unable to load the file."
        });
      }

      const buffer = Buffer.from(await upstream.arrayBuffer());

      document.content = await extractTextFromBuffer(
        buffer,
        document.mimeType,
        document.fileName
      );

      await document.save();
    }

    return res.status(200).json({
      success: true,
      data: { document }
    });
  } catch (error) {
    next(error);
  }
}