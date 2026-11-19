"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Bot,
  Briefcase,
  Check,
  ChevronDown,
  Languages,
  MessageSquareText,
  MessagesSquare,
  PhoneCall,
  Plus,
  ScanText,
  Settings,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";

import type { DocumentItem } from "@/src/features/documents/utils/types";
import type { SessionFormValues } from "../types";

/* -------------------------------------------------
   Types
------------------------------------------------- */

type Mode = SessionFormValues["mode"];

type ImportedJob = {
  company?: string;
  jobDescription?: string;
};

type Props = {
  initialValues: SessionFormValues;
  documents: DocumentItem[];
  resumes: DocumentItem[];
  models: readonly unknown[];
  submitting: boolean;
  submitError: string;
  submitLabel: string;
  step: number;
  onStepChange: (step: number) => void;
  onModeChange?: (mode: Mode) => void;
  onSubmit: (values: SessionFormValues) => void | Promise<void>;
  onCancel: () => void;
  onUploadResume: (file: File) => Promise<DocumentItem>;
  onImportJobLink?: (url: string) => Promise<ImportedJob>;
};

/* -------------------------------------------------
   Helpers
------------------------------------------------- */

function pick(item: unknown, keys: string[]): string {
  if (typeof item === "string") return item;

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

const docId = (document: unknown) => pick(document, ["id", "_id"]);

const docName = (document: unknown) =>
  pick(document, [
    "name",
    "title",
    "fileName",
    "filename",
    "originalName",
  ]) || "Untitled document";

const modelId = (model: unknown) =>
  pick(model, [
    "id",
    "_id",
    "value",
    "modelId",
    "model",
    "slug",
    "name",
  ]);

const modelLabel = (model: unknown) =>
  pick(model, [
    "label",
    "displayName",
    "name",
    "model",
    "id",
    "value",
  ]) || "AI Model";

const MODES = [
  { value: "interview", label: "Interview", icon: Briefcase },
  { value: "regular", label: "Regular", icon: PhoneCall },
  { value: "mock", label: "Mock", icon: Bot },
] as const;

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ar", label: "Arabic" },
  { value: "ur", label: "Urdu" },
];

const ANSWER_FORMATS = [
  { value: "bullet_points", label: "Bullet points" },
  { value: "script_bullets", label: "Script bullets" },
  { value: "full_script", label: "Full script" },
] as const;

/* -------------------------------------------------
   Shared styles
------------------------------------------------- */

const labelCls = "mb-2.5 block text-[15px] font-medium text-[#111111]";

const fieldCls =
  "w-full rounded-[10px] border border-[#E3E5E9] bg-white px-4 text-[15px] text-[#111111] placeholder:text-[#9AA0AB] transition focus:border-[#111111]/40 focus:outline-none focus:ring-2 focus:ring-[#111111]/10 disabled:cursor-not-allowed";

const selectCls =
  "h-12 w-full appearance-none rounded-[10px] border border-[#E3E5E9] bg-white pl-4 pr-10 text-[14px] text-[#111111] transition focus:border-[#111111]/40 focus:outline-none focus:ring-2 focus:ring-[#111111]/10 disabled:cursor-not-allowed disabled:text-[#8A8F9C]";

const pillSelectCls =
  "h-10 w-full appearance-none rounded-[10px] border border-[#E3E5E9] bg-white pl-3.5 pr-9 text-[14px] text-[#111111] transition focus:outline-none focus:ring-2 focus:ring-[#111111]/10 disabled:cursor-not-allowed disabled:text-[#8A8F9C]";

/* -------------------------------------------------
   Select wrapper
------------------------------------------------- */

function SelectBox({
  value,
  onChange,
  disabled,
  children,
  className = selectCls,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={className}
      >
        {children}
      </select>

      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
      />
    </div>
  );
}

/* -------------------------------------------------
   Preferences UI helpers
------------------------------------------------- */

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-[13px] text-[#6B7280]">{children}</p>;
}

