import { apiFetch } from "../../lib/api";
import type { SessionNotes } from "../components/SessionDetailsModal";

interface NotesResponse {
  success: boolean;
  message?: string;
  notes?: SessionNotes | null;
}

interface TranscriptResponse {
  success: boolean;
  lines: string[];
}

export const notesService = {
  generate: (sessionId: string, transcript: string[]) =>
    apiFetch<NotesResponse>(`/sessions/${sessionId}/ai-notes/generate`, {
      method: "POST",
      body: JSON.stringify({ transcript }),
    }),

  get: (sessionId: string) =>
    apiFetch<NotesResponse>(`/sessions/${sessionId}/ai-notes`),

  remove: (sessionId: string) =>
    apiFetch<NotesResponse>(`/sessions/${sessionId}/ai-notes`, {
      method: "DELETE",
    }),

  transcript: (sessionId: string) =>
    apiFetch<TranscriptResponse>(`/sessions/${sessionId}/transcript`),
};