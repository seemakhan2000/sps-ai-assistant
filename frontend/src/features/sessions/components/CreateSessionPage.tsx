"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Video, X } from "lucide-react";

import AppShell from "@/src/components/layout/Appshell";
import type { DocumentItem } from "@/src/features/documents/utils/types";

import { documentService } from "@/src/features/services/document.service";
import { sessionService } from "@/src/features/services/session.service";
import { answerService } from "../utils/Answer.service";

import { SESSION_ROUTES } from "../constants";
import { useSessionFormOptions } from "../hooks/useSessionFormOptions";

import type {
  CreateSessionPayload,
  SessionFormValues,
} from "../types";

import { getDefaultSessionValues } from "../utils/defaults";
import SessionForm from "./SessionForm";
import PlatformModal from "./PlatformModal";
import StartSessionModal from "./StartSessionModal";
import ConnectSessionModal from "./ConnectSessionModal";
import LiveSession from "./LiveSession";
import SessionWrapUp from "./SessionWrapUp";

interface CreateSessionPageProps {
  embedded?: boolean;
  defaultMode?: SessionFormValues["mode"];
  onClose?: () => void;
}

const STEPS = [
  { id: 1, label: "Details" },
  { id: 2, label: "Preferences" },
];

function toPayload(values: SessionFormValues): CreateSessionPayload {
  const isRoleBased =
    values.mode === "interview" || values.mode === "mock";

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

function extractSessionId(result: unknown): string {
  const root = result as Record<string, any> | null;
  const candidates = [root?.data?.session, root?.session, root?.data, root];

  for (const item of candidates) {
    const id = item?._id ?? item?.id;
    if (typeof id === "string" && id) return id;
  }
  return "";
}

export default function CreateSessionPage({
  embedded = false,
  defaultMode = "interview",
  onClose,
}: CreateSessionPageProps) {
  const router = useRouter();

  const { documents, resumes, models, loading, error, addResume } =
    useSessionFormOptions();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [currentStep, setCurrentStep] = useState(1);

  const [showPlatform, setShowPlatform] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [showConnect, setShowConnect] = useState(false);

  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const [showLive, setShowLive] = useState(false);

  // exit -> leave/end -> feedback -> details -> rate (one by one)
  const [showWrapUp, setShowWrapUp] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);

  const [sessionId, setSessionId] = useState("");
  const [createdValues, setCreatedValues] =
    useState<SessionFormValues | null>(null);
  const [mode, setMode] = useState<SessionFormValues["mode"]>(defaultMode);

  async function handleSubmit(values: SessionFormValues) {
    try {
      setSubmitError("");
      setSubmitting(true);

      const created = await sessionService.create(toPayload(values));

      setSessionId(extractSessionId(created));
      setCreatedValues(values);
      setSubmitting(false);
      setShowPlatform(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Unable to create the session. Please try again."
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

  function closeModal() {
    if (submitting) return;
    if (embedded) {
      onClose?.();
      return;
    }
    router.push(SESSION_ROUTES.afterCreate);
  }

  function handleViewTutorial() {}
  function handleMockPresets() {}

  function handleDesktop() {
    router.push(SESSION_ROUTES.afterCreate);
  }
  function handleBrowser() {
    setShowPlatform(false);
    setShowStart(true);
  }
  function handleStartFree() {
    setShowStart(false);
    setShowConnect(true);
  }
  function handleConnectBack() {
    setShowConnect(false);
    setShowStart(true);
  }
  function handleConnect(stream: MediaStream, device: string) {
    void device;
    setLiveStream(stream);
    setShowConnect(false);
    setShowLive(true);
  }

  /* -----------------------------------------------
     Exit flow
  ------------------------------------------------ */

  // Exit button in LiveSession -> open the first modal
  function handleExitLive() {
    setShowWrapUp(true);
  }

  // Close everything and go to dashboard
  function finishWrapUp() {
    liveStream?.getTracks().forEach((t) => t.stop());
    setShowWrapUp(false);
    setShowLive(false);
    setLiveStream(null);
    router.push(SESSION_ROUTES.afterCreate);
  }

  async function handleEndSession() {
    // Stop the mic/screen immediately, then tell the backend.
    liveStream?.getTracks().forEach((t) => t.stop());
    try {
      // Connect your real endpoint here, e.g. sessionService.end(sessionId)
      await (sessionService as any).end?.(sessionId);
    } catch {
      /* don't block the feedback flow if this fails */
    }
  }

  function handleUpgrade() {
    router.push(SESSION_ROUTES.afterCreate);
  }
  function handleCloseStart() {
    closeModal();
  }
  function handleClosePlatform() {
    closeModal();
  }

  const pageContent = (
    <>
      {!showLive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/30 p-2 backdrop-blur-[2px] sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-session-title"
            className="relative flex h-[min(760px,94vh)] w-full max-w-[940px] overflow-hidden rounded-[20px] border border-[#E7E8EC] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
          >
            <aside className="hidden w-[260px] shrink-0 flex-col border-r border-[#ECEDF0] bg-[#FCFCFD] px-6 pb-6 pt-8 sm:flex">
              <div>
                <h1
                  id="create-session-title"
                  className="text-[22px] font-semibold leading-8 tracking-[-0.01em] text-[#0B1437]"
                >
                  Create session
                </h1>
                <p className="mt-1.5 text-[14px] leading-[22px] text-[#8A8F9C]">
                  Enter the details &amp; select what you need for this call.
                </p>
              </div>

              <ol className="mt-7">
                {STEPS.map((item, index) => {
                  const isDone = item.id < currentStep;
                  const isActive = item.id === currentStep;

                  return (
                    <li key={item.id}>
                      <div className="flex items-center gap-3">
                        <div
                          aria-current={isActive ? "step" : undefined}
                          className={
                            isActive
                              ? "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#172554] text-[13px] font-medium text-white"
                              : "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-[#172554] bg-white text-[13px] text-[#6B7280]"
                          }
                        >
                          {item.id}
                        </div>
                        <span
                          className={
                            isActive
                              ? "text-[14px] font-medium text-[#0B1437]"
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

              <div className="mt-auto space-y-2">
                <button
                  type="button"
                  onClick={handleViewTutorial}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#E3E5E9] bg-white text-[14px] font-medium text-[#1F2430] transition hover:bg-[#EEF2FF]"
                >
                  <Video size={16} strokeWidth={1.8} />
                  View tutorial
                </button>
                <button
                  type="button"
                  onClick={handleMockPresets}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#E3E5E9] bg-white text-[14px] font-medium text-[#1F2430] transition hover:bg-[#EEF2FF]"
                >
                  <Bot size={16} strokeWidth={1.8} />
                  Mock presets
                </button>
              </div>
            </aside>

            <main className="relative flex min-w-0 flex-1 flex-col bg-white">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                aria-label="Close create session"
                className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-[#0B1437] transition hover:bg-[#EEF2FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#172554]/30 disabled:cursor-not-allowed disabled:opacity-50"
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
                    <div className="text-center">
                      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-[3px] border-[#E5E7EB] border-t-[#172554]" />
                      <p className="mt-3 text-[14px] text-[#737B8C]">
                        Loading session options...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="min-h-0 flex-1">
                    <SessionForm
                      initialValues={{
                        ...getDefaultSessionValues(models),
                        mode: defaultMode,
                      }}
                      documents={documents}
                      resumes={resumes}
                      models={models}
                      submitting={submitting}
                      submitError={submitError}
                      submitLabel={`Create ${mode} session`}
                      step={currentStep}
                      onStepChange={setCurrentStep}
                      onModeChange={setMode}
                      onSubmit={handleSubmit}
                      onCancel={closeModal}
                      onUploadResume={handleUploadResume}
                    />
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      )}

      {showPlatform && (
        <PlatformModal
          onDesktop={handleDesktop}
          onBrowser={handleBrowser}
          onClose={handleClosePlatform}
        />
      )}

      {showStart && (
        <StartSessionModal
          freeLeft={10}
          onStartFree={handleStartFree}
          onUpgrade={handleUpgrade}
          onClose={handleCloseStart}
        />
      )}

      {showConnect && createdValues && (
        <ConnectSessionModal
          mode={createdValues.mode}
          role={createdValues.role}
          company={createdValues.company}
          onBack={handleConnectBack}
          onConnect={handleConnect}
          onClose={handleCloseStart}
        />
      )}

      {showLive && createdValues && (
        <LiveSession
          stream={liveStream}
          language={createdValues.language}
          durationSeconds={600}
          planLabel="Free"
          title="SPS AI Assistant"
          onRequestAnswer={async (request) => {
            if (!sessionId) throw new Error("Session ID is missing.");
            const result = await answerService.ask(sessionId, request);
            return result.answer;
          }}
          onTranscriptLine={(text) => {
            setTranscript((prev) => [...prev, text]);

            if (!sessionId || !createdValues.saveTranscript) return;
            answerService.saveTranscript(sessionId, [text]).catch(() => {});
          }}
          onExit={handleExitLive}
        />
      )}

      {/* 1) Leave/End  2) AI answers feedback  3) Notes + Rate wizard */}
      {showWrapUp && createdValues && (
        <SessionWrapUp
          company={createdValues.company}
          role={createdValues.role}
          transcript={transcript}
          onCancel={() => setShowWrapUp(false)}
          onLeave={finishWrapUp}
          onEnd={handleEndSession}
          onFinish={finishWrapUp}
          onAnswerFeedback={async (rating) => {
            // connect API: await answerService.sendFeedback(sessionId, rating)
            void rating;
          }}
          onAskAI={async (question) => {
            if (!sessionId) throw new Error("Session ID is missing.");
            const result = await answerService.ask(sessionId, {
              question,
              transcript: transcript.join("\n"),
              language: createdValues.language,
            });
            return result.answer;
          }}
          onSubmitReview={async (review) => {
            // connect API: await reviewService.create(sessionId, review)
            void review;
          }}
        />
      )}
    </>
  );

  if (embedded) return pageContent;

  return (
    <AppShell
      title="Create Session"
      subtitle="Set up an interview, mock interview or regular call"
    >
      {pageContent}
    </AppShell>
  );
}