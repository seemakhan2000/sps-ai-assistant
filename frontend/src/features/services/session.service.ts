import { apiFetch } from "../lib/api";
import type { Session } from "../types/index";

export interface CreateSessionData {
  mode: "interview" | "regular" | "mock";
  role?: string;
  company?: string;
  resumeDocumentId?: string | null;
  documentIds: string[];
  instructions: string;
  language: string;
  model: string;
  answerFormat:
    | "bullet_points"
    | "script_bullets"
    | "full_script";
  saveTranscript: boolean;
}

interface SessionResponse {
  success: boolean;
  message?: string;
  data: { session: Session };
}

interface DeleteSessionResponse {
  success: boolean;
  message: string;
}

export const sessionService = {
  list() {
    return apiFetch<{
      success: boolean;
      data: {
        sessions: Session[];
        total: number;
      };
    }>("/sessions");
  },

  create(data: CreateSessionData) {
    return apiFetch<SessionResponse>("/sessions", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  get(id: string) {
    return apiFetch<SessionResponse>(`/sessions/${id}`);
  },

  update(id: string, data: Partial<CreateSessionData>) {
    return apiFetch<SessionResponse>(`/sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  start(id: string) {
    return apiFetch<SessionResponse>(`/sessions/${id}/start`, {
      method: "POST"
    });
  },

  end(id: string) {
    return apiFetch<SessionResponse>(`/sessions/${id}/end`, {
      method: "POST"
    });
  },

  delete(id: string) {
    return apiFetch<DeleteSessionResponse>(`/sessions/${id}`, {
      method: "DELETE"
    });
  }
};