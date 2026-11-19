import type { AnswerFormat } from "@/src/features/types/index";
import type { CreatableMode } from "./types";

export const SESSION_ROUTES = {
  afterCreate: "/CallSessions",
  documents: "/documents"
} as const;

/** SRS 4.3: free-text instructions, maximum 20,000 characters. */
export const INSTRUCTIONS_MAX_LENGTH = 20000;

export const MODE_OPTIONS: { value: CreatableMode; label: string; hint: string }[] = [
  {
    value: "interview",
    label: "Interview",
    hint: "Uses your resume, the role and the company to shape answers."
  },
  {
    value: "regular",
    label: "Regular call",
    hint: "For sales calls, meetings and other professional conversations."
  }
];

export const ANSWER_FORMAT_OPTIONS: {
  value: AnswerFormat;
  label: string;
  hint: string;
}[] = [
  {
    value: "bullet_points",
    label: "Bullet points",
    hint: "Short, clear points you can expand on."
  },
  {
    value: "script_bullets",
    label: "Script + bullets",
    hint: "A natural spoken answer, then key supporting points."
  },
  {
    value: "full_script",
    label: "Full script",
    hint: "A complete answer you can say out loud."
  }
];

export const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google"
};

/**
 * The SRS targets 50+ languages. Extend this list once the
 * speech-to-text provider is chosen and its language support is verified.
 */
export const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ur", label: "Urdu" },
  { value: "hi", label: "Hindi" },
  { value: "ar", label: "Arabic" },
  { value: "bn", label: "Bengali" },
  { value: "zh", label: "Chinese" },
  { value: "cs", label: "Czech" },
  { value: "da", label: "Danish" },
  { value: "nl", label: "Dutch" },
  { value: "fi", label: "Finnish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "el", label: "Greek" },
  { value: "he", label: "Hebrew" },
  { value: "hu", label: "Hungarian" },
  { value: "id", label: "Indonesian" },
  { value: "it", label: "Italian" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "ms", label: "Malay" },
  { value: "fa", label: "Persian" },
  { value: "pl", label: "Polish" },
  { value: "pt", label: "Portuguese" },
  { value: "ro", label: "Romanian" },
  { value: "ru", label: "Russian" },
  { value: "es", label: "Spanish" },
  { value: "sv", label: "Swedish" },
  { value: "ta", label: "Tamil" },
  { value: "th", label: "Thai" },
  { value: "tr", label: "Turkish" },
  { value: "uk", label: "Ukrainian" },
  { value: "vi", label: "Vietnamese" }
];