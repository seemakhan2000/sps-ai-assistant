"use client";

import { useEffect, useState } from "react";
import SessionDetailsModal, { type SessionNotes } from "./SessionDetailsModal";
import { notesService } from "../utils/notes.service";

function str(item: unknown, key: string): string {
  const v = (item as Record<string, unknown> | null)?.[key];
  return v === undefined || v === null ? "" : String(v);
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function formatDuration(startIso: string, endIso: string) {
  const a = new Date(startIso).getTime();
  const b = new Date(endIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return "";
  const total = Math.round((b - a) / 1000);
  const m = Math.floor(total / 60);
  return m > 0 ? `${m} min ${total % 60} sec` : `${total} sec`;
}

export default function SessionDetailsLoader({
  session,
  onClose,
}: {
  session: unknown;
  onClose: () => void;
}) {
  const id = str(session, "id") || str(session, "_id");

  const [notes, setNotes] = useState<SessionNotes | undefined>();
  const [transcript, setTranscript] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [n, t] = await Promise.allSettled([
        notesService.get(id),
        notesService.transcript(id),
      ]);
      if (cancelled) return;

      if (n.status === "fulfilled") setNotes(n.value.notes ?? undefined);
      if (t.status === "fulfilled") setTranscript(t.value.lines ?? []);
      setLoading(false);
    }

    if (id) void load();
    else setLoading(false);

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function generate() {
    setNotesLoading(true);
    setNotesError("");
    try {
      const res = await notesService.generate(id, transcript);
      setNotes(res.notes ?? undefined);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      setNotesError(
        /503|UNAVAILABLE|high demand|busy/i.test(raw)
          ? "The AI service is busy right now. Please click Retry in a moment."
          : raw && !raw.trim().startsWith("{")
          ? raw
          : "Could not generate notes. Please try again."
      );
    } finally {
      setNotesLoading(false);
    }
  }

  async function clearNotes() {
    await notesService.remove(id).catch(() => {});
    setNotes(undefined);
  }

  const started = str(session, "startedAt") || str(session, "createdAt");
  const ended = str(session, "endedAt");
  const duration = started && ended ? formatDuration(started, ended) : "";

  const details = [
    { label: "Type", value: cap(str(session, "mode")) || "Call" },
    started && !Number.isNaN(new Date(started).getTime())
      ? { label: "Date", value: new Date(started).toLocaleString() }
      : null,
    duration ? { label: "Duration", value: duration } : null,
    str(session, "language")
      ? { label: "Language", value: str(session, "language") }
      : null,
    str(session, "model")
      ? { label: "AI model", value: str(session, "model") }
      : null,
    str(session, "answerFormat")
      ? {
          label: "Answer format",
          value: str(session, "answerFormat").replace(/_/g, " "),
        }
      : null,
    { label: "Transcript lines", value: String(transcript.length) },
    {
      label: "Transcript saving",
      value: (session as Record<string, unknown> | null)?.saveTranscript
        ? "On"
        : "Off",
    },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <SessionDetailsModal
      sessionId={id}
      company={str(session, "company")}
      role={str(session, "role")}
      notes={notes}
      notesLoading={loading || notesLoading}
      notesError={notesError}
      transcript={transcript}
      details={details}
      onClearNotes={clearNotes}
      onRetryNotes={generate}
      onClose={onClose}
    />
  );
}