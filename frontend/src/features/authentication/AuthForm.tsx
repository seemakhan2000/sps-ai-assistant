"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Sparkles,
  AudioLines,
  FileText,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

import { authService } from "../services/auth.service";

/** Where the user lands right after signing in or registering. */
const AFTER_LOGIN_ROUTE = "/CallSessions";

interface Props {
  mode: "login" | "register";
}

export default function AuthForm({ mode }: Props) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      if (isRegister) {
        await authService.register({
          name: name.trim(),
          email: email.trim(),
          password,
        });
      } else {
        await authService.login({
          email: email.trim(),
          password,
        });
      }

      router.replace(AFTER_LOGIN_ROUTE);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#F4F6FA] p-4 sm:p-6 lg:p-8">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-[0_20px_80px_rgba(16,29,50,0.10)] lg:min-h-[680px] lg:grid-cols-2">

        {/* LEFT BRANDING SECTION */}

        <section className="relative hidden flex-col justify-between overflow-hidden bg-[#101D32] p-10 text-white lg:flex xl:p-14">

          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-lg font-extrabold text-[#101D32]">
                SPS
              </div>

              <div>
                <h2 className="text-lg font-bold tracking-tight">
                  SPS AI Assistant
                </h2>
                <p className="text-xs text-slate-400">
                  Intelligent Conversation Assistance
                </p>
              </div>
            </Link>
          </div>

          <div className="relative z-10 my-12">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-blue-200">
              <Sparkles size={15} />
              AI-Powered Assistance
            </div>

            <h1 className="max-w-lg text-4xl font-bold leading-[1.2] tracking-tight xl:text-5xl">
              {isRegister
                ? "Your conversations. Smarter with AI."
                : "Welcome back to smarter conversations."}
            </h1>

            <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
              Get intelligent assistance for interviews, meetings
              and professional conversations with SPS AI Assistant.
            </p>

            <div className="mt-10 space-y-5">

              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <AudioLines className="text-blue-300" size={21} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold">
                    Real-Time AI Assistance
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Live transcription and contextual answers.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <FileText className="text-blue-300" size={21} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold">
                    Intelligent Document Context
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Use your documents and interview context.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <ShieldCheck className="text-blue-300" size={21} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold">
                    Privacy-Focused Experience
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    User-controlled privacy and session settings.
                  </p>
                </div>
              </div>

            </div>
          </div>

          <div className="relative z-10 border-t border-white/10 pt-6">
            <p className="text-xs text-slate-400">
              Powered by Software Productivity Strategists (SPS)
            </p>
          </div>
        </section>

        {/* RIGHT AUTHENTICATION SECTION */}

        <section className="flex items-center justify-center px-5 py-12 sm:px-10 lg:px-12 xl:px-16">

          <div className="w-full max-w-md">

            {/* Mobile Branding */}

            <Link href="/" className="mb-10 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#101D32] text-base font-extrabold text-white">
                SPS
              </div>

              <div>
                <h2 className="font-bold text-[#101D32]">
                  SPS AI Assistant
                </h2>
                <p className="text-xs text-slate-500">
                  Intelligent Conversation Assistance
                </p>
              </div>
            </Link>

            {/* Heading */}

            <div className="mb-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Sparkles size={23} />
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-[#101D32]">
                {isRegister ? "Create your account" : "Welcome back"}
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                {isRegister
                  ? "Create your SPS account to get started with intelligent AI assistance."
                  : "Sign in to continue to your SPS AI Assistant workspace."}
              </p>
            </div>

            {/* Form */}

            <form onSubmit={handleSubmit} className="space-y-5">

              {isRegister && (
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Full Name
                  </label>

                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    minLength={2}
                    maxLength={100}
                    required
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-[#101D32] outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email Address
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-[#101D32] outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>

                  {!isRegister && (
                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold text-blue-600 transition hover:text-blue-800"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>

                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      isRegister
                        ? "Create a strong password"
                        : "Enter your password"
                    }
                    autoComplete={
                      isRegister ? "new-password" : "current-password"
                    }
                    minLength={isRegister ? 10 : 1}
                    maxLength={128}
                    required
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-[#101D32] outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#101D32]"
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>

                {isRegister && (
                  <p className="mt-2 text-xs text-slate-400">
                    Password must contain at least 10 characters.
                  </p>
                )}
              </div>

              {/* Error Message */}

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              {/* Submit */}

              <button
                type="submit"
                disabled={loading}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#101D32] px-5 text-sm font-semibold text-white shadow-lg shadow-[#101D32]/10 transition hover:bg-[#1B3556] focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Please wait...
                  </>
                ) : (
                  <>
                    {isRegister ? "Create Account" : "Sign In"}
                    <ArrowRight
                      size={17}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>

            </form>

            {/* Switch Authentication */}

            <div className="mt-7 text-center">
              <p className="text-sm text-slate-500">
                {isRegister
                  ? "Already have an account?"
                  : "Don't have an account?"}

                {" "}

                <Link
                  href={isRegister ? "/login" : "/register"}
                  className="font-semibold text-blue-600 transition hover:text-blue-800"
                >
                  {isRegister ? "Sign in" : "Create an account"}
                </Link>
              </p>
            </div>

            {/* Security Information */}

            <div className="mt-9 flex items-center justify-center gap-2 border-t border-slate-100 pt-6">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <p className="text-xs text-slate-400">
                Secure authentication by SPS
              </p>
            </div>

          <p className="mt-5 text-center text-xs text-slate-400">
  © 2026 Software Productivity Strategists.
  All rights reserved.
</p>

          </div>
        </section>
      </div>
    </main>
  );
}