function PrefRow({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="shrink-0 text-[#6B7280]">{icon}</span>

        <div className="min-w-0">
          <p className="text-[15px] font-medium leading-5 text-[#111111]">
            {title}
          </p>
          <p className="text-[14px] leading-5 text-[#8A8F9C]">{subtitle}</p>
        </div>
      </div>

      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[22px] w-8 rounded-full transition-colors ${
        checked ? "bg-[#172554]" : "bg-[#E5E7EB]"
      }`}
    >
      <span
        className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all ${
          checked ? "left-[13px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

/* -------------------------------------------------
   Documents multi-select
------------------------------------------------- */

function DocumentsSelect({
  documents,
  selected,
  onChange,
}: {
  documents: DocumentItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const availableDocuments = documents.filter((document) =>
    Boolean(docId(document))
  );

  const isEmpty = availableDocuments.length === 0;

  const buttonText = isEmpty
    ? "No documents found"
    : selected.length === 0
      ? "Select documents"
      : `${selected.length} selected`;

  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((item) => item !== id)
        : [...selected, id]
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={isEmpty}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-12 w-full items-center justify-between rounded-[10px] border border-[#E3E5E9] bg-white px-4 text-left text-[14px] text-[#111111] transition focus:outline-none focus:ring-2 focus:ring-[#111111]/10 disabled:cursor-not-allowed disabled:text-[#8A8F9C]"
      >
        <span className="truncate">{buttonText}</span>
        <ChevronDown size={14} className="shrink-0 text-[#6B7280]" />
      </button>

      {open && !isEmpty && (
        <ul
          role="listbox"
          aria-multiselectable="true"
          className="absolute bottom-full z-20 mb-1.5 max-h-52 w-full overflow-y-auto rounded-xl border border-[#E3E5E9] bg-white p-1 shadow-[0_8px_30px_rgba(15,23,42,0.12)]"
        >
          {availableDocuments.map((document) => {
            const id = docId(document);
            const checked = selected.includes(id);

            return (
              <li key={id} role="option" aria-selected={checked}>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14px] text-[#111111] hover:bg-[#F6F7F9]"
                >
                  <span
                    className={
                      checked
                        ? "flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[#111111] text-white"
                        : "h-4 w-4 shrink-0 rounded border border-[#CBD0D8]"
                    }
                  >
                    {checked && <Check size={11} strokeWidth={3} />}
                  </span>

                  <span className="truncate">{docName(document)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------
   Session Form
------------------------------------------------- */

export default function SessionForm({
  initialValues,
  documents,
  resumes,
  models,
  submitting,
  submitError,
  submitLabel,
  step,
  onStepChange,
  onModeChange,
  onSubmit,
  onCancel,
  onUploadResume,
  onImportJobLink,
}: Props) {
  const [values, setValues] = useState<SessionFormValues>(initialValues);

  const [fieldError, setFieldError] = useState("");

  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [linkError, setLinkError] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Preferences UI state
  const [showFormat, setShowFormat] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  // Design only: not part of the payload yet
  const [autoAnswer, setAutoAnswer] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const mode = values.mode;
  const isRoleBased = mode === "interview" || mode === "mock";

  const availableModels = models.filter((model) => Boolean(modelId(model)));

  const availableResumes = resumes.filter((resume) =>
    Boolean(docId(resume))
  );

  /* ---------------- Update field ---------------- */

  function set<K extends keyof SessionFormValues>(
    key: K,
    value: SessionFormValues[K]
  ) {
    setValues((previous) => ({
      ...previous,
      [key]: value,
    }));

    setFieldError("");
  }

  /* ---------------- Mode ---------------- */

  function changeMode(nextMode: Mode) {
    setValues((previous) => ({
      ...previous,
      mode: nextMode,
    }));

    setFieldError("");
    onModeChange?.(nextMode);
  }

  /* ---------------- Job link import ---------------- */

  async function handleImport() {
    if (!onImportJobLink || !linkUrl.trim()) {
      setLinkError("Please enter a job posting URL.");
      return;
    }

    try {
      setLinkError("");
      setImporting(true);

      const job = await onImportJobLink(linkUrl.trim());

      setValues((previous) => ({
        ...previous,
        company: job.company ?? previous.company,
        jobDescription: job.jobDescription ?? previous.jobDescription,
      }));

      setShowLink(false);
      setLinkUrl("");
    } catch (error) {
      setLinkError(
        error instanceof Error
          ? error.message
          : "Unable to import this job post."
      );
    } finally {
      setImporting(false);
    }
  }

  /* ---------------- Resume upload ---------------- */

  async function handleFile(file?: File) {
    if (!file) return;

    const validType =
      file.type === "application/pdf" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.toLowerCase().endsWith(".pdf") ||
      file.name.toLowerCase().endsWith(".docx");

    if (!validType) {
      setUploadError("Please upload a PDF or DOCX resume.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Resume size must not exceed 10 MB.");
      return;
    }

    try {
      setUploadError("");
      setUploading(true);

      const uploaded = await onUploadResume(file);
      const uploadedId = docId(uploaded);

      if (!uploadedId) {
        throw new Error(
          "Upload completed, but the returned document ID is missing."
        );
      }

      set("resumeDocumentId", uploadedId);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Unable to upload resume."
      );
    } finally {
      setUploading(false);

      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  }

  /* ---------------- Submit / Next ---------------- */

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting || uploading || importing) return;

    setFieldError("");

    if (step === 1) {
      if (isRoleBased && !values.role.trim()) {
        setFieldError("Please enter the job role.");
        return;
      }

      if (isRoleBased && !values.company.trim()) {
        setFieldError("Please enter the company name.");
        return;
      }

      onStepChange(2);
      return;
    }

    if (isRoleBased && !values.role.trim()) {
      setFieldError("Please enter the job role.");
      onStepChange(1);
      return;
    }

    if (isRoleBased && !values.company.trim()) {
      setFieldError("Please enter the company name.");
      onStepChange(1);
      return;
    }

    if (!values.model) {
      setFieldError("Please select an AI model.");
      return;
    }

    await onSubmit(values);
  }

  /* ---------------- Render ---------------- */

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex h-full min-h-0 flex-col"
    >
      {/* Scrollable content */}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {step === 1 ? (
          <div className="space-y-6">
            {/* Session type */}

            <div>
              <span
                id="session-type-label"
                className="mb-2.5 block text-[15px] font-medium text-[#111111]"
              >
                Session Type
              </span>

              <div
                role="radiogroup"
                aria-labelledby="session-type-label"
                className="grid grid-cols-3 gap-1 rounded-xl bg-[#F3F4F6] p-1"
              >
                {MODES.map(({ value, label, icon: Icon }) => {
                  const active = mode === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => changeMode(value)}
                      className={
                        active
                          ? "flex h-[42px] items-center justify-center gap-2 rounded-[9px] bg-white text-[15px] font-medium text-[#111111] shadow-[0_1px_3px_rgba(15,23,42,0.12)]"
                          : "flex h-[42px] items-center justify-center gap-2 rounded-[9px] text-[15px] font-medium text-[#2B303B] transition hover:bg-white/60"
                      }
                    >
                      <Icon size={18} strokeWidth={1.8} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Job role and company */}

            {isRoleBased && (
              <>
                <div>
                  <label htmlFor="role" className={labelCls}>
                    Job Role <span className="text-red-500">*</span>
                  </label>

                  <input
                    id="role"
                    type="text"
                    value={values.role ?? ""}
                    onChange={(event) => set("role", event.target.value)}
                    placeholder="e.g. Full Stack Developer"
                    maxLength={150}
                    required
                    className={`${fieldCls} h-12`}
                  />
                </div>

                <div>
                  <label htmlFor="company" className={labelCls}>
                    Company <span className="text-red-500">*</span>
                  </label>

                  <input
                    id="company"
                    type="text"
                    value={values.company ?? ""}
                    onChange={(event) => set("company", event.target.value)}
                    placeholder="Enter company name"
                    maxLength={150}
                    required
                    className={`${fieldCls} h-12`}
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="job-description"
                      className={labelCls.replace("mb-2.5", "mb-0")}
                    >
                      Job Description
                    </label>

                    {onImportJobLink && (
                      <button
                        type="button"
                        onClick={() => setShowLink((current) => !current)}
                        className="text-[13px] font-medium text-[#555D6B] hover:text-black"
                      >
                        {showLink ? "Close import" : "Import from link"}
                      </button>
                    )}
                  </div>

                  {showLink && onImportJobLink && (
                    <div className="mb-3 space-y-2 rounded-xl border border-[#E3E5E9] p-3">
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={(event) => setLinkUrl(event.target.value)}
                        placeholder="Paste job posting URL"
                        className={`${fieldCls} h-11`}
                      />

                      <button
                        type="button"
                        onClick={handleImport}
                        disabled={importing || !linkUrl.trim()}
                        className="rounded-lg bg-[#111111] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {importing ? "Importing..." : "Import job"}
                      </button>

                      {linkError && (
                        <p className="text-xs text-red-600">{linkError}</p>
                      )}
                    </div>
                  )}

                  <textarea
                    id="job-description"
                    value={values.jobDescription ?? ""}
                    onChange={(event) =>
                      set("jobDescription", event.target.value)
                    }
                    placeholder="Enter job description"
                    maxLength={20000}
                    className={`${fieldCls} h-[160px] resize-none py-3 leading-5`}
                  />

                  <p className="mt-1 text-right text-xs text-[#9AA0AB]">
                    {(values.jobDescription ?? "").length}/20,000
                  </p>
                </div>
              </>
            )}

            {/* Regular call description */}

            {!isRoleBased && (
              <div>
                <label htmlFor="call-instructions" className={labelCls}>
                  Call Description
                </label>

                <textarea
                  id="call-instructions"
                  value={values.instructions}
                  onChange={(event) =>
                    set("instructions", event.target.value)
                  }
                  placeholder="Describe the call and what you need help with"
                  className={`${fieldCls} h-[220px] resize-none py-3 leading-5`}
                />
              </div>
            )}

            {/* Context */}

            <div>
              <p className="mb-2 text-[13px] text-[#6B7280]">Context</p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Resume */}

                <div>
                  <div className="mb-2.5 flex h-6 items-center justify-between">
                    <label
                      htmlFor="resume"
                      className="text-[15px] font-medium text-[#111111]"
                    >
                      CV / Resume
                    </label>

                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-1 text-[13px] font-medium text-[#6B7280] transition hover:text-[#111111] disabled:opacity-50"
                    >
                      <Upload size={12} />
                      {uploading ? "Uploading..." : "Upload"}
                    </button>

                    <input
                      ref={fileRef}
                      id="resume"
                      type="file"
                      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      disabled={uploading}
                      onChange={(event) =>
                        handleFile(event.target.files?.[0])
                      }
                    />
                  </div>

                  <SelectBox
                    value={values.resumeDocumentId ?? ""}
                    onChange={(value) => set("resumeDocumentId", value)}
                    disabled={availableResumes.length === 0}
                  >
                    {availableResumes.length === 0 ? (
                      <option value="">No resumes found</option>
                    ) : (
                      <>
                        <option value="">Select a resume</option>

                        {availableResumes.map((resume) => (
                          <option key={docId(resume)} value={docId(resume)}>
                            {docName(resume)}
                          </option>
                        ))}
                      </>
                    )}
                  </SelectBox>

                  <p className="mt-1 text-xs text-[#9AA0AB]">
                    PDF or DOCX · Maximum 10 MB
                  </p>
                </div>

                {/* Documents */}

                <div>
                  <span className="mb-2.5 flex h-6 items-center text-[15px] font-medium text-[#111111]">
                    Documents
                  </span>

                  <DocumentsSelect
                    documents={documents}
                    selected={values.documentIds ?? []}
                    onChange={(ids) => set("documentIds", ids)}
                  />
                </div>
              </div>

              {uploadError && (
                <p role="alert" className="mt-2 text-[13px] text-red-600">
                  {uploadError}
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Preferences */
          <div className="space-y-5 pt-1">
            <div>
              <SectionLabel>Session</SectionLabel>

              <PrefRow
                icon={<Languages size={18} strokeWidth={1.6} />}
                title="Select language"
                subtitle="Call language"
              >
                <div className="w-[112px]">
                  <SelectBox
                    value={values.language}
                    onChange={(value) =>
                      set("language", value as SessionFormValues["language"])
                    }
                    className={pillSelectCls}
                  >
                    {LANGUAGES.map((language) => (
                      <option key={language.value} value={language.value}>
                        {language.label}
                      </option>
                    ))}
                  </SelectBox>
                </div>
              </PrefRow>

              <PrefRow
                icon={<ScanText size={18} strokeWidth={1.6} />}
                title="Select model"
                subtitle="Speed and accuracy"
              >
                <div className="relative w-[180px]">
                  <Sparkles
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[#4285F4]"
                  />

                  <SelectBox
                    value={values.model}
                    onChange={(value) =>
                      set("model", value as SessionFormValues["model"])
                    }
                    disabled={availableModels.length === 0}
                    className={`${pillSelectCls} pl-9`}
                  >
                    {availableModels.length === 0 ? (
                      <option value="">No models available</option>
                    ) : (
                      availableModels.map((model) => (
                        <option key={modelId(model)} value={modelId(model)}>
                          {modelLabel(model)}
                        </option>
                      ))
                    )}
                  </SelectBox>
                </div>
              </PrefRow>

              <PrefRow
                icon={<MessageSquareText size={18} strokeWidth={1.6} />}
                title="Answer Preferences"
                subtitle="Answer style and format"
              >
                <button
                  type="button"
                  onClick={() => setShowFormat((current) => !current)}
                  className="flex h-10 items-center gap-2 rounded-[10px] bg-[#172554] px-4 text-[14px] font-medium text-white transition hover:bg-[#2A2A2A]"
                >
                  <Settings size={15} strokeWidth={1.8} />
                  Configure
                </button>
              </PrefRow>

              {showFormat && (
                <div className="mb-2 ml-8 rounded-xl border border-[#E3E5E9] p-3">
                  <label
                    htmlFor="answer-format"
                    className="mb-2 block text-[13px] font-medium text-[#111111]"
                  >
                    Answer Format
                  </label>

                  <SelectBox
                    value={values.answerFormat}
                    onChange={(value) =>
                      set(
                        "answerFormat",
                        value as SessionFormValues["answerFormat"]
                      )
                    }
                    className={pillSelectCls}
                  >
                    {ANSWER_FORMATS.map((format) => (
                      <option key={format.value} value={format.value}>
                        {format.label}
                      </option>
                    ))}
                  </SelectBox>
                </div>
              )}

              <PrefRow
                icon={<Sparkles size={18} strokeWidth={1.6} />}
                title="AI instructions"
                subtitle="Additional guidance"
              >
                <button
                  type="button"
                  onClick={() => setShowInstructions((current) => !current)}
                  className="flex h-10 items-center gap-2 rounded-[10px] border border-[#E3E5E9] bg-white px-4 text-[14px] font-medium text-[#111111] transition hover:bg-[#F6F7F9]"
                >
                  <Plus size={15} strokeWidth={1.8} />
                  {values.instructions?.trim() ? "Edit" : "Add"}
                </button>
              </PrefRow>

              {showInstructions && (
                <div className="mb-2 ml-8">
                  <textarea
                    id="extra-instructions"
                    value={values.instructions}
                    onChange={(event) =>
                      set("instructions", event.target.value)
                    }
                    placeholder="Anything else your assistant should keep in mind"
                    maxLength={20000}
                    className={`${fieldCls} h-[120px] resize-none py-3 leading-5`}
                  />

                  <p className="mt-1 text-right text-xs text-[#9AA0AB]">
                    {values.instructions.length}/20,000
                  </p>
                </div>
              )}
            </div>

            <div>
              <SectionLabel>Extra</SectionLabel>

              <PrefRow
                icon={<Zap size={18} strokeWidth={1.6} />}
                title="Auto Answer"
                subtitle="Answers questions automatically"
              >
                <Toggle
                  label="Auto Answer"
                  checked={autoAnswer}
                  onChange={setAutoAnswer}
                />
              </PrefRow>

              <PrefRow
                icon={<MessagesSquare size={18} strokeWidth={1.6} />}
                title="Save transcript"
                subtitle="Consent may be required"
              >
                <Toggle
                  label="Save transcript"
                  checked={values.saveTranscript}
                  onChange={(value) => set("saveTranscript", value)}
                />
              </PrefRow>
            </div>
          </div>
        )}
      </div>

      {/* Errors */}

      {(fieldError || submitError) && (
        <p role="alert" className="mt-3 text-[14px] text-red-600">
          {fieldError || submitError}
        </p>
      )}

      {/* Footer */}

      <div className="mt-4 flex shrink-0 justify-end gap-2.5">
        <button
          type="button"
          onClick={
            step === 1
              ? onCancel
              : () => {
                  setFieldError("");
                  onStepChange(1);
                }
          }
          disabled={submitting || uploading}
          className="h-12 w-[130px] rounded-xl bg-[#F3F4F6] text-[15px] font-medium text-[#111111] transition hover:bg-[#E9EBEF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {step === 1 ? "Cancel" : "Back"}
        </button>

        <button
          type="submit"
          disabled={submitting || uploading || importing}
          className="h-12 min-w-[130px] rounded-xl bg-[#172554] px-6 text-[15px] font-medium text-white transition hover:bg-[#172554] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {step === 1 ? "Next" : submitting ? "Creating..." : submitLabel}
        </button>
      </div>
    </form>
  );
}