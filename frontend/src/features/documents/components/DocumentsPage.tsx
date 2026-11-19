"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";

import {
  ArrowUpDown,
  Download,
  FileText,
  FileUp,
  Globe,
  LayoutGrid,
  List,
  MoreVertical,
  PenLine,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import AppShell from "@/src/components/layout/Appshell";
import { documentService } from "@/src/features/services/document.service";

import type { DocumentItem } from "../utils/types";

import { DOCUMENT_ACCEPT, validateDocumentFile } from "../utils/file";

import {
  ORIGIN_BADGES,
  documentActions,
  documentDetailRoute,
  downloadDocument,
  field,
  fullName,
  metaLine,
  originOf,
  textOf,
  type Origin,
} from "../utils/documentUtils";

import { DeleteDialog, Menu, MenuItem, RenameDialog } from "./DocumentUi";

import {
  AddDocumentChooser,
  ScrapeUrlModal,
  UploadDocumentsModal,
  fileKey,
} from "./AddDocumentModals";

/* -------------------------------------------------
   Constants
------------------------------------------------- */

type Tab = "all" | Origin;
type View = "grid" | "list";
type ModalName = null | "choose" | "upload" | "scrape";

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "uploaded", label: "Uploaded" },
  { value: "scraped", label: "Scraped" },
];

const ORIGIN_ICON = {
  uploaded: FileUp,
  scraped: Globe,
  manual: PenLine,
} as const;

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/* -------------------------------------------------
   Preview (the text the AI reads, drawn like a page)
------------------------------------------------- */

function DocumentPreview({ doc }: { doc: DocumentItem }) {
  const text = textOf(doc).replace(/\s+/g, " ").trim().slice(0, 1400);

  const origin = originOf(doc);
  const BadgeIcon = ORIGIN_ICON[origin];

  return (
    <div className="relative flex h-[250px] justify-center overflow-hidden rounded-[22px] bg-[#DCE7FB] pt-5">
      {text ? (
        <div
          aria-hidden="true"
          className="h-full w-[78%] self-start overflow-hidden rounded-t-sm bg-white shadow-[0_2px_10px_rgba(30,58,138,0.18)]"
        >
          <div className="w-[200%] origin-top-left scale-50 p-6 text-slate-700">
            <p className="mb-3 text-[13px] font-semibold text-slate-900">
              {fullName(doc)}
            </p>

            <p className="text-[10px] leading-[14px]">{text}</p>
          </div>
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="h-full w-[78%] self-start rounded-t-sm bg-white px-5 pt-6 shadow-[0_2px_10px_rgba(30,58,138,0.18)]"
        >
          <div className="h-2.5 w-24 rounded bg-slate-300" />
          <div className="mt-4 h-1 w-full rounded bg-slate-200" />
          <div className="mt-1.5 h-1 w-full rounded bg-slate-200" />
          <div className="mt-1.5 h-1 w-5/6 rounded bg-slate-200" />
          <div className="mt-4 h-1 w-full rounded bg-slate-200" />
          <div className="mt-1.5 h-1 w-4/5 rounded bg-slate-200" />
        </div>
      )}

      <span className="absolute bottom-3 left-3 flex h-8 items-center gap-1.5 rounded-full bg-slate-600/85 px-3 text-[13px] font-medium text-white">
        <BadgeIcon size={14} aria-hidden="true" />
        {ORIGIN_BADGES[origin]}
      </span>
    </div>
  );
}

/* -------------------------------------------------
   Card
------------------------------------------------- */

