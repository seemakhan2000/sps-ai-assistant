
import { apiFetch } from "@/src/features/lib/api";

export interface AccountUser {
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

export const accountService = {
  get: () =>
    apiFetch<{ user: AccountUser }>("/account", {
      method: "GET",
    }),

  update: (
    data: Partial<
      Pick<AccountUser, "name" | "theme" | "privacyPreferences">
    >
  ) =>
    apiFetch<{ user: AccountUser }>("/account", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch("/account/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  remove: (password: string) =>
    apiFetch("/account", {
      method: "DELETE",
      body: JSON.stringify({ password }),
    }),
};
