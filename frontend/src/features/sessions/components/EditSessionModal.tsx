"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

import type { DocumentItem } from "@/src/features/documents/utils/types";
import { documentService } from "@/src/features/services/document.service";

import { useSessionFormOptions } from "../hooks/useSessionFormOptions";
import type { CreateSessionPayload, SessionFormValues } from "../types";
import { getDefaultSessionValues } from "../utils/defaults";
import { sessionActions } from "../utils/session.actions";

import SessionForm from "./SessionForm";

const STEPS = [
  { id: 1, label: "Details" },
  { id: 2, label: "Preferences" },
];

function toPayload(values: SessionFormValues): CreateSessionPayload {
  const isRoleBased = values.mode === "interview" || values.mode === "mock";

  return {
    mode: values.mode,
    role: isRoleBased ? values.role.trim() : "",
    company: isRoleBased ? values.company.trim() : "",
    jobDescription: isRoleBased ? (values.jobDescription ?? "").trim() : "",
    resumeDocumentId:
      isRoleBased && values.resumeDocumentId
        ? values.resumeDocumentId
        : undefined,
    documentIds: values.documentIds ?? [],
    instructions: (values.instructions ?? "").trim(),
    language: values.language,
    model: values.model,
    answerFormat: values.answerFormat,
    saveTranscript: values.saveTranscript,
  };
}

function idOf(value: unknown): string {
  if (typeof value === "string") return value;

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const id = record._id ?? record.id;

    return typeof id === "string" ? id : "";
  }

  return "";
}

type Props = {
  session: unknown;
  onClose: () => void;
  onSaved: (id: string, patch: Record<string, unknown>) => void;
};

export default function EditSessionModal({
  session,
  onClose,
  onSaved,
}: Props) {
  const { documents, resumes, models, loading, error, addResume } =
    useSessionFormOptions();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const record = (session ?? {}) as Record<string, unknown>;
  const sessionId = idOf(record);

  const initialValues = useMemo(() => {
    const defaults = getDefaultSessionValues(models);
    const text = (key: string, fallback = "") =>
      typeof record[key] === "string" ? (record[key] as string) : fallback;

    const docs = record.documentIds ?? record.documents;

    return {
      ...defaults,
      mode: text("mode", defaults.mode),
      role: text("role"),
      company: text("company"),
      jobDescription: text("jobDescription"),
      instructions: text("instructions"),
      language: text("language", defaults.language),
      model: text("model", defaults.model),
      answerFormat: text("answerFormat", defaults.answerFormat),
      saveTranscript: Boolean(record.saveTranscript),
      resumeDocumentId: idOf(
        record.resumeDocumentId ?? record.resumeDocument ?? record.resume
      ),
      documentIds: Array.isArray(docs)
        ? docs.map(idOf).filter(Boolean)
        : [],
    } as SessionFormValues;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models]);

  async function handleSubmit(values: SessionFormValues) {
    try {
      setSubmitError("");
      setSubmitting(true);

      const payload = toPayload(values);

      await sessionActions.update(sessionId, payload);

      onSaved(sessionId, payload as unknown as Record<string, unknown>);
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Unable to save the session. Please try again."
      );
      setSubmitting(false);
    }
  }

  async function handleUploadResume(file: File): Promise<DocumentItem> {
    const result = await documentService.upload(file, "resume");
    const uploadedResume = result.data.document;

    addResume(uploadedResume);

    return uploadedResume;
  }

  function close() {
    if (!submitting) onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#101828]/30 p-2 backdrop-blur-[2px] sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-session-title"
        className="relative flex h-[min(760px,94vh)] w-full max-w-[940px] overflow-hidden rounded-[20px] border border-[#E7E8EC] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
      >
        <aside className="hidden w-[260px] shrink-0 flex-col border-r border-[#ECEDF0] bg-[#FCFCFD] px-6 pb-6 pt-8 sm:flex">
          <h1
            id="edit-session-title"
            className="text-[22px] font-semibold leading-8 text-[#0F1B3D]"
          >
            Edit session
          </h1>

          <p className="mt-1.5 text-[14px] leading-[22px] text-[#8A8F9C]">
            Update the details for this session.
          </p>

          <ol className="mt-7">
            {STEPS.map((item, index) => {
              const isDone = item.id < step;
              const isActive = item.id === step;

              return (
                <li key={item.id}>
                  <div className="flex items-center gap-3">
                    <div
                      aria-current={isActive ? "step" : undefined}
                      className={
                        isActive
                          ? "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#16A34A] text-[13px] font-medium text-white"
                          : "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-[#C9CED6] bg-white text-[13px] text-[#6B7280]"
                      }
                    >
                      {item.id}
                    </div>

                    <span
                      className={
                        isActive
                          ? "text-[14px] font-medium text-[#0F1B3D]"
                          : "text-[14px] text-[#8A8F9C]"
                      }
                    >
                      {item.label}
                    </span>
                  </div>

                  {index < STEPS.length - 1 && (
                    <div
                      className={`my-1 ml-[12px] h-7 w-px ${
                        isDone ? "bg-[#16A34A]" : "bg-[#E1E4E8]"
                      }`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col bg-white">
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            aria-label="Close edit session"
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-[#0F1B3D] transition hover:bg-[#F1F4FB] disabled:opacity-50"
          >
            <X size={18} strokeWidth={1.8} />
          </button>

          <div className="flex min-h-0 flex-1 flex-col px-6 pb-6 pt-8 sm:px-8">
            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700"
              >
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex min-h-64 flex-1 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#E5E7EB] border-t-[#0F2557]" />
              </div>
            ) : (
              <div className="min-h-0 flex-1">
                <SessionForm
                  initialValues={initialValues}
                  documents={documents}
                  resumes={resumes}
                  models={models}
                  submitting={submitting}
                  submitError={submitError}
                  submitLabel="Save changes"
                  step={step}
                  onStepChange={setStep}
                  onSubmit={handleSubmit}
                  onCancel={close}
                  onUploadResume={handleUploadResume}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}