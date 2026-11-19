"use client";

import { useEffect } from "react";
import { Gift, TimerReset, X } from "lucide-react";

type Props = {
  freeLeft?: number;
  onStartFree: () => void;
  onUpgrade: () => void;
  onClose: () => void;
};

export default function StartSessionModal({
  freeLeft = 10,
  onStartFree,
  onUpgrade,
  onClose,
}: Props) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#040A1C]/80 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-session-title"
        className="relative w-full max-w-[740px] overflow-hidden rounded-[26px] border border-[#24366B] bg-[#0A1530] text-white shadow-[0_24px_80px_rgba(2,6,23,0.7)]"
      >
        {/* Header */}

        <div className="relative border-b border-[#24366B] px-8 py-8 text-center">
          <h2
            id="start-session-title"
            className="text-[22px] font-semibold text-white"
          >
            Start your session
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-6 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-[#C7D2F0] transition hover:bg-white/10"
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        {/* Options */}

        <div className="grid grid-cols-1 sm:grid-cols-2">
          {/* Free */}

          <div className="relative flex flex-col items-center border-b border-[#24366B] px-8 pb-9 pt-12 text-center sm:border-b-0 sm:border-r">
            <span className="absolute right-0 top-0 rounded-bl-xl bg-[#14224A] px-4 py-2 text-[13px] font-medium text-[#DCE4FA]">
              {freeLeft} left
            </span>

            <Gift size={28} strokeWidth={1.5} className="text-[#C7D2F0]" />

            <p className="mt-4 text-[18px] font-semibold leading-7 text-white">
              Free session
            </p>

            <p className="text-[18px] font-semibold leading-7 text-white">
              10 min · Free
            </p>

            <p className="mt-3 text-[15px] leading-6 text-[#9AA8CF]">
              12-minute wait between free sessions.
            </p>

            <button
              type="button"
              onClick={onStartFree}
              className="mt-8 h-14 w-full rounded-2xl border border-[#2C4080] bg-[#111F45] text-[16px] font-medium text-white transition hover:bg-[#172A5E]"
            >
              Start free
            </button>
          </div>

          {/* Full */}

          <div className="flex flex-col items-center px-8 pb-9 pt-12 text-center">
            <TimerReset
              size={28}
              strokeWidth={1.5}
              className="text-[#C7D2F0]"
            />

            <p className="mt-4 text-[18px] font-semibold leading-7 text-white">
              Full session
            </p>

            <p className="text-[18px] font-semibold leading-7 text-white">
              Unlimited subscription
            </p>

            <p className="mt-3 text-[15px] leading-6 text-[#9AA8CF]">
              Auto-extends by 30 minutes when the timer reaches 0.
            </p>

            <button
              type="button"
              onClick={onUpgrade}
              className="mt-8 h-14 w-full rounded-2xl bg-[#E6EBFA] text-[16px] font-medium text-[#0A1530] transition hover:bg-white"
            >
              Upgrade
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}