import { apiFetch } from "../../lib/api";

export interface TranscribePayload {
  audio: string;
  mimeType: string;
  language: string;
}

export const transcribeService = {
  chunk: (sessionId: string, payload: TranscribePayload) =>
    apiFetch<{ success: boolean; text: string }>(
      `/sessions/${sessionId}/transcribe`,
      { method: "POST", body: JSON.stringify(payload) }
    ),
};