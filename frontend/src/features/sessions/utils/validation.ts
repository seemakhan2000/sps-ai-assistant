import { INSTRUCTIONS_MAX_LENGTH } from "../constants";
import type { SessionFormErrors, SessionFormValues } from "../types";

export function validateSessionForm(
  values: SessionFormValues
): SessionFormErrors {
  const errors: SessionFormErrors = {};

  // Role and company are required only for Interview mode (SRS 4.3).
  if (values.mode === "interview") {
    if (!values.role.trim()) {
      errors.role = "Enter the role you're interviewing for.";
    }
    if (!values.company.trim()) {
      errors.company = "Enter the company name.";
    }
  }

  if (values.instructions.length > INSTRUCTIONS_MAX_LENGTH) {
    errors.instructions = `Instructions can be up to ${INSTRUCTIONS_MAX_LENGTH.toLocaleString()} characters. Upload longer material as a document.`;
  }

  if (!values.language) errors.language = "Choose a language.";
  if (!values.model) errors.model = "Choose an AI model.";

  return errors;
}

export const hasErrors = (errors: SessionFormErrors) =>
  Object.keys(errors).length > 0;