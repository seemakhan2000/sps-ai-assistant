"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  LayoutPanelTop,
  Link2,
  Network,
  PenLine,
  VideoIcon,
} from "lucide-react";

import ToolTutorialModal, { ToolIcon } from "./ToolTutorialModal";
import type { ToolId } from "./ToolTutorialModal";

const MOCK_VIDEO_URL = "https://www.youtube.com/watch?v=d9Xhn6NcMRc";

type Props = {
  mode: string;
  role?: string;
  company?: string;
  onBack: () => void;
  onConnect: (stream: MediaStream, device: string) => void;
  onEdit?: () => void;
  onVideoTutorial?: () => void;
  onMockVideo?: () => void;
  onClose: () => void;
};

const DEVICES = ["Browser tab", "Entire screen", "Window"];

const TOOLS: { id: ToolId; label: string }[] = [
  { id: "zoom", label: "Zoom" },
  { id: "teams", label: "Microsoft Teams" },
  { id: "meet", label: "Google Meet" },
  { id: "webex", label: "Webex" },
  { id: "phone", label: "Phone" },
];

export default function ConnectSessionModal({
  mode,
  role,
  company,
  onBack,
  onConnect,
  onEdit,
  onVideoTutorial,
  onMockVideo,
  onClose,
}: Props) {
  const [device, setDevice] = useState(DEVICES[0]);
  const [tutorial, setTutorial] = useState<ToolId | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (tutorial) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, tutorial]);

  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
  const hasRole = Boolean(role?.trim()) && Boolean(company?.trim());

  /* ---------------- Mock video ---------------- */

  function handleMockVideo() {
    if (onMockVideo) {
      onMockVideo();
      return;
    }

    window.open(MOCK_VIDEO_URL, "_blank", "noopener,noreferrer");
  }

  /* ---------------- Connect (screen / tab share) ---------------- */

  async function handleConnect() {
    if (connecting) return;

    setError("");

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Your browser does not support screen sharing.");
      return;
    }

    const displaySurface =
      device === "Entire screen"
        ? "monitor"
        : device === "Window"
          ? "window"
          : "browser";

    try {
      setConnecting(true);

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface },
        audio: true,
        selfBrowserSurface: "exclude",
        surfaceSwitching: "include",
        systemAudio: "include",
      } as unknown as DisplayMediaStreamOptions);

      onConnect(stream, device);
    } catch (err) {
      const cancelled =
        err instanceof DOMException && err.name === "NotAllowedError";

      setError(
        cancelled
          ? "Sharing was cancelled. Click Connect to try again."
          : "Unable to start sharing. Please try again."
      );
    } finally {
      setConnecting(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-[#040A1C]/80 p-4 backdrop-blur-md"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="connect-session-title"
          className="relative max-h-[94vh] w-full max-w-[680px] overflow-y-auto rounded-[26px] border border-[#24366B] bg-[#0A1530] p-8 text-white shadow-[0_24px_80px_rgba(2,6,23,0.7)] sm:p-9"
        >
          {/* Header */}

          <div className="flex items-center justify-between">
            <h2
              id="connect-session-title"
              className="text-[22px] font-semibold text-white"
            >
              Connect session
            </h2>

            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit session"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#C7D2F0] transition hover:bg-white/10"
            >
              <PenLine size={18} strokeWidth={1.7} />
            </button>
          </div>

          {/* Call information */}

          <div className="mt-7">
            <div className="flex items-center gap-2.5 text-[17px] font-semibold">
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-[#C7D2F0] text-[11px] font-semibold leading-none text-[#C7D2F0]">
                i
              </span>
              Call Information
            </div>

            <p className="mt-3 text-[15px] leading-6 text-[#9AA8CF]">
              This is an{" "}
              <span className="font-semibold text-white">{modeLabel}</span>{" "}
              session
              {hasRole && (
                <>
                  {" "}
                  for a position &quot;
                  <span className="font-semibold text-white">{role}</span>
                  &quot; at &quot;
                  <span className="font-semibold text-white">{company}</span>
                  &quot;
                </>
              )}
              .
            </p>
          </div>

          {/* Call device */}

          <div className="mt-7 flex items-center justify-between gap-4">
            <div>
              <p className="text-[16px] font-semibold text-white">
                Call device
              </p>
              <p className="text-[14px] text-[#9AA8CF]">
                Where you&apos;ll take the call
              </p>
            </div>

            <div className="relative">
              <LayoutPanelTop
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#C7D2F0]"
              />

              <select
                value={device}
                onChange={(event) => setDevice(event.target.value)}
                className="h-12 w-[200px] appearance-none rounded-xl border border-[#24366B] bg-[#0E1B3F] pl-11 pr-10 text-[15px] font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#4F7BFF]/40"
              >
                {DEVICES.map((item) => (
                  <option key={item} value={item} className="text-black">
                    {item}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#9AA8CF]"
              />
            </div>
          </div>

          {/* How to connect */}

          <div className="mt-7">
            <div className="flex items-center gap-2.5 text-[17px] font-semibold">
              <Network
                size={18}
                strokeWidth={1.7}
                className="text-[#C7D2F0]"
              />
              How to Connect
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                {TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    aria-label={`${tool.label} tutorial`}
                    title={tool.label}
                    onClick={() => setTutorial(tool.id)}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#24366B] bg-[#0E1B3F] transition hover:border-[#4F7BFF] hover:bg-[#15275A]"
                  >
                    <ToolIcon id={tool.id} />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => (onVideoTutorial ? onVideoTutorial() : setTutorial("zoom"))}
                className="flex h-12 items-center gap-2.5 rounded-xl border border-[#24366B] bg-[#0E1B3F] px-5 text-[15px] font-medium text-white transition hover:bg-[#15275A]"
              >
                <VideoIcon size={16} strokeWidth={1.7} />
                Video tutorial
              </button>
            </div>
          </div>

          {/* No call to share */}

          <div className="mt-7 flex items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2.5 text-[17px] font-semibold">
                <VideoIcon
                  size={18}
                  strokeWidth={1.7}
                  className="text-[#C7D2F0]"
                />
                No Call to Share?
              </div>

              <p className="mt-2.5 max-w-[330px] text-[15px] leading-6 text-[#9AA8CF]">
                Share a mock video on YouTube instead of a call tab, and try
                out the assistant on that.
              </p>
            </div>

            <button
              type="button"
              onClick={handleMockVideo}
              className="flex h-12 shrink-0 items-center gap-2.5 rounded-xl border border-[#24366B] bg-[#0E1B3F] px-5 text-[15px] font-medium text-white transition hover:bg-[#15275A]"
            >
              <ExternalLink size={16} strokeWidth={1.7} />
              Mock video
            </button>
          </div>

          {/* Error */}

          {error && (
            <p role="alert" className="mt-5 text-[14px] text-[#FCA5A5]">
              {error}
            </p>
          )}

          {/* Footer */}

          <div className="mt-8 grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={onBack}
              disabled={connecting}
              className="h-14 rounded-2xl bg-[#14224A] text-[16px] font-semibold text-white transition hover:bg-[#1B2D63] disabled:opacity-60"
            >
              Back
            </button>

            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-[#E6EBFA] text-[16px] font-medium text-[#0A1530] transition hover:bg-white disabled:opacity-70"
            >
              <Link2 size={17} strokeWidth={1.8} />
              {connecting ? "Connecting..." : "Connect"}
            </button>
          </div>
        </div>
      </div>

      {tutorial && (
        <ToolTutorialModal
          tool={tutorial}
          onClose={() => setTutorial(null)}
        />
      )}
    </>
  );
}