
const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "/api").replace(/\/$/, "");

type AskPayload = {
  question: string;
  transcript: string;
  language: string;
  image?: string;
};

type ApiError = {
  message?: string;
};

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.headers ?? {}),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      (data as ApiError).message || `Request failed (${response.status}).`
    );
  }

  return data as T;
}

export type SavedTranscriptLine = {
  _id: string;
  text: string;
  createdAt?: string;
};

export type SavedAnswer = {
  _id: string;
  question: string;
  answer: string;
  source?: string;
  createdAt?: string;
};

export const answerService = {
  ask(sessionId: string, payload: AskPayload) {
    return request<{
      success: boolean;
      id: string;
      answer: string;
    }>(`/sessions/${sessionId}/answers`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  list(sessionId: string) {
    return request<{
      success: boolean;
      answers: SavedAnswer[];
    }>(`/sessions/${sessionId}/answers`);
  },

  saveTranscript(sessionId: string, lines: string[]) {
    return request<{
      success: boolean;
      saved: number;
    }>(`/sessions/${sessionId}/transcript`, {
      method: "POST",
      body: JSON.stringify({ lines }),
    });
  },
};
