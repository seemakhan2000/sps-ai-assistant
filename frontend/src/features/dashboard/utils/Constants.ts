import type { SessionFilter } from "../utils/Types";

/** Change a route here once and the whole dashboard follows. */
export const DASHBOARD_ROUTES = {
  login: "/login",
  createSession: "/CreateSession",
  call: (id: string) => `/call/${id}`,
  details: (id: string) => `/CallSessions/${id}`,
  edit: (id: string) => `/CallSessions/${id}/edit`,
  transcript: (id: string) => `/CallSessions/${id}?tab=transcript`
} as const;

export const SESSION_FILTERS: { value: SessionFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "interview", label: "Interview" },
  { value: "regular", label: "Regular" },
  { value: "mock", label: "Mock" }
];