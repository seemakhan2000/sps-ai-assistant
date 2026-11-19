"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { Phone, Video } from "lucide-react";

export type ToolId = "zoom" | "teams" | "meet" | "webex" | "phone";

/* -------------------------------------------------
   Icons
------------------------------------------------- */

export function ToolIcon({ id }: { id: ToolId }) {
  switch (id) {
    case "zoom":
      return (
        <span className="rounded-md bg-[#2D8CFF] px-1.5 py-0.5 text-[10px] font-bold lowercase text-white">
          zoom
        </span>
      );
    case "teams":
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#5B5FC7] text-[13px] font-bold text-white">
          T
        </span>
      );
    case "meet":
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FFBA00] text-[#00832D]">
          <Video size={14} strokeWidth={2.4} />
        </span>
      );
    case "webex":
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#00BEF0] to-[#2D5BFF] text-[12px] font-bold text-white">
          W
        </span>
      );
    case "phone":
      return <Phone size={18} strokeWidth={1.6} className="text-white" />;
  }
}

/* -------------------------------------------------
   Tutorial content
------------------------------------------------- */

type Step = { text: string; sub?: string[]; visual?: ReactNode };

type Tutorial = {
  title: string;
  intro: string;
  steps: Step[];
};

const SHARE_STEPS: Step[] = [
  { text: 'Come back to this page and click "Connect".' },
  {
    text: 'Select the Tab where the call is taking place and select the "Also share tab audio" option.',
  },
  { text: 'Click "Share".' },
];

function MockChromeDialog() {
  return (
    <div className="rounded-xl bg-white p-4 text-[12px] text-[#202124]">
      <p className="text-[14px] font-medium">Open zoom.us?</p>
      <p className="mt-2 text-[#5F6368]">
        https://us04web.zoom.us wants to open this application.
      </p>
      <div className="mt-2 flex items-center gap-2 text-[#5F6368]">
        <span className="h-3.5 w-3.5 rounded-sm border border-[#9AA0A6]" />
        Always allow this site to open links of this type
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <span className="rounded-full border-2 border-[#EF4444] px-4 py-1.5 font-medium text-[#1A73E8]">
          Cancel
        </span>
        <span className="rounded-full border border-[#DADCE0] px-4 py-1.5 font-medium text-[#1A73E8]">
          Open zoom.us
        </span>
      </div>
    </div>
  );
}

function MockZoomLink() {
  return (
    <div className="rounded-xl bg-white px-4 py-4 text-center text-[12px] text-[#202124]">
      Having issues with the Zoom Workplace app?{" "}
      <span className="rounded-md border-2 border-[#EF4444] px-2 py-1 font-medium text-[#1A73E8]">
        Join from Your Browser
      </span>
    </div>
  );
}

export const TUTORIALS: Record<ToolId, Tutorial> = {
  zoom: {
    title: "Zoom tutorial",
    intro: "To use the assistant with Zoom, you need to open Zoom in your web browser",
    steps: [
      { text: "Click on your Zoom meeting link." },
      { text: "Don't open the Zoom app when asked.", visual: <MockChromeDialog /> },
      { text: 'Choose "Join from Your Browser".', visual: <MockZoomLink /> },
      {
        text: `If you can't see the "Join from Your Browser" option:`,
        sub: [
          'Click "Launch Meeting"',
          "Say no to opening the Zoom app",
          'Keep doing this until you see "Join from Your Browser"',
        ],
      },
      ...SHARE_STEPS,
    ],
  },
  teams: {
    title: "Microsoft Teams tutorial",
    intro: "To use the assistant with Teams, you need to open Teams in your web browser",
    steps: [
      { text: "Click on your Teams meeting link." },
      { text: `Choose "Continue on this browser" instead of opening the app.` },
      { text: "Join the meeting and check that your mic and speakers work." },
      ...SHARE_STEPS,
    ],
  },
  meet: {
    title: "Google Meet tutorial",
    intro: "To use the assistant with Google Meet, you need to open Google Meet in your web browser",
    steps: [
      { text: "Open your Google Meet in your web browser as usual." },
      ...SHARE_STEPS,
    ],
  },
  webex: {
    title: "Webex tutorial",
    intro: "To use the assistant with Webex, you need to open Webex in your web browser",
    steps: [
      { text: "Click on your Webex meeting link." },
      { text: `Choose "Join from your browser" instead of opening the app.` },
      { text: "Join the meeting and check that your mic and speakers work." },
      ...SHARE_STEPS,
    ],
  },
  phone: {
    title: "Phone tutorial",
    intro: "To use your call copilot for phone calls, try this with Google Voice",
    steps: [
      { text: "Open Google Voice in your web browser." },
      { text: "Check if your mic and speakers work okay." },
      ...SHARE_STEPS,
    ],
  },
};

/* -------------------------------------------------
   Modal
------------------------------------------------- */

export default function ToolTutorialModal({
  tool,
  onClose,
}: {
  tool: ToolId;
  onClose: () => void;
}) {
  const tutorial = TUTORIALS[tool];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#040A1C]/80 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tool-tutorial-title"
        className="flex max-h-[92vh] w-full max-w-[640px] flex-col rounded-[26px] border border-[#24366B] bg-[#0A1530] p-8 text-white shadow-[0_24px_80px_rgba(2,6,23,0.7)]"
      >
        <div className="flex items-center gap-3">
          <ToolIcon id={tool} />

          <h2
            id="tool-tutorial-title"
            className="text-[20px] font-semibold"
          >
            {tutorial.title}
          </h2>
        </div>

        <p className="mt-3 text-[15px] leading-6 text-[#9AA8CF]">
          {tutorial.intro}
        </p>

        <ol className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 text-[15px] leading-6 text-[#E4EAFB]">
          {tutorial.steps.map((step, index) => (
            <li key={step.text}>
              <p>
                {index + 1}. {step.text}
              </p>

              {step.sub && (
                <ul className="mt-2 space-y-1.5 pl-3">
                  {step.sub.map((item, subIndex) => (
                    <li key={item}>
                      {index + 1}.{subIndex + 1}. {item}
                    </li>
                  ))}
                </ul>
              )}

              {step.visual && <div className="mt-3">{step.visual}</div>}
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 h-14 w-full shrink-0 rounded-2xl bg-[#14224A] text-[16px] font-semibold text-white transition hover:bg-[#1B2D63]"
        >
          Close
        </button>
      </div>
    </div>
  );
}