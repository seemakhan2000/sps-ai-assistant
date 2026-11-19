import { sessionService } from "@/src/features/services/session.service";

// Edit / delete a session.
// If your sessionService already has update/delete methods they are used.
// Otherwise it falls back to PATCH/DELETE /sessions/:id (see backend/session.manage.js).

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

type AnyFn = (...args: unknown[]) => Promise<unknown>;

function findMethod(names: string[]): AnyFn | null {
  const service = sessionService as unknown as Record<string, unknown>;

  for (const name of names) {
    if (typeof service[name] === "function") {
      return (service[name] as AnyFn).bind(sessionService);
    }
  }

  return null;
}

async function request(path: string, init: RequestInit): Promise<void> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include", // or add your Authorization header here
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });

  if (response.ok) return;

  const data = await response.json().catch(() => ({}));

  throw new Error(
    (data as { message?: string }).message ?? "Request failed."
  );
}

export const sessionActions = {
  async update(id: string, payload: unknown): Promise<void> {
    const method = findMethod(["update", "updateSession", "edit"]);

    if (method) {
      await method(id, payload);
      return;
    }

    await request(`/sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async remove(id: string): Promise<void> {
    const method = findMethod(["delete", "remove", "deleteSession", "destroy"]);

    if (method) {
      await method(id);
      return;
    }

    await request(`/sessions/${id}`, { method: "DELETE" });
  },
};