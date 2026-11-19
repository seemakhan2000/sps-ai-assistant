import type { AIModelOption, SessionFormValues } from "../types";

export function getDefaultSessionValues(
  models: AIModelOption[]
): SessionFormValues {
  return {
    mode: "interview",
    role: "",
    company: "",
    jobDescription: "",
    resumeDocumentId: "",
    documentIds: [],
    instructions: "",
    language: "en",
    model: models[0]?.id ?? "",
    answerFormat: "bullet_points",
    saveTranscript: true
  };
}