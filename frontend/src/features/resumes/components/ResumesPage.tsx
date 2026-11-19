"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

import {
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
  FileText,
  LayoutGrid,
  List,
  MoreVertical,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import AppShell from "@/src/components/layout/Appshell";

import type { DocumentItem } from "@/src/features/documents/utils/types";

import {
  DOCUMENT_ACCEPT,
  validateDocumentFile,
} from "@/src/features/documents/utils/file";

import { documentService } from "@/src/features/services/document.service";

/* -------------------------------------------------
   Helpers
------------------------------------------------- */

type Tab = "all" | "uploaded";
type View = "grid" | "list";

function toMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function field(item: unknown, keys: string[]): string {
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

function displayName(resume: DocumentItem): string {
  const name = field(resume, ["fileName", "name", "title"]) || "Untitled";

  return name.replace(/\.(pdf|docx?)$/i, "");
}

function fileType(resume: DocumentItem): string {
  const name = field(resume, ["fileName", "name"]).toLowerCase();
  const mime = field(resume, ["mimeType", "type"]).toLowerCase();

  if (name.endsWith(".pdf") || mime.includes("pdf")) return "PDF";
  if (name.endsWith(".docx") || name.endsWith(".doc") || mime.includes("word")) {
    return "DOCX";
  }

  return "File";
}

function fileSize(resume: DocumentItem): string {
  const bytes = Number(field(resume, ["size", "fileSize", "bytes"]));

  if (!bytes || Number.isNaN(bytes)) return "";

  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function metaLine(resume: DocumentItem): string {
  return [
    formatDate(field(resume, ["createdAt", "created_at"])),
    fileType(resume),
    fileSize(resume),
  ]
    .filter(Boolean)
    .join(" · ");
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// A ready-to-open link stored on the document (if your backend sends one).
function directUrl(resume: DocumentItem): string {
  const value = field(resume, [
    "fileUrl",
    "url",
    "secureUrl",
    "downloadUrl",
    "publicUrl",
    "path",
  ]);

  if (/^https?:\/\//i.test(value)) return value;

  if (value.startsWith("/")) {
    try {
      return `${new URL(API_URL).origin}${value}`;
    } catch {
      return "";
    }
  }

  return "";
}

// Loads the resume file. The API route is tried first because the stored
// Cloudinary link is "authenticated" and the browser cannot show it reliably.
async function fetchResumeBlob(resume: DocumentItem): Promise<Blob> {
  const sources: Array<() => Promise<Response>> = [
    () =>
      fetch(`${API_URL}/documents/${resume._id}/file`, {
        credentials: "include",
      }),
  ];

  const direct = directUrl(resume);

  if (direct) sources.push(() => fetch(direct));

  for (const load of sources) {
    try {
      const response = await load();

      if (!response.ok) continue;

      let blob = await response.blob();

      if (fileType(resume) === "PDF" && blob.type !== "application/pdf") {
        blob = new Blob([blob], { type: "application/pdf" });
      }

      return blob;
    } catch {
      // try the next source
    }
  }

  throw new Error("This resume file is not available to open yet.");
}

/* -------------------------------------------------
   Small dropdown
------------------------------------------------- */

function Menu({
  trigger,
  children,
}: {
  trigger: (toggle: () => void) => ReactNode;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onClick={(event) => event.stopPropagation()}
    >
      {trigger(() => setOpen((current) => !current))}

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_8px_30px_rgba(30,58,138,0.14)]">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  children,
  danger = false,
}: {
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-slate-800 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------
   Resume card
------------------------------------------------- */

// Real first-page preview (like Parakeet). Needs: npm i pdfjs-dist
const thumbCache = new Map<string, string>();
const thumbInflight = new Map<string, Promise<string>>();

async function renderPdfFirstPage(resume: DocumentItem): Promise<string> {
  const blob = await fetchResumeBlob(resume);
  const data = new Uint8Array(await blob.arrayBuffer());

  const pdfjs = await import("pdfjs-dist");

  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

  const pdf = await pdfjs.getDocument({ data }).promise;
  const page = await pdf.getPage(1);

  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: 640 / base.width });

  const canvas = document.createElement("canvas");

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const context = canvas.getContext("2d");

  if (!context) throw new Error("Canvas is not supported");

  await page.render({
    canvasContext: context,
    canvas,
    viewport,
  } as unknown as Parameters<typeof page.render>[0]).promise;

  return canvas.toDataURL("image/jpeg", 0.85);
}

function getThumbnail(resume: DocumentItem): Promise<string> {
  const id = resume._id;
  const cached = thumbCache.get(id);

  if (cached) return Promise.resolve(cached);

  let pending = thumbInflight.get(id);

  if (!pending) {
    pending = renderPdfFirstPage(resume)
      .then((url) => {
        thumbCache.set(id, url);
        return url;
      })
      .finally(() => thumbInflight.delete(id));

    thumbInflight.set(id, pending);
  }

  return pending;
}

function ResumePreview({ resume }: { resume: DocumentItem }) {
  const id = resume._id;
  const supplied = field(resume, ["thumbnailUrl", "previewUrl", "thumbnail"]);

  const [image, setImage] = useState<string>(
    supplied || thumbCache.get(id) || ""
  );
  const [failed, setFailed] = useState(false);

  const hostRef = useRef<HTMLDivElement>(null);
  const isPdf = fileType(resume) === "PDF";

  // Text saved by the backend (used when no image can be drawn)
  const text = field(resume, [
    "extractedText",
    "text",
    "content",
    "parsedText",
  ])
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1400);

  // Draw the first page only when the card is near the screen.
  useEffect(() => {
    if (image || failed || !isPdf) return;

    const node = hostRef.current;

    if (!node) return;

    let cancelled = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;

        observer.disconnect();

        getThumbnail(resume)
          .then((url) => {
            if (!cancelled) setImage(url);
          })
          .catch(() => {
            if (!cancelled) setFailed(true);
          });
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, image, failed, isPdf]);

  return (
    <div
      ref={hostRef}
      className="flex h-[250px] justify-center overflow-hidden rounded-[22px] bg-[#DCE7FB] pt-5"
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={`${displayName(resume)} preview`}
          className="h-auto w-[78%] self-start rounded-t-sm bg-white shadow-[0_2px_10px_rgba(30,58,138,0.18)]"
        />
      ) : text ? (
        <div
          aria-hidden="true"
          className="h-full w-[78%] self-start overflow-hidden rounded-t-sm bg-white shadow-[0_2px_10px_rgba(30,58,138,0.18)]"
        >
          <div className="w-[200%] origin-top-left scale-50 p-6 font-serif text-[10px] leading-[14px] text-slate-700">
            {text}
          </div>
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="h-full w-[78%] self-start rounded-t-sm bg-white px-5 pt-6 shadow-[0_2px_10px_rgba(30,58,138,0.18)]"
        >
          <div className="mx-auto h-2.5 w-24 rounded bg-slate-300" />
          <div className="mx-auto mt-1.5 h-1.5 w-16 rounded bg-slate-200" />
          <div className="mt-5 h-1.5 w-20 rounded bg-slate-300" />
          <div className="mt-2 h-1 w-full rounded bg-slate-200" />
          <div className="mt-1.5 h-1 w-full rounded bg-slate-200" />
          <div className="mt-1.5 h-1 w-5/6 rounded bg-slate-200" />
          <div className="mt-5 h-1.5 w-24 rounded bg-slate-300" />
          <div className="mt-2 h-1 w-full rounded bg-slate-200" />
          <div className="mt-1.5 h-1 w-full rounded bg-slate-200" />
          <div className="mt-1.5 h-1 w-4/5 rounded bg-slate-200" />
        </div>
      )}
    </div>
  );
}

function ResumeCard({
  resume,
  view,
  deleting,
  onOpen,
  onDelete,
}: {
  resume: DocumentItem;
  view: View;
  deleting: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const name = displayName(resume);

  // The whole card opens the resume (keyboard accessible too).
  const openProps = {
    role: "button" as const,
    tabIndex: 0,
    onClick: onOpen,
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) return;

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOpen();
      }
    },
    "aria-label": `Open ${name}`,
  };

  const menu = (
    <Menu
      trigger={(toggle) => (
        <button
          type="button"
          aria-label={`Options for ${name}`}
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-800 transition hover:bg-blue-900/10"
        >
          <MoreVertical size={17} />
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuItem
            onClick={() => {
              close();
              onOpen();
            }}
          >
            <ExternalLink size={15} aria-hidden="true" />
            Open
          </MenuItem>

          <MenuItem
            danger
            onClick={() => {
              close();
              onDelete();
            }}
          >
            <Trash2 size={15} aria-hidden="true" />
            Delete
          </MenuItem>
        </>
      )}
    </Menu>
  );

  if (view === "list") {
    return (
      <article
        {...openProps}
        className="flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 transition hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900/30"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#DCE7FB] text-blue-900">
          <FileText size={20} aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[16px] font-medium text-slate-900">
            {name}
          </h3>
          <p className="text-[13px] text-slate-500">{metaLine(resume)}</p>
        </div>

        {deleting && <span className="text-[13px] text-slate-500">Deleting...</span>}

        {menu}
      </article>
    );
  }

  return (
    <article
      {...openProps}
      className={`cursor-pointer rounded-[28px] border border-slate-200 bg-white p-1.5 shadow-[0_1px_2px_rgba(30,58,138,0.05)] transition hover:border-blue-300 hover:shadow-[0_6px_20px_rgba(30,58,138,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900/30 ${
        deleting ? "opacity-60" : ""
      }`}
    >
      <ResumePreview resume={resume} />

      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-3.5">
        <div className="min-w-0">
          <h3 className="truncate text-[19px] font-medium leading-6 text-slate-900">
            {name}
          </h3>

          <p className="mt-1 text-[13px] text-slate-500">
            {deleting ? "Deleting..." : metaLine(resume)}
          </p>
        </div>

        {menu}
      </div>
    </article>
  );
}

