"use client";

import { useState, type DragEvent, type FormEvent, type ReactNode } from "react";

import {
  FileText,
  Globe,
  PenLine,
  Plus,
  Upload,
  X,
} from "lucide-react";

/* -------------------------------------------------
   Helpers
------------------------------------------------- */

export function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function fileMeta(file: File): string {
  const ext = file.name.includes(".")
    ? file.name.split(".").pop()!.toUpperCase()
    : "FILE";

  const size =
    file.size >= 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(file.size / 1024))} KB`;

  return `${ext} · ${size}`;
}

/* -------------------------------------------------
   Shared shell
------------------------------------------------- */

function Shell({
  titleId,
  title,
  subtitle,
  centered = false,
  busy = false,
  onClose,
  children,
}: {
  titleId: string;
  title: string;
  subtitle: string;
  centered?: boolean;
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-[440px] rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
        >
          <X size={18} strokeWidth={1.8} />
        </button>

        <div className={centered ? "px-6 text-center" : "pr-8"}>
          <h2
            id={titleId}
            className="text-[18px] font-semibold leading-6 text-slate-900"
          >
            {title}
          </h2>

          <p className="mt-1.5 text-[14px] leading-5 text-slate-500">
            {subtitle}
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}

const primaryBtn =
  "h-11 rounded-xl bg-[#111111] px-5 text-[14px] font-semibold text-white transition hover:bg-[#2A2A2A] disabled:cursor-not-allowed disabled:opacity-50";

const secondaryBtn =
  "h-11 rounded-xl bg-slate-100 px-5 text-[14px] font-medium text-slate-900 transition hover:bg-slate-200 disabled:opacity-50";

const optionBtn =
  "flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[14px] font-semibold text-slate-900 transition hover:bg-slate-50";

/* -------------------------------------------------
   1) Choose how to add
------------------------------------------------- */

export function AddDocumentChooser({
  onUpload,
  onScrape,
  onManual,
  onClose,
}: {
  onUpload: () => void;
  onScrape: () => void;
  onManual: () => void;
  onClose: () => void;
}) {
  return (
    <Shell
      titleId="add-document-title"
      title="Add document"
      subtitle="Choose how to add content the AI can reference during sessions."
      centered
      onClose={onClose}
    >
      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={onUpload}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#111111] text-[14px] font-semibold text-white transition hover:bg-[#2A2A2A]"
        >
          <Upload size={16} aria-hidden="true" />
          Upload document
        </button>

        <button type="button" onClick={onScrape} className={optionBtn}>
          <Globe size={16} aria-hidden="true" />
          Scrape from URL
        </button>

        <button type="button" onClick={onManual} className={optionBtn}>
          <PenLine size={16} aria-hidden="true" />
          Create manually
        </button>
      </div>
    </Shell>
  );
}

/* -------------------------------------------------
   2) Upload (multiple files, add more any time)
------------------------------------------------- */

export function UploadDocumentsModal({
  files,
  uploading,
  error,
  onAddMore,
  onDropFiles,
  onRemove,
  onBack,
  onUpload,
  onClose,
}: {
  files: File[];
  uploading: boolean;
  error: string;
  onAddMore: () => void;
  onDropFiles: (files: FileList) => void;
  onRemove: (index: number) => void;
  onBack: () => void;
  onUpload: () => void;
  onClose: () => void;
}) {
  const [dragging, setDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);

    if (uploading) return;

    if (event.dataTransfer.files?.length) onDropFiles(event.dataTransfer.files);
  }

  return (
    <Shell
      titleId="upload-document-title"
      title="Upload document"
      subtitle="Upload documents the AI should reference when generating answers."
      busy={uploading}
      onClose={onClose}
    >
      <button
        type="button"
        onClick={onAddMore}
        disabled={uploading}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed text-[14px] font-medium text-slate-900 transition disabled:opacity-60 ${
          dragging
            ? "border-slate-500 bg-slate-50"
            : "border-slate-300 hover:bg-slate-50"
        }`}
      >
        <Plus size={16} aria-hidden="true" />
        {files.length > 0 ? "Add more files" : "Choose files"}
      </button>

      {files.length > 0 && (
        <div className="mt-4">
          <p className="text-[14px] font-medium text-slate-900">
            {files.length} {files.length === 1 ? "file" : "files"} ready
          </p>

          <ul className="mt-2 max-h-[200px] space-y-2 overflow-y-auto">
            {files.map((file, index) => (
              <li
                key={fileKey(file)}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5"
              >
                <FileText
                  size={18}
                  strokeWidth={1.6}
                  className="shrink-0 text-slate-600"
                  aria-hidden="true"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-slate-900">
                    {file.name}
                  </p>
                  <p className="text-[12px] text-slate-500">{fileMeta(file)}</p>
                </div>

                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  disabled={uploading}
                  aria-label={`Remove ${file.name}`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  <X size={15} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[13px] leading-5 text-red-600">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={uploading}
          className={secondaryBtn}
        >
          Back
        </button>

        <button
          type="button"
          onClick={onUpload}
          disabled={uploading || files.length === 0}
          className={primaryBtn}
        >
          {uploading ? "Uploading..." : "Upload Documents"}
        </button>
      </div>
    </Shell>
  );
}

/* -------------------------------------------------
   3) Scrape from URL
------------------------------------------------- */

export function ScrapeUrlModal({
  busy,
  error,
  onBack,
  onSubmit,
  onClose,
}: {
  busy: boolean;
  error: string;
  onBack: () => void;
  onSubmit: (url: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const clean = url.trim();

    if (clean) onSubmit(clean);
  }

  return (
    <Shell
      titleId="scrape-document-title"
      title="Scrape from URL"
      subtitle="Paste a link and we will import its text for the AI to reference."
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <input
          type="url"
          value={url}
          required
          autoFocus
          disabled={busy}
          placeholder="https://example.com/page"
          aria-label="Page URL"
          onChange={(event) => setUrl(event.target.value)}
          className="mt-5 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 disabled:opacity-60"
        />

        {error && (
          <p role="alert" className="mt-3 text-[13px] leading-5 text-red-600">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={busy}
            className={secondaryBtn}
          >
            Back
          </button>

          <button
            type="submit"
            disabled={busy || !url.trim()}
            className={primaryBtn}
          >
            {busy ? "Importing..." : "Import"}
          </button>
        </div>
      </form>
    </Shell>
  );
}