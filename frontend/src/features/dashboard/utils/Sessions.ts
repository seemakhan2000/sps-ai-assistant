import type { Session } from "@/src/features/types/index";
import type {
  DashboardStats,
  SessionFilter,
  SessionGroups
} from "../utils/Types";
const byNewest = (a: Session, b: Session) =>
  new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
export function filterSessions(
  sessions: Session[],
  filter: SessionFilter,
  query: string
): Session[] {
  const q = query.trim().toLowerCase();

  return sessions.filter((session) => {
    const matchesMode = filter === "all" || session.mode === filter;
    const matchesQuery =
      !q ||
      session.company?.toLowerCase().includes(q) ||
      session.role?.toLowerCase().includes(q);

    return matchesMode && matchesQuery;
  });
}

/** Active = Live + Ready to Start. Past = Ended. (SRS 4.2) */
export function groupSessions(sessions: Session[]): SessionGroups {
  const sorted = [...sessions].sort(byNewest);

  return {
    active: sorted.filter((s) => s.state !== "ended"),
    past: sorted.filter((s) => s.state === "ended")
  };
}

export function countByMode(
  sessions: Session[]
): Record<SessionFilter, number> {
  return {
    all: sessions.length,
    interview: sessions.filter((s) => s.mode === "interview").length,
    regular: sessions.filter((s) => s.mode === "regular").length,
    mock: sessions.filter((s) => s.mode === "mock").length
  };
}

export function getStats(sessions: Session[]): DashboardStats {
  return {
    total: sessions.length,
    live: sessions.filter((s) => s.state === "live").length,
    ready: sessions.filter((s) => s.state === "ready").length,
    past: sessions.filter((s) => s.state === "ended").length
  };
}

export function formatCreated(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}