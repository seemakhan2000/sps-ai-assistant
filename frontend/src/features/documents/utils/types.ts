export type DocumentOrigin = "uploaded" | "scraped" | "manual";

export type DocumentKind = "resume" | "reference";

export interface DocumentItem {
  _id: string;
  origin: DocumentOrigin;
  kind?: DocumentKind;
  fileName: string;
  fileType?: string;
  sourceUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateManualDocumentPayload {
  origin: "manual";
  fileName: string;
  extractedText: string;
}