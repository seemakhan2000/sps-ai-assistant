"use client";

import { useState } from "react";

import { answerService } from "../utils/Answer.service";

import PlatformModal from "./PlatformModal";
import StartSessionModal from "./StartSessionModal";
import ConnectSessionModal from "./ConnectSessionModal";
import LiveSession from "./LiveSession";

type Stage = "platform" | "start" | "connect" | "live";

function read(item: unknown, keys: string[]): string {
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

type Props = {
  /** A session object from your list (needs id/_id, mode, role, company, language, saveTranscript). */
  session: unknown;
  freeLeft?: number;
  /** Called when the user connects and the live screen opens. */
  onStarted?: (session: unknown) => void;
  onClose: () => void;
};

/**
 * Choose Platform -> Start your session -> Connect session -> Live screen.
 * Works for any existing session (used by the session cards).
 */
export default function SessionLauncher({
  session,
  freeLeft = 10,
  onStarted,
  onClose,
}: Props) {
  const [stage, setStage] = useState<Stage>("platform");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [notice, setNotice] = useState("");

  const sessionId = read(session, ["id", "_id"]);
  const mode = read(session, ["mode"]).toLowerCase() || "interview";
  const role = read(session, ["role"]);
  const company = read(session, ["company"]);
  const language = read(session, ["language"]) || "en";
  const saveTranscript = Boolean(
    (session as Record<string, unknown> | null)?.saveTranscript
  );

  function handleConnect(nextStream: MediaStream) {
    setStream(nextStream);
    setStage("live");
    onStarted?.(session);
  }

  function handleExit() {
    setStream(null);
    onClose();
  }

  if (stage === "platform") {
    return (
      <PlatformModal
        notice={notice}
        onDesktop={() =>
          // Connect your desktop app deep link here.
          setNotice("Desktop app is not available yet. Please use Open in browser.")
        }
        onBrowser={() => setStage("start")}
        onClose={onClose}
      />
    );
  }

  if (stage === "start") {
    return (
      <StartSessionModal
        freeLeft={freeLeft}
        onStartFree={() => setStage("connect")}
        onUpgrade={() => {
          // Connect your pricing / upgrade route here.
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  if (stage === "connect") {
    return (
      <ConnectSessionModal
        mode={mode}
        role={role}
        company={company}
        onBack={() => setStage("start")}
        onConnect={handleConnect}
        onClose={onClose}
      />
    );
  }

  return (
    <LiveSession
      stream={stream}
      language={language}
      durationSeconds={600}
      planLabel="Free"
      title="SPS AI Assistant"
      onRequestAnswer={async (request) => {
        if (!sessionId) throw new Error("Session ID is missing.");

        const result = await answerService.ask(sessionId, request);

        return result.answer;
      }}
      onTranscriptLine={(text) => {
        if (!sessionId || !saveTranscript) return;

        answerService.saveTranscript(sessionId, [text]).catch(() => {});
      }}
      onExit={handleExit}
    />
  );
}