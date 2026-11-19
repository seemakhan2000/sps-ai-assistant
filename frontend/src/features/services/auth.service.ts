
import { apiFetch } from "../lib/api";
import type { User } from "../types/index";

interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
  };
}

export const authService = {
  register(data: {
    name: string;
    email: string;
    password: string;
  }) {
    return apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  login(data: {
    email: string;
    password: string;
  }) {
    return apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  logout() {
    return apiFetch<{ success: boolean }>("/auth/logout", {
      method: "POST"
    });
  },

  getMe() {
    return apiFetch<{
      success: boolean;
      data: { user: User };
    }>("/auth/me");
  }
};