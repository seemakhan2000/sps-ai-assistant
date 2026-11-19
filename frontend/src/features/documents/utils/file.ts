export const DOCUMENT_ACCEPT = ".pdf,.docx";
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS = [".pdf", ".docx"];

/**
 * Quick checks for a better experience. The backend must validate
 * file type, size and content again (SRS 4.9 and 4.17).
 */
export function validateDocumentFile(file: File): string | null {
  const name = file.name.toLowerCase();

  if (!ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return "Unsupported file type. Upload a PDF or DOCX file.";
  }
  if (file.size === 0) {
    return "This file is empty.";
  }
  if (file.size > DOCUMENT_MAX_BYTES) {
    return "This file is larger than 10 MB. Upload a smaller file.";
  }

  return null;
}