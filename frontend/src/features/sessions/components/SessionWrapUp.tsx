"use client";

import { useState } from "react";
import LeaveEndSessionModal from "./LeaveEndSessionModal";
import AnswerFeedbackModal, { type AnswerRating } from "./AnswerFeedbackModal";
import SessionDetailsModal, { type SessionNotes } from "./SessionDetailsModal";
import type { InterviewReview } from "./RateInterviewFlow";
import { notesService } from "../utils/notes.service";

type Stage = "leave" | "feedback" | "details";

interface SessionWrapUpProps {
  sessionId: string;
  company: string;
  role: string;
  notes?: SessionNotes;
  transcript?: string[];
  details?: { label: string; value: string }[]; // NEW
  onLeave: () => void;
  onEnd: () => void | Promise<void>;
  onCancel: () => void;
  onFinish: () => void;
  onAnswerFeedback?: (r: AnswerRating) => void | Promise<void>;
  onAskAI?: (q: string) => Promise<string>;
  onSubmitReview?: (r: InterviewReview) => void | Promise<void>;
}

export default function SessionWrapUp(props: SessionWrapUpProps) {
  const [stage, setStage] = useState<Stage>("leave");
  const [notes, setNotes] = useState<SessionNotes | undefined>(props.notes);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState("");

  async function loadNotes() {
    if (!props.sessionId) return;

    setNotesLoading(true);
    setNotesError("");

    try {
      const res = await notesService.generate(
        props.sessionId,
        props.transcript ?? []
      );
      setNotes(res.notes ?? undefined);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";

      const friendly = /503|UNAVAILABLE|high demand|busy/i.test(raw)
        ? "The AI service is busy right now. Please click Retry in a moment."
        : raw && !raw.trim().startsWith("{")
        ? raw
        : "Could not generate notes. Please try again.";

      setNotesError(friendly);
    } finally {
      setNotesLoading(false);
    }
  }

  async function end() {
    await props.onEnd();
    setStage("feedback");
    void loadNotes();
  }

  async function feedback(r?: AnswerRating) {
    if (r) await props.onAnswerFeedback?.(r);
    setStage("details");
  }

  async function clearNotes() {
    await notesService.remove(props.sessionId).catch(() => {});
    setNotes(undefined);
    setNotesError("");
  }

  if (stage === "leave") {
    return (
      <LeaveEndSessionModal
        onLeave={props.onLeave}
        onEnd={end}
        onClose={props.onCancel}
      />
    );
  }

  if (stage === "feedback") {
    return (
      <AnswerFeedbackModal onSelect={feedback} onClose={() => feedback()} />
    );
  }

  return (
    <SessionDetailsModal
      sessionId={props.sessionId}
      company={props.company}
      role={props.role}
      notes={notes}
      notesLoading={notesLoading}
      notesError={notesError}
      transcript={props.transcript}
      details={props.details}
      onClearNotes={clearNotes}
      onRetryNotes={loadNotes}
      onAskAI={props.onAskAI}
      onSubmitReview={props.onSubmitReview}
      onClose={props.onFinish}
    />
  );
}