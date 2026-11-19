import type { DocumentItem } from "./types";

/* -------------------------------------------------
   Routes (TODO: match your folder names, case matters)
------------------------------------------------- */

export const DOCUMENTS_ROUTE = "/Documents";
export const documentDetailRoute = (id: string) => `/Documents/${id}`;

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/* -------------------------------------------------
   Field helpers (works with both backend field names)
------------------------------------------------- */

export type Origin = "uploaded" | "scraped" | "manual";

export const ORIGIN_BADGES: Record<Origin, string> = {
  uploaded: "Uploaded",
  scraped: "Scraped",
  manual: "Written",
};

export function field(item: unknown, keys: string[]): string {
  if (!item || typeof item !== "object") return "";

  const record = item as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
  }

  return "";
}

export function originOf(doc: unknown): Origin {
  const value = field(doc, ["origin", "source"]).toLowerCase();

  if (value.startsWith("manual")) return "manual";
  if (value.startsWith("scrap")) return "scraped";

  return "uploaded";
}

export const fullName = (doc: unknown) =>
  field(doc, ["fileName", "title", "name"]) || "Untitled";

export function fileType(doc: unknown): string {
  const name = field(doc, ["fileName", "name"]).toLowerCase();
  const mime = field(doc, ["mimeType", "type"]).toLowerCase();

  if (name.endsWith(".pdf") || mime.includes("pdf")) return "PDF";

  if (name.endsWith(".docx") || name.endsWith(".doc") || mime.includes("word")) {
    return "DOCX";
  }

  if (originOf(doc) === "manual") return "Text";

  return "File";
}

export function fileSize(doc: unknown): string {
  const bytes = Number(field(doc, ["size", "fileSize", "bytes"]));

  if (!bytes || Number.isNaN(bytes)) return "";

  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function metaLine(doc: unknown): string {
  return [
    formatDate(field(doc, ["createdAt", "created_at"])),
    fileType(doc),
    fileSize(doc),
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Text the AI reads (extracted from the file, or written by hand). */
export const textOf = (doc: unknown) =>
  field(doc, ["extractedText", "content", "parsedText", "text"]);

/** True when a real file (PDF/DOCX) is stored for this document. */
export const hasFile = (doc: unknown) =>
  originOf(doc) === "uploaded" &&
  Boolean(field(doc, ["cloudinaryPublicId", "fileUrl", "url"]));

/* -------------------------------------------------
   API calls
------------------------------------------------- */

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      (data as { message?: string } | null)?.message ?? "Request failed."
    );
  }

  return data as T;
}

export const documentActions = {
  /** PATCH /documents/:id  { fileName } */
  async rename(id: string, fileName: string): Promise<void> {
    await request(`/documents/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ fileName }),
    });
  },

  /** POST /documents/:id/extract-text  (reads the file and saves its text) */
  async extractText(id: string): Promise<string> {
    const result = await request<{ data: { document: unknown } }>(
      `/documents/${id}/extract-text`,
      { method: "POST" }
    );

    return textOf(result.data?.document);
  },
};

/** GET /documents/:id/file as a Blob */
export async function fetchFileBlob(doc: DocumentItem): Promise<Blob> {
  const response = await fetch(`${API_URL}/documents/${doc._id}/file`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("This file is not available right now.");
  }

  let blob = await response.blob();

  if (fileType(doc) === "PDF" && blob.type !== "application/pdf") {
    blob = new Blob([blob], { type: "application/pdf" });
  }

  return blob;
}

export async function downloadDocument(doc: DocumentItem): Promise<void> {
  let name = fullName(doc);
  let blob: Blob;

  if (hasFile(doc)) {
    blob = await fetchFileBlob(doc);
  } else {
    blob = new Blob([textOf(doc)], { type: "text/plain;charset=utf-8" });

    if (!/\.[a-z0-9]+$/i.test(name)) name += ".txt";
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = name;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}