"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  ChevronRight,
  Download,
  FileText,
  MoreVertical,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";

import AppShell from "@/src/components/layout/Appshell";
import { documentService } from "@/src/features/services/document.service";

import type { DocumentItem } from "../utils/types";

import {
  DOCUMENTS_ROUTE,
  documentActions,
  downloadDocument,
  fetchFileBlob,
  fileType,
  fullName,
  hasFile,
  textOf,
} from "../utils/documentUtils";

import { DeleteDialog, Menu, MenuItem, RenameDialog } from "./DocumentUi";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => (
          <p key={index} className="mb-3.5 text-[15px] leading-6 text-slate-800">
            {line}
          </p>
        ))}
    </>
  );
}

export default function DocumentDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  const [extracting, setExtracting] = useState(false);
  const [extractFailed, setExtractFailed] = useState(false);

  const [viewerUrl, setViewerUrl] = useState("");
  const [viewerState, setViewerState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const docRef = useRef<DocumentItem | null>(null);
  const triedExtract = useRef(false);

  docRef.current = doc;

  // Load the document
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      try {
        setError("");

        const result = await documentService.list();
        const found = (result.data.documents ?? []).find(
          (item) => item._id === id
        );

        if (cancelled) return;

        if (found) setDoc(found);
        else setNotFound(true);
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Unable to load this document."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Older uploads have no saved text yet: read it from the file once.
  const docId = doc?._id;
  const uploadedFile = doc ? hasFile(doc) : false;
  const hasText = doc ? Boolean(textOf(doc)) : false;

  useEffect(() => {
    if (!docId || !uploadedFile || hasText || triedExtract.current) return;

    triedExtract.current = true;

    let cancelled = false;

    setExtracting(true);

    documentActions
      .extractText(docId)
      .then((text) => {
        if (cancelled) return;

        if (!text) {
          setExtractFailed(true);
          return;
        }

        setDoc((current) =>
          current
            ? ({ ...current, content: text, extractedText: text } as DocumentItem)
            : current
        );
      })
      .catch(() => {
        if (!cancelled) setExtractFailed(true);
      })
      .finally(() => {
        if (!cancelled) setExtracting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [docId, uploadedFile, hasText]);

  // Load the PDF for the viewer
  const isPdf = doc ? uploadedFile && fileType(doc) === "PDF" : false;

  useEffect(() => {
    if (!docId || !isPdf || !docRef.current) return;

    let objectUrl = "";
    let cancelled = false;

    setViewerState("loading");

    fetchFileBlob(docRef.current)
      .then((blob) => {
        if (cancelled) return;

        objectUrl = URL.createObjectURL(blob);

        setViewerUrl(objectUrl);
        setViewerState("ready");
      })
      .catch(() => {
        if (!cancelled) setViewerState("error");
      });

    return () => {
      cancelled = true;

      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [docId, isPdf]);

  async function handleDownload() {
    if (!doc) return;

    try {
      setError("");

      await downloadDocument(doc);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to download this document."));
    }
  }

  async function handleRename(name: string) {
    if (!doc) return;

    await documentActions.rename(doc._id, name);

    setDoc({
      ...doc,
      fileName: name,
      title: name.replace(/\.[^.]+$/, ""),
    } as DocumentItem);
  }

  async function handleDelete() {
    if (!doc) return;

    setConfirmingDelete(false);

    try {
      setError("");

      await documentService.remove(doc._id);

      router.push(DOCUMENTS_ROUTE);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete this document."));
    }
  }

  const name = doc ? fullName(doc) : "Document";
  const text = doc ? textOf(doc) : "";

  return (
    <AppShell title="Documents" subtitle={doc ? name : "Document details"}>
      <div className="space-y-5">
        {/* Breadcrumb + menu */}

        <div className="flex items-center justify-between gap-4">
          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center gap-2 text-[16px]"
          >
            <button
              type="button"
              onClick={() => router.push(DOCUMENTS_ROUTE)}
              className="shrink-0 text-slate-500 transition hover:text-slate-900"
            >
              Documents
            </button>

            <ChevronRight size={15} className="shrink-0 text-slate-400" />

            <span className="truncate font-medium text-slate-900">{name}</span>
          </nav>

          {doc && (
            <Menu
              trigger={(toggle) => (
                <button
                  type="button"
                  aria-label="Document options"
                  onClick={toggle}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-800 transition hover:bg-blue-900/10"
                >
                  <MoreVertical size={18} />
                </button>
              )}
            >
              {(close) => (
                <>
                  <MenuItem
                    onClick={() => {
                      close();
                      setRenaming(true);
                    }}
                  >
                    <Pencil size={15} aria-hidden="true" />
                    Rename
                  </MenuItem>

                  <MenuItem
                    onClick={() => {
                      close();
                      void handleDownload();
                    }}
                  >
                    <Download size={15} aria-hidden="true" />
                    Download
                  </MenuItem>

                  <MenuItem
                    danger
                    onClick={() => {
                      close();
                      setConfirmingDelete(true);
                    }}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    Delete
                  </MenuItem>
                </>
              )}
            </Menu>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {loading ? (
          <p className="py-8 text-sm text-slate-500">Loading document...</p>
        ) : notFound || !doc ? (
          <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center">
            <FileText
              size={35}
              className="mx-auto text-slate-300"
              aria-hidden="true"
            />

            <h2 className="mt-4 font-semibold text-slate-900">
              Document not found
            </h2>

            <button
              type="button"
              onClick={() => router.push(DOCUMENTS_ROUTE)}
              className="mt-4 h-10 rounded-xl bg-blue-900 px-5 text-[14px] font-semibold text-white transition hover:bg-blue-800"
            >
              Back to documents
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 pb-6 lg:grid-cols-2">
            {/* File panel */}

            <section
              aria-label="File"
              className="flex h-[calc(100vh-230px)] min-h-[440px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <FileText size={17} className="shrink-0 text-slate-500" />

                  <h2 className="truncate text-[15px] text-slate-900">
                    {name}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => void handleDownload()}
                  aria-label="Download"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-700 transition hover:bg-blue-900/10"
                >
                  <Download size={17} />
                </button>
              </header>

              <div className="min-h-0 flex-1 p-3">
                {isPdf ? (
                  viewerState === "ready" ? (
                    <iframe
                      title={name}
                      src={`${viewerUrl}#toolbar=0&navpanes=0`}
                      className="h-full w-full rounded-xl bg-slate-900"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-xl bg-slate-900 px-6 text-center text-[14px] text-slate-300">
                      {viewerState === "error"
                        ? "We couldn't load the preview. You can still download the file."
                        : "Loading preview..."}
                    </div>
                  )
                ) : uploadedFile ? (
                  <div className="flex h-full flex-col items-center justify-center rounded-xl bg-slate-50 px-6 text-center">
                    <FileText size={32} className="text-slate-300" />

                    <p className="mt-3 text-[14px] text-slate-500">
                      A preview isn&apos;t available for this file type.
                    </p>

                    <button
                      type="button"
                      onClick={() => void handleDownload()}
                      className="mt-4 h-10 rounded-xl bg-blue-900 px-5 text-[14px] font-semibold text-white transition hover:bg-blue-800"
                    >
                      Download file
                    </button>
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto rounded-xl bg-slate-50 p-5">
                    {text ? (
                      <Paragraphs text={text} />
                    ) : (
                      <p className="text-[14px] text-slate-500">
                        This document has no content.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* What the AI reads */}

            <section
              aria-label="What the AI reads"
              className="flex h-[calc(100vh-230px)] min-h-[440px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <header className="border-b border-slate-200 px-5 py-4">
                <h2 className="flex items-center gap-2 text-[17px] font-semibold text-slate-900">
                  <Sparkles size={17} className="text-slate-500" />
                  What the AI reads during your calls
                </h2>

                <p className="mt-1 text-[14px] text-slate-500">
                  Read from your file. Read-only here.
                </p>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {text ? (
                  <Paragraphs text={text} />
                ) : extracting ? (
                  <p className="text-[14px] text-slate-500">
                    Reading your file...
                  </p>
                ) : (
                  <p className="text-[14px] text-slate-500">
                    {extractFailed
                      ? "We couldn't read any text from this file."
                      : "No text has been read from this document yet."}
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {renaming && doc && (
        <RenameDialog
          name={name}
          onClose={() => setRenaming(false)}
          onSave={handleRename}
        />
      )}

      {confirmingDelete && doc && (
        <DeleteDialog
          name={name}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => void handleDelete()}
        />
      )}
    </AppShell>
  );
}