/* -------------------------------------------------
   Page
------------------------------------------------- */

/**
 * Manage existing resumes for interview context.
 * No resume creation, editing, scoring or tailoring.
 */
export default function ResumesPage() {
  const fileRef = useRef<HTMLInputElement>(null);

  const [resumes, setResumes] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DocumentItem | null>(null);
  const [error, setError] = useState("");

  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [newestFirst, setNewestFirst] = useState(true);
  const [view, setView] = useState<View>("grid");

  // Load resumes
  const loadResumes = useCallback(async () => {
    try {
      setError("");

      const result = await documentService.list();

      setResumes(result.data.documents ?? []);
    } catch (err) {
      setError(toMessage(err, "We couldn't load your resumes."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadResumes();
  }, [loadResumes]);

  // Upload resume
  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    const fileError = validateDocumentFile(file);

    if (fileError) {
      setError(fileError);
      return;
    }

    try {
      setError("");
      setUploading(true);

      const result = await documentService.upload(file);

      setResumes((current) => [result.data.document, ...current]);
    } catch (err) {
      setError(toMessage(err, "Upload failed. Please try again."));
    } finally {
      setUploading(false);
    }
  }

  // Delete resume
  async function confirmDelete() {
    const resume = pendingDelete;

    if (!resume) return;

    setPendingDelete(null);

    try {
      setError("");
      setDeletingId(resume._id);

      await documentService.remove(resume._id);

      setResumes((current) =>
        current.filter((item) => item._id !== resume._id)
      );
    } catch (err) {
      setError(toMessage(err, "Unable to delete the resume."));
    } finally {
      setDeletingId(null);
    }
  }

  // Open resume in a new tab
  async function openResume(resume: DocumentItem) {
    setError("");

    // Open the tab right away (inside the click) so pop-up blockers allow it.
    const tab = window.open("", "_blank");

    try {
      const blob = await fetchResumeBlob(resume);
      const objectUrl = URL.createObjectURL(blob);

      if (tab) tab.location.href = objectUrl;
      else window.open(objectUrl, "_blank");

      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (err) {
      tab?.close();
      setError(toMessage(err, "Unable to open this resume."));
    }
  }

  // Search + sort (every resume here is an uploaded one)
  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();

    const filtered = resumes.filter((resume) =>
      search
        ? field(resume, ["fileName", "name"]).toLowerCase().includes(search)
        : true
    );

    return filtered.sort((a, b) => {
      const first = new Date(field(a, ["createdAt"])).getTime() || 0;
      const second = new Date(field(b, ["createdAt"])).getTime() || 0;

      return newestFirst ? second - first : first - second;
    });
  }, [resumes, query, newestFirst]);

  return (
    <AppShell
      title="Resumes"
      subtitle="Upload a PDF or DOCX resume to personalize AI answers."
    >
      <div className="space-y-5">
        {/* Add resume (split button) */}

        <div className="flex justify-end">
          <input
            ref={fileRef}
            type="file"
            accept={DOCUMENT_ACCEPT}
            onChange={handleFile}
            className="sr-only"
            aria-label="Upload a resume"
          />

          <div className="flex h-12 items-stretch rounded-2xl bg-blue-900 text-white">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="rounded-l-2xl px-7 text-[15px] font-semibold transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Add resume"}
            </button>

            <span className="my-2 w-px bg-white/30" />

            <Menu
              trigger={(toggle) => (
                <button
                  type="button"
                  aria-label="More options"
                  onClick={toggle}
                  disabled={uploading}
                  className="flex h-12 items-center rounded-r-2xl px-4 transition hover:bg-blue-800 disabled:opacity-60"
                >
                  <ChevronDown size={16} />
                </button>
              )}
            >
              {(close) => (
                <MenuItem
                  onClick={() => {
                    close();
                    fileRef.current?.click();
                  }}
                >
                  <Upload size={15} aria-hidden="true" />
                  Upload PDF or DOCX
                </MenuItem>
              )}
            </Menu>
          </div>
        </div>

        {/* Error */}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Tabs */}

        <div className="flex items-center justify-between border-b border-slate-200">
          <div role="tablist" className="flex gap-2">
            {(
              [
                { value: "all", label: "All" },
                { value: "uploaded", label: "Uploaded" },
              ] as const
            ).map(({ value, label }) => {
              const selected = tab === value;

              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setTab(value)}
                  className={`-mb-px border-b-2 px-4 py-3.5 text-[15px] transition ${
                    selected
                      ? "border-blue-900 font-medium text-slate-900"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <span className="text-[14px] text-slate-500">
            {visible.length} {visible.length === 1 ? "Resume" : "Resumes"}
          </span>
        </div>

        {/* Search + view toggle */}

        <div className="flex items-center justify-between gap-4">
          <div className="flex h-12 w-full max-w-[320px] items-center rounded-xl border border-slate-200 bg-white">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-4">
              <Search size={16} className="shrink-0 text-slate-500" />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search CVs or resumes"
                aria-label="Search resumes"
                className="h-full w-full bg-transparent text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setNewestFirst((current) => !current)}
              aria-label={newestFirst ? "Sort oldest first" : "Sort newest first"}
              title={newestFirst ? "Newest first" : "Oldest first"}
              className="flex h-full w-12 items-center justify-center rounded-r-xl border-l border-slate-200 text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowUpDown size={16} />
            </button>
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1">
            {(
              [
                { value: "grid", label: "Grid view", Icon: LayoutGrid },
                { value: "list", label: "List view", Icon: List },
              ] as const
            ).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                aria-label={label}
                aria-pressed={view === value}
                onClick={() => setView(value)}
                className={`flex h-9 w-11 items-center justify-center rounded-lg transition ${
                  view === value
                    ? "bg-white text-blue-900 shadow-[0_1px_3px_rgba(30,58,138,0.15)]"
                    : "text-slate-500"
                }`}
              >
                <Icon size={17} />
              </button>
            ))}
          </div>
        </div>

        {/* Resume list */}

        <section aria-label="Your resumes">
          {loading ? (
            <p className="py-8 text-sm text-slate-500">Loading resumes...</p>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center">
              <FileText
                size={35}
                className="mx-auto text-slate-300"
                aria-hidden="true"
              />

              <h2 className="mt-4 font-semibold text-slate-900">
                {query ? "No matching resumes" : "No resumes yet"}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {query
                  ? "Try a different search."
                  : "Upload your resume to get answers based on your experience."}
              </p>
            </div>
          ) : (
            <div
              className={
                view === "grid"
                  ? "grid grid-cols-1 gap-5 pb-6 md:grid-cols-2 xl:grid-cols-3"
                  : "space-y-3 pb-6"
              }
            >
              {visible.map((resume) => (
                <ResumeCard
                  key={resume._id}
                  resume={resume}
                  view={view}
                  deleting={deletingId === resume._id}
                  onOpen={() => void openResume(resume)}
                  onDelete={() => setPendingDelete(resume)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Delete confirmation */}

      {pendingDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPendingDelete(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-resume-title"
            className="w-full max-w-[420px] rounded-[24px] border border-slate-200 bg-white p-7 shadow-[0_24px_80px_rgba(30,58,138,0.25)]"
          >
            <h2
              id="delete-resume-title"
              className="text-[20px] font-semibold text-slate-900"
            >
              Delete resume?
            </h2>

            <p className="mt-2 text-[15px] leading-6 text-slate-500">
              &quot;{field(pendingDelete, ["fileName", "name"])}&quot; will be
              permanently deleted. This can&apos;t be undone.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="h-12 rounded-xl bg-slate-100 text-[15px] font-medium text-slate-900 transition hover:bg-slate-200"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                className="h-12 rounded-xl bg-red-600 text-[15px] font-semibold text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}