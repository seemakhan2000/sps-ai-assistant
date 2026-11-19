// Adjust BASE and auth to match your existing services (sessionService etc).
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

type AskPayload = {
  question: string;
  transcript: string;
  language: string;
  image?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include", // or add your Authorization header here
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      (data as { message?: string }).message ?? "Request failed."
    );
  }

  return data as T;
}

export const answerService = {
  ask(sessionId: string, payload: AskPayload) {
    return request<{ id: string; answer: string }>(
      `/sessions/${sessionId}/answers`,
      { method: "POST", body: JSON.stringify(payload) }
    );
  },

  list(sessionId: string) {
    return request<{
      answers: { _id: string; question: string; answer: string }[];
    }>(`/sessions/${sessionId}/answers`);
  },

  saveTranscript(sessionId: string, lines: string[]) {
    return request<void>(`/sessions/${sessionId}/transcript`, {
      method: "POST",
      body: JSON.stringify({ lines }),
    });
  },
};