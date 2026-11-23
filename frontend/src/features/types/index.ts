export type SessionMode = "interview" | "regular" | "mock";

export type SessionState = "ready" | "live" | "ended";

export type AnswerFormat =
  | "bullet_points"
  | "script_bullets"
  | "full_script";

export interface Session {
  _id: string;
  id?: string;
  title?: string;
  name?: string;
  mode: SessionMode;
  state: SessionState;
  role?: string;
  company?: string;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string;
  endedAt?: string;
}

export interface SessionFormValues {
  mode: SessionMode;
  role: string;
  company: string;
  jobDescription: string;
  resumeDocumentId: string;
  documentIds: string[];
  instructions: string;
  language: string;
  model: string;
  answerFormat: AnswerFormat;
  saveTranscript: boolean;
}

export interface CreateSessionPayload {
  mode: SessionMode;
  role?: string;
  company?: string;
  jobDescription?: string;
  resumeDocumentId?: string;
  documentIds: string[];
  instructions: string;
  language: string;
  model: string;
  answerFormat: AnswerFormat;
  saveTranscript: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  accountStatus: string;
  theme: "light" | "dark";
  privacyPreferences: {
    saveTranscriptByDefault: boolean;
    questionBankContribution: boolean;
  };
}

export type AccountUser = User;

export interface Session {
  _id: string;
  id?: string;

  title?: string;
  name?: string;

  mode: SessionMode;
  state: SessionState;

  role?: string;
  company?: string;

  remainingTime?: number;
  saveTranscript?: boolean;

  createdAt?: string;
  updatedAt?: string;
  startedAt?: string;
  endedAt?: string;
}
