// src/features/dashboard/types.ts
import type { Session, SessionMode } from "@/src/features/types/index";

export type SessionFilter = "all" | SessionMode;

export interface SessionGroups {
  active: Session[];
  past: Session[];
}

export interface DashboardStats {
  total: number;
  live: number;
  ready: number;
  past: number;
}