"use client";

import { useEffect, useState } from "react";
import { Globe, Laptop, X } from "lucide-react";

type Props = {
  notice?: string;
  onDesktop: () => void;
  onBrowser: () => void;
  onClose: () => void;
};

export default function PlatformModal({
  notice,
  onDesktop,
  onBrowser,
  onClose,
}: Props) {
  const [showDifference, setShowDifference] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#101828]/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="platform-title"
        className="relative w-full max-w-[580px] rounded-[28px] border border-[#E7E8EC] bg-white px-10 pb-10 pt-12 shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-lg text-[#0F1B3D] transition hover:bg-[#F3F4F6]"
        >
          <X size={20} strokeWidth={1.8} />
        </button>

        <div className="text-center">
          <h2
            id="platform-title"
            className="text-[24px] font-semibold text-[#0F1B3D]"
          >
            Choose Platform
          </h2>

          <p className="mt-3 text-[17px] text-[#8A8F9C]">
            How would you like to connect to your call session?
          </p>
        </div>

        <div className="mt-9 space-y-4">
          <button
            type="button"
            onClick={onDesktop}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#0F2557] text-[17px] font-medium text-white transition hover:bg-[#17347A]"
          >
            <Laptop size={20} strokeWidth={1.8} />
            Desktop app
          </button>

          <button
            type="button"
            onClick={onBrowser}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-[#E3E5E9] bg-white text-[17px] font-medium text-[#0F1B3D] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:bg-[#F6F7F9]"
          >
            <Globe size={20} strokeWidth={1.8} />
            Open in browser
          </button>
        </div>

        {notice && (
          <p role="status" className="mt-4 text-center text-[14px] text-[#17347A]">
            {notice}
          </p>
        )}

        <div className="mt-7 text-center">
          <button
            type="button"
            onClick={() => setShowDifference((current) => !current)}
            className="text-[16px] font-medium text-[#0F1B3D] hover:underline"
          >
            What&apos;s the difference?
          </button>
        </div>

        {showDifference && (
          <div className="mt-5 space-y-2 rounded-xl bg-[#F6F7F9] p-5 text-[14px] leading-5 text-[#555D6B]">
            <p>
              <span className="font-medium text-[#0F1B3D]">Desktop app:</span>{" "}
              works alongside your meeting app and stays hidden during screen
              sharing.
            </p>

            <p>
              <span className="font-medium text-[#0F1B3D]">Browser:</span>{" "}
              nothing to install. Open the session in a new tab and start
              right away.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}