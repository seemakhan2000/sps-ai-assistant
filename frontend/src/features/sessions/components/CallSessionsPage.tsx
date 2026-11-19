"use client";

import { useRouter } from "next/navigation";

import AppShell from "@/src/components/layout/Appshell";
import { DASHBOARD_ROUTES } from "@/src/features/dashboard/utils/Constants";
import { useDashboard } from "@/src/features/dashboard/components/hooks/Usedashboard";

import SessionsBoard from "@/src/features/sessions/components/SessionsBoard";

export default function CallSessionsPage() {
  const router = useRouter();

  const {
    sessions,
    loading,
    error,
    busyId,
    toggleTranscript,
    dismissError,
  } = useDashboard();

  return (
    <AppShell
      title="Call Sessions"
      subtitle="Prepare for calls and review past sessions."
    >
      <div className="space-y-6">
        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={dismissError}
              className="font-medium underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading sessions...</p>
        ) : (
          <SessionsBoard
            sessions={sessions}
            busyId={busyId}
            onCreate={() => router.push(DASHBOARD_ROUTES.createSession)}
            onToggleTranscript={
              toggleTranscript as unknown as (session: unknown) => unknown
            }
          />
        )}
      </div>
    </AppShell>
  );
}