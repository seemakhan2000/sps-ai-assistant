"use client";

import { Frown, Meh, Smile, X } from "lucide-react";

export type AnswerRating = "very_helpful" | "somewhat_helpful" | "not_helpful";

interface AnswerFeedbackModalProps {
  onSelect: (rating: AnswerRating) => void;
  onClose: () => void;
}

const OPTIONS: {
  value: AnswerRating;
  label: string;
  icon: typeof Smile;
  color: string;
}[] = [
  { value: "very_helpful", label: "Very helpful", icon: Smile, color: "text-[#16A34A]" },
  { value: "somewhat_helpful", label: "Somewhat helpful", icon: Meh, color: "text-[#172554]" },
  { value: "not_helpful", label: "Not helpful", icon: Frown, color: "text-[#DC2626]" },
];

export default function AnswerFeedbackModal({
  onSelect,
  onClose,
}: AnswerFeedbackModalProps) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0B1437]/40 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="answer-feedback-title"
        className="relative w-full max-w-[520px] rounded-[20px] bg-white px-7 pb-7 pt-8 shadow-[0_24px_80px_rgba(15,23,42,0.25)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-[#172554] transition hover:bg-[#EEF2FF]"
        >
          <X size={18} />
        </button>

        <h2
          id="answer-feedback-title"
          className="text-center text-[18px] font-semibold text-[#0B1437]"
        >
          How helpful were the AI answers during this interview?
        </h2>
        <p className="mt-1 text-center text-[14px] text-[#6B7280]">
          Your feedback helps us improve future AI answers.
        </p>

        <div className="mt-6 space-y-3">
          {OPTIONS.map(({ value, label, icon: Icon, color }) => (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-[#E3E6F0] bg-white text-[15px] font-medium text-[#0B1437] transition hover:border-[#172554] hover:bg-[#F5F7FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#172554]/30"
            >
              <Icon size={16} className={color} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}