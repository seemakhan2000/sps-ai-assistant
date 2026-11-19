"use client";

import { LogOut, PhoneOff, X } from "lucide-react";

interface LeaveEndSessionModalProps {
  onLeave: () => void;
  onEnd: () => void;
  onClose: () => void;
  resumeMinutes?: number;
  resumeCredits?: number;
}

export default function LeaveEndSessionModal({
  onLeave,
  onEnd,
  onClose,
  resumeMinutes = 5,
  resumeCredits = 0.5,
}: LeaveEndSessionModalProps) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#050B22]/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-end-title"
        className="relative w-full max-w-[720px] overflow-hidden rounded-[20px] border border-[#1E2A5A] bg-[#0B1437] text-white shadow-[0_24px_80px_rgba(2,6,23,0.6)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-[#A9B4DA] transition hover:bg-white/10 hover:text-white"
        >
          <X size={16} />
        </button>

        <h2
          id="leave-end-title"
          className="px-6 py-6 text-center text-[17px] font-semibold"
        >
          Leave or end session?
        </h2>

        <div className="grid border-t border-[#1E2A5A] sm:grid-cols-2">
          {/* Leave */}
          <div className="flex flex-col items-center px-6 py-6 text-center sm:border-r sm:border-[#1E2A5A]">
            <LogOut size={18} className="text-[#C7D0F0]" />
            <h3 className="mt-2 text-[15px] font-semibold">Leave for now</h3>
            <p className="mt-1 min-h-[60px] text-[13.5px] leading-5 text-[#A9B4DA]">
              Return to the dashboard while your timer continues. You can
              rejoin before time runs out.
            </p>
            <button
              type="button"
              onClick={onLeave}
              className="mt-4 h-11 w-full rounded-xl bg-[#1E2B63] text-[14px] font-semibold text-white transition hover:bg-[#27387F]"
            >
              Leave for now
            </button>
          </div>

          {/* End */}
          <div className="flex flex-col items-center border-t border-[#1E2A5A] px-6 py-6 text-center sm:border-t-0">
            <PhoneOff size={18} className="text-[#C7D0F0]" />
            <h3 className="mt-2 text-[15px] font-semibold">End session</h3>
            <p className="mt-1 min-h-[60px] text-[13.5px] leading-5 text-[#A9B4DA]">
              End the session and stop the timer. You&rsquo;ll have{" "}
              {resumeMinutes} minutes to resume it for {resumeCredits} credits.
            </p>
            <button
              type="button"
              onClick={onEnd}
              className="mt-4 h-11 w-full rounded-xl bg-[#DC2626] text-[14px] font-semibold text-white transition hover:bg-[#B91C1C]"
            >
              End session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}