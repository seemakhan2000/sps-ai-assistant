"use client";

import { useState } from "react";
import LeaveEndSessionModal from "./LeaveEndSessionModal";
import AnswerFeedbackModal, { type AnswerRating } from "./AnswerFeedbackModal";
import SessionDetailsModal, { type SessionNotes } from "./SessionDetailsModal";
import type { InterviewReview } from "./RateInterviewFlow";

type Stage = "leave" | "feedback" | "details";

interface SessionWrapUpProps {
  company: string;
  role: string;
  notes?: SessionNotes;
  transcript?: string[];
  onLeave: () => void;                         // leave, timer keeps running
  onEnd: () => void | Promise<void>;           // stop timer / end API call
  onCancel: () => void;                        // back to live session
  onFinish: () => void;                        // everything closed -> dashboard
  onAnswerFeedback?: (r: AnswerRating) => void | Promise<void>;
  onAskAI?: (q: string) => Promise<string>;
  onSubmitReview?: (r: InterviewReview) => void | Promise<void>;
}

export default function SessionWrapUp(props: SessionWrapUpProps) {
  const [stage, setStage] = useState<Stage>("leave");

  async function end() {
    await props.onEnd();
    setStage("feedback");
  }
  async function feedback(r?: AnswerRating) {
    if (r) await props.onAnswerFeedback?.(r);
    setStage("details");
  }

  if (stage === "leave")
    return <LeaveEndSessionModal onLeave={props.onLeave} onEnd={end} onClose={props.onCancel} />;

  if (stage === "feedback")
    return <AnswerFeedbackModal onSelect={feedback} onClose={() => feedback()} />;

  return (
    <SessionDetailsModal
      company={props.company}
      role={props.role}
      notes={props.notes}
      transcript={props.transcript}
      onAskAI={props.onAskAI}
      onSubmitReview={props.onSubmitReview}
      onClose={props.onFinish}
    />
  );
}