import { Router } from "express";

import {
  getDocuments,
  uploadDocument,
  createManualDocument,
  renameDocument,
  deleteDocument,
  getDocumentFile,
  extractDocumentText
} from "../controllers/document.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import upload from "../config/upload.js";

const router = Router();

router.use(protect);

router.get("/", getDocuments);

router.post(
  "/",
  upload.single("file"),
  uploadDocument
);

router.post("/manual", createManualDocument);

router.get("/:id/file", getDocumentFile);
router.post("/:id/extract-text", extractDocumentText);

router.patch("/:id", renameDocument);
router.delete("/:id", deleteDocument);

export default router;