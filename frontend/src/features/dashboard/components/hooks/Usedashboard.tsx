"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/src/features/services/auth.service";
import { sessionService } from "@/src/features/services/session.service";
import type { User, Session } from "@/src/features/types/index";

import { DASHBOARD_ROUTES } from "../../utils/Constants";

function toMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export function useDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [userResult, sessionResult] = await Promise.allSettled([
      authService.getMe(),
      sessionService.list()
    ]);

    // No valid user means the login has expired.
    if (userResult.status === "rejected") {
      router.replace(DASHBOARD_ROUTES.login);
      return;
    }

    setUser(userResult.value.data.user);

    if (sessionResult.status === "fulfilled") {
      setSessions(sessionResult.value.data.sessions);
    } else {
      setError("We couldn't load your sessions. Refresh the page to try again.");
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const startSession = useCallback(
    async (id: string) => {
      try {
        setError("");
        setBusyId(id);

        const result = await sessionService.start(id);
        router.push(DASHBOARD_ROUTES.call(result.data.session._id));
      } catch (err) {
        setError(toMessage(err, "Unable to start the session."));
        await load();
      } finally {
        setBusyId(null);
      }
    },
    [load, router]
  );

  const toggleTranscript = useCallback(
    async (id: string, value: boolean) => {
      const previous = sessions;

      // Optimistic update, rolled back if the request fails.
      setSessions((current) =>
        current.map((s) => (s._id === id ? { ...s, saveTranscript: value } : s))
      );

      try {
        setError("");
        await sessionService.update(id, { saveTranscript: value });
      } catch (err) {
        setSessions(previous);
        setError(toMessage(err, "Unable to update the transcript setting."));
      }
    },
    [sessions]
  );

  return {
    user,
    sessions,
    loading,
    error,
    busyId,
    startSession,
    toggleTranscript,
    dismissError: () => setError("")
  };
}