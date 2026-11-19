
import type {
  AnswerFormat,
  SessionMode
} from "@/src/features/types/index";

export type CreatableMode = SessionMode;

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
  mode: CreatableMode;
  role: string;
  company: string;
  jobDescription: string;
  resumeDocumentId?: string;
  documentIds: string[];
  instructions: string;
  language: string;
  model: string;
  answerFormat: AnswerFormat;
  saveTranscript: boolean;
}
export interface AIModelOption {
  id: string;
  name: string;
  provider?: string;
  description?: string;
}
export type SessionFormErrors = Partial<
  Record<keyof SessionFormValues, string>
>;