function DocumentCard({
  doc,
  view,
  deleting,
  onOpen,
  onRename,
  onDownload,
  onDelete,
}: {
  doc: DocumentItem;
  view: View;
  deleting: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const name = fullName(doc);
  const origin = originOf(doc);

  // The whole card opens the document (keyboard accessible too).
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
          disabled={deleting}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-800 transition hover:bg-blue-900/10 disabled:opacity-60"
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
              onRename();
            }}
          >
            <Pencil size={15} aria-hidden="true" />
            Rename
          </MenuItem>

          <MenuItem
            onClick={() => {
              close();
              onDownload();
            }}
          >
            <Download size={15} aria-hidden="true" />
            Download
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
        className={`flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 transition hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900/30 ${
          deleting ? "opacity-60" : ""
        }`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#DCE7FB] text-blue-900">
          <FileText size={20} aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[16px] font-medium text-slate-900">
            {name}
          </h3>

          <p className="text-[13px] text-slate-500">
            {deleting ? "Deleting..." : metaLine(doc)}
          </p>
        </div>

        <span className="hidden h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 sm:flex">
          {ORIGIN_BADGES[origin]}
        </span>

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
      <DocumentPreview doc={doc} />

      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-3.5">
        <div className="min-w-0">
          <h3 className="truncate text-[19px] font-medium leading-6 text-slate-900">
            {name}
          </h3>

          <p className="mt-1 text-[13px] text-slate-500">
            {deleting ? "Deleting..." : metaLine(doc)}
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

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10";

export default function DocumentsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add-document modals
  const [modal, setModal] = useState<ModalName>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [modalError, setModalError] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DocumentItem | null>(null);
  const [renaming, setRenaming] = useState<DocumentItem | null>(null);

  const [showManual, setShowManual] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [newestFirst, setNewestFirst] = useState(true);
  const [view, setView] = useState<View>("grid");

  // Load documents
  const loadDocuments = useCallback(async () => {
    try {
      setError("");

      const result = await documentService.list();

      setDocuments(result.data.documents ?? []);
    } catch (error) {
      setError(getErrorMessage(error, "Unable to load documents."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  /* -----------------------------------------------
     Add document modals
  ------------------------------------------------ */

  function openChooser() {
    setError("");
    setModalError("");
    setModal("choose");
  }

  function closeModals() {
    if (uploading || scraping) return;

    setModal(null);
    setPendingFiles([]);
    setModalError("");
  }

  function backToChooser() {
    if (uploading || scraping) return;

    setPendingFiles([]);
    setModalError("");
    setModal("choose");
  }

  // "Upload document" → open the upload modal and the file picker together
  function chooseUpload() {
    setModalError("");
    setModal("upload");
    fileRef.current?.click();
  }

  function chooseScrape() {
    setModalError("");
    setModal("scrape");
  }

  function chooseManual() {
    setModal(null);
    setError("");
    setShowManual(true);
  }

  // Validate and add files to the list (works for picker and drag & drop)
  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    const valid: File[] = [];
    const problems: string[] = [];

    for (const file of incoming) {
      const validationError = validateDocumentFile(file);

      if (validationError) problems.push(`${file.name}: ${validationError}`);
      else valid.push(file);
    }

    setPendingFiles((current) => {
      const keys = new Set(current.map(fileKey));

      return [...current, ...valid.filter((file) => !keys.has(fileKey(file)))];
    });

    setModalError(problems.join(" "));
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;

    if (files && files.length > 0) addFiles(files);

    event.target.value = "";
  }

  function removePending(index: number) {
    setPendingFiles((current) => current.filter((_, i) => i !== index));
  }

  // Upload every file in the list, one by one
  async function uploadPending() {
    if (pendingFiles.length === 0) return;

    setUploading(true);
    setModalError("");

    const failed: File[] = [];
    let lastError = "";

    for (const file of pendingFiles) {
      try {
        const result = await documentService.upload(file);

        setDocuments((current) => [result.data.document, ...current]);
      } catch (error) {
        failed.push(file);
        lastError = `${file.name}: ${getErrorMessage(error, "Upload failed.")}`;
      }
    }

    setUploading(false);
    setPendingFiles(failed);

    if (failed.length > 0) {
      setModalError(lastError);
      return;
    }

    setModal(null);
  }

  // Scrape a URL (uses the first matching method on your document service)
  async function handleScrape(url: string) {
    const service = documentService as unknown as Record<
      string,
      ((value: string) => Promise<{ data: { document: DocumentItem } }>) | undefined
    >;

    const scrape = service.scrapeUrl ?? service.scrape ?? service.importUrl;

    if (!scrape) {
      setModalError(
        "URL import is not connected yet. Add a scrapeUrl method to document.service."
      );
      return;
    }

    try {
      setScraping(true);
      setModalError("");

      const result = await scrape.call(documentService, url);

      setDocuments((current) => [result.data.document, ...current]);
      setModal(null);
    } catch (error) {
      setModalError(getErrorMessage(error, "Unable to import this URL."));
    } finally {
      setScraping(false);
    }
  }

  /* -----------------------------------------------
     Manual document
  ------------------------------------------------ */

  async function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanTitle = title.trim();
    const cleanText = text.trim();

    if (!cleanTitle || !cleanText) {
      setError("Please enter document title and content.");
      return;
    }

    try {
      setError("");
      setSaving(true);

      // Both field names are sent so it works with either API contract.
      const result = await documentService.createManual({
        origin: "manual",
        fileName: cleanTitle,
        extractedText: cleanText,
        title: cleanTitle,
        content: cleanText,
        kind: "reference",
      } as unknown as Parameters<typeof documentService.createManual>[0]);

      setDocuments((current) => [result.data.document, ...current]);

      setTitle("");
      setText("");
      setShowManual(false);
    } catch (error) {
      setError(getErrorMessage(error, "Unable to save document."));
    } finally {
      setSaving(false);
    }
  }

  // Rename document
  async function handleRename(doc: DocumentItem, name: string) {
    await documentActions.rename(doc._id, name);

    setDocuments((current) =>
      current.map((item) =>
        item._id === doc._id
          ? ({
              ...item,
              fileName: name,
              title: name.replace(/\.[^.]+$/, ""),
            } as DocumentItem)
          : item
      )
    );
  }

  // Download document
  async function handleDownload(doc: DocumentItem) {
    try {
      setError("");

      await downloadDocument(doc);
    } catch (error) {
      setError(getErrorMessage(error, "Unable to download this document."));
    }
  }

  // Delete document
  async function confirmDelete() {
    const doc = pendingDelete;

    if (!doc) return;

    setPendingDelete(null);

    try {
      setError("");
      setDeletingId(doc._id);

      await documentService.remove(doc._id);

      setDocuments((current) => current.filter((item) => item._id !== doc._id));
    } catch (error) {
      setError(getErrorMessage(error, "Unable to delete document."));
    } finally {
      setDeletingId(null);
    }
  }

  // Tabs + search + sort
  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();

    const filtered = documents.filter((doc) => {
      if (tab !== "all" && originOf(doc) !== tab) return false;

      return search ? fullName(doc).toLowerCase().includes(search) : true;
    });

    return filtered.sort((a, b) => {
      const first = new Date(field(a, ["createdAt"])).getTime() || 0;
      const second = new Date(field(b, ["createdAt"])).getTime() || 0;

      return newestFirst ? second - first : first - second;
    });
  }, [documents, tab, query, newestFirst]);

  function closeManual() {
    setShowManual(false);
    setTitle("");
    setText("");
    setError("");
  }

  return (
    <AppShell
      title="Documents"
      subtitle="Add documents for more relevant AI answers."
    >
      <div className="space-y-5">
        {/* Add document */}

        <div className="flex justify-end">
          {/* Hidden picker used by the upload modal */}
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={DOCUMENT_ACCEPT}
            onChange={handleFileInput}
            className="sr-only"
            aria-label="Choose documents to upload"
          />

          <button
            type="button"
            onClick={openChooser}
            className="flex h-12 items-center gap-2 rounded-2xl bg-blue-900 px-7 text-[15px] font-semibold text-white transition hover:bg-blue-800"
          >
            <Plus size={17} aria-hidden="true" />
            Add document
          </button>
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

        {/* Manual document form */}

        {showManual && (
          <form
            onSubmit={handleManualSubmit}
            className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(30,58,138,0.05)]"
          >
            <div>
              <label
                htmlFor="doc-title"
                className="mb-1.5 block text-[14px] font-medium text-slate-900"
              >
                Document title
              </label>

              <input
                id="doc-title"
                type="text"
                value={title}
                maxLength={120}
                required
                placeholder="Enter document title"
                onChange={(event) => setTitle(event.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="doc-text"
                className="mb-1.5 block text-[14px] font-medium text-slate-900"
              >
                Document content
              </label>

              <textarea
                id="doc-text"
                rows={8}
                value={text}
                required
                placeholder="Write your document content here..."
                onChange={(event) => setText(event.target.value)}
                className={`${inputClass} resize-y`}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={closeManual}
                className="h-11 rounded-xl bg-slate-100 px-5 text-[14px] font-medium text-slate-900 transition hover:bg-slate-200 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="h-11 rounded-xl bg-blue-900 px-5 text-[14px] font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save document"}
              </button>
            </div>
          </form>
        )}

        {/* Tabs */}

        <div className="flex items-center justify-between border-b border-slate-200">
          <div role="tablist" className="flex gap-2 overflow-x-auto">
            {TABS.map(({ value, label }) => {
              const selected = tab === value;

              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setTab(value)}
                  className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3.5 text-[15px] transition ${
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

          <span className="shrink-0 pl-3 text-[14px] text-slate-500">
            {visible.length} {visible.length === 1 ? "Document" : "Documents"}
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
                placeholder="Search documents"
                aria-label="Search documents"
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

        {/* Document list */}

        <section aria-label="Your documents">
          {loading ? (
            <p className="py-8 text-sm text-slate-500">Loading documents...</p>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center">
              <FileText
                size={35}
                className="mx-auto text-slate-300"
                aria-hidden="true"
              />

              <h2 className="mt-4 font-semibold text-slate-900">
                {query || tab !== "all"
                  ? "No matching documents"
                  : "No documents yet"}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {query || tab !== "all"
                  ? "Try a different search or filter."
                  : "Upload a PDF or DOCX file, or write a document by hand."}
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
              {visible.map((doc) => (
                <DocumentCard
                  key={doc._id}
                  doc={doc}
                  view={view}
                  deleting={deletingId === doc._id}
                  onOpen={() => router.push(documentDetailRoute(doc._id))}
                  onRename={() => setRenaming(doc)}
                  onDownload={() => void handleDownload(doc)}
                  onDelete={() => setPendingDelete(doc)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Add document flow */}

      {modal === "choose" && (
        <AddDocumentChooser
          onUpload={chooseUpload}
          onScrape={chooseScrape}
          onManual={chooseManual}
          onClose={closeModals}
        />
      )}

      {modal === "upload" && (
        <UploadDocumentsModal
          files={pendingFiles}
          uploading={uploading}
          error={modalError}
          onAddMore={() => fileRef.current?.click()}
          onDropFiles={addFiles}
          onRemove={removePending}
          onBack={backToChooser}
          onUpload={() => void uploadPending()}
          onClose={closeModals}
        />
      )}

      {modal === "scrape" && (
        <ScrapeUrlModal
          busy={scraping}
          error={modalError}
          onBack={backToChooser}
          onSubmit={(url) => void handleScrape(url)}
          onClose={closeModals}
        />
      )}

      {renaming && (
        <RenameDialog
          name={fullName(renaming)}
          onClose={() => setRenaming(null)}
          onSave={(name) => handleRename(renaming, name)}
        />
      )}

      {pendingDelete && (
        <DeleteDialog
          name={fullName(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </AppShell>
  );
}