
import { apiFetch } from "../lib/api";

import type {
  CreateManualDocumentPayload,
  DocumentItem,
  DocumentKind
} from "../documents/utils/types";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const documentService = {
  // Get all documents or filter by kind.
  list(
    kind?: DocumentKind
  ): Promise<ApiResponse<{ documents: DocumentItem[] }>> {
    const query = kind
      ? `?kind=${encodeURIComponent(kind)}`
      : "";

    return apiFetch(`/documents${query}`);
  },

  // Upload PDF or DOCX to Cloudinary.
  async upload(
    file: File,
    kind: DocumentKind = "reference"
  ): Promise<ApiResponse<{ document: DocumentItem }>> {
    const form = new FormData();

    form.append("file", file);
    form.append("kind", kind);

    return apiFetch("/documents", {
      method: "POST",
      body: form
    });
  },

  // Create a manual document in MongoDB.
  createManual(
    payload: CreateManualDocumentPayload
  ): Promise<ApiResponse<{ document: DocumentItem }>> {
    return apiFetch("/documents/manual", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  // Delete document and its Cloudinary file.
  remove(id: string): Promise<ApiResponse<unknown>> {
    return apiFetch(`/documents/${id}`, {
      method: "DELETE"
    });
  }
};
