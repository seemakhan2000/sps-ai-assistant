"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Manrope } from "next/font/google";
import {
  ArrowRight,
  AudioLines,
  Briefcase,
  Check,
  ChevronDown,
  FileText,
  History,
  Menu,
  Mic,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Video,
  X,
  type LucideIcon
} from "lucide-react";

import Footer from "@/src/components/layout/Footer";

const manrope = Manrope({ subsets: ["latin"], display: "swap" });

/* -------------------------------------------------------------------------- */
/*  Animations (CSS, reduced-motion safe)                                     */
/* -------------------------------------------------------------------------- */

const ANIMATION_CSS = `
/* Animations for the landing page. Everything is wrapped in
   prefers-reduced-motion: no-preference, so users who turn motion
   off in their OS see the finished page with no movement. */

@media (prefers-reduced-motion: no-preference) {
  /* Smooth scrolling for the in-page anchors (Features, FAQ, ...) */
  html {
    scroll-behavior: smooth;
  }

  /* Page-load entrance (hero only) */
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  .hero-in {
    animation: rise 0.8s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: var(--d, 0ms);
  }

  /* Scroll reveal (toggled by the Reveal component) */
  .reveal {
    opacity: 0;
    transform: translateY(18px);
    transition:
      opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1),
      transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
    transition-delay: var(--d, 0ms);
    will-change: opacity, transform;
  }

  .reveal.is-visible {
    opacity: 1;
    transform: none;
  }

  /* Connector line between steps draws itself */
  .draw-line {
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 1s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .reveal.is-visible .draw-line {
    transform: scaleX(1);
    transition-delay: calc(var(--d, 0ms) + 350ms);
  }

  /* Audio waveform in the live preview */
  @keyframes wave {
    0%,
    100% {
      transform: scaleY(0.3);
    }
    50% {
      transform: scaleY(1);
    }
  }

  .wave-bar {
    transform-origin: bottom;
    transform: scaleY(0.3);
    animation: wave 1s ease-in-out infinite;
    transition: transform 0.4s ease;
  }
}
`;

/* -------------------------------------------------------------------------- */
/*  Scroll reveal                                                             */
/* -------------------------------------------------------------------------- */

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger delay in milliseconds. */
  delay?: number;
  as?: "div" | "li" | "ul" | "ol" | "dl";
};

/** Fades and lifts content in once, when it first scrolls into view. */
function Reveal({ children, className = "", delay = 0, as = "div" }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Tag = as as "div";

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ "--d": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

/* -------------------------------------------------------------------------- */
/*  Live session preview                                                      */
/* -------------------------------------------------------------------------- */

const QUESTION = "Tell me about a time you had to prioritise between two urgent projects.";
const REPLY =
  "At my last company we had a product launch and a client escalation landing in the same week";
const ANSWER =
  "Start with the impact on the client, then explain how you split the team: one owner for the launch, you on the escalation.";
const POINTS = [
  "Name the trade-off you made and why",
  "Close with the measurable result from your resume"
];
const BARS = [10, 18, 8, 22, 14, 26, 12, 20, 9, 16, 24, 11];

/**
 * Stages of the looping demo:
 * 0 idle, 1 question heard, 2 you speak (typing), 3 answer appears, 4 tips appear.
 */
function LiveSessionPreview() {
  const [stage, setStage] = useState(0);
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    // Reduced motion: show the finished state, no loop.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage(4);
      setTyped(REPLY.length);
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(setTimeout(resolve, ms));
      });

    (async () => {
      while (!cancelled) {
        setStage(0);
        setTyped(0);
        await sleep(900);
        if (cancelled) return;
        setStage(1);
        await sleep(1300);
        if (cancelled) return;
        setStage(2);
        for (let i = 1; i <= REPLY.length; i++) {
          if (cancelled) return;
          setTyped(i);
          await sleep(34);
        }
        await sleep(500);
        if (cancelled) return;
        setStage(3);
        await sleep(1000);
        if (cancelled) return;
        setStage(4);
        await sleep(6500);
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  const speaking = stage === 2;
  const fade = (on: boolean) =>
    `transition-all duration-500 ease-out ${on ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`;

  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_80px_-20px_rgba(19,41,107,0.35)]"
    >
      {/* Window bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        </div>
        <p className="text-xs font-medium text-slate-500">Product Manager · Interview session</p>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      <div className="grid sm:grid-cols-[1fr_1.15fr]">
        {/* Transcript */}
        <div className="min-h-[250px] space-y-4 border-b border-slate-200 p-5 sm:min-h-[320px] sm:border-b-0 sm:border-r">
          <p className="text-xs font-semibold text-slate-500">Live transcript</p>

          <div className={fade(stage >= 1)}>
            <p className="text-[11px] font-semibold text-slate-400">Interviewer</p>
            <p className="mt-1 text-sm leading-6 text-slate-700">{QUESTION}</p>
          </div>

          <div className={fade(stage >= 2)}>
            <p className="text-[11px] font-semibold text-[#13296B]">You</p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {REPLY.slice(0, typed)}
              {stage === 2 && (
                <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 bg-[#13296B] motion-safe:animate-pulse" />
              )}
            </p>
          </div>

          <div className="flex items-end gap-1 pt-1">
            {BARS.map((h, i) => (
              <span
                key={i}
                style={{
                  height: h,
                  animationDelay: `${i * 90}ms`,
                  animationPlayState: speaking ? "running" : "paused"
                }}
                className={`wave-bar w-1 rounded-full ${speaking ? "bg-blue-400" : "bg-blue-200"}`}
              />
            ))}
          </div>
        </div>

        {/* Answer */}
        <div className="min-h-[250px] bg-slate-50/70 p-5 sm:min-h-[320px]">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#13296B] text-white">
              <Sparkles size={13} />
            </span>
            <p className="text-xs font-semibold text-slate-700">
              {stage < 2 ? "Waiting for the conversation" : stage < 3 ? "Drafting your answer" : "Suggested answer"}
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
            {/* Skeleton while the answer is being drafted */}
            {stage < 3 ? (
              <div className="space-y-2.5 motion-safe:animate-pulse">
                <div className="h-2.5 w-full rounded-full bg-slate-200" />
                <div className="h-2.5 w-11/12 rounded-full bg-slate-200" />
                <div className="h-2.5 w-2/3 rounded-full bg-slate-200" />
              </div>
            ) : (
              <p className={`text-sm leading-6 text-slate-800 ${fade(true)}`}>{ANSWER}</p>
            )}

            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              {POINTS.map((point, i) => (
                <li
                  key={point}
                  style={{ transitionDelay: stage >= 4 ? `${i * 180}ms` : "0ms" }}
                  className={`flex gap-2 ${fade(stage >= 4)}`}
                >
                  <Check size={16} className="mt-1 shrink-0 text-[#1E3A8A]" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className={`mt-3 flex items-center gap-2 text-[11px] text-slate-500 ${fade(stage >= 4)}`}>
            <FileText size={13} />
            Based on your resume and the job description
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Content                                                                   */
/* -------------------------------------------------------------------------- */

/** Logo file lives in frontend/public/images. */
const LOGO_SRC = "/images/logo-400.webp";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Privacy", href: "#privacy" },
  { label: "FAQ", href: "#faq" }
];

const TRUST_POINTS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: AudioLines, title: "Real-time answers", text: "While the conversation is live" },
  { icon: FileText, title: "Your own context", text: "Resume, documents and job details" },
  { icon: ShieldCheck, title: "Privacy-focused", text: "You control session settings" }
];

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: MessagesSquare,
    title: "Real-Time Assistance",
    text: "Contextual AI answers while you are still talking, in interviews, sales calls and client meetings."
  },
  {
    icon: AudioLines,
    title: "Live Transcription",
    text: "Speech recognition turns the conversation into text as it happens, so nothing slips past you."
  },
  {
    icon: Video,
    title: "Interview Practice",
    text: "Rehearse with a voice-based AI interviewer built around the company and role you are targeting."
  },
  {
    icon: FileText,
    title: "Document Context",
    text: "Add your resume and documents so every answer reflects your real experience."
  },
  {
    icon: History,
    title: "Session History",
    text: "Review past sessions and transcripts to see what went well and what to sharpen."
  },
  {
    icon: ShieldCheck,
    title: "Privacy Controls",
    text: "Decide what is saved, such as transcripts, for every session you create."
  }
];

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Briefcase,
    title: "Create a session",
    text: "Enter the role, company and job description, and attach your resume."
  },
  {
    icon: Mic,
    title: "Connect your audio",
    text: "Choose your microphone or meeting audio and start when you are ready."
  },
  {
    icon: Sparkles,
    title: "Get answers live",
    text: "Receive clear, relevant answers on screen as the conversation moves."
  }
];

const PRIVACY_POINTS = [
  "Choose whether to save the transcript for each session",
  "Your resume and documents are used only for your answers",
  "Secure sign-in to protect your workspace"
];

const FAQS = [
  {
    q: "What can I use SPS AI Assistant for?",
    a: "Interviews, sales calls, client meetings and other professional conversations where you want relevant answers at hand while you talk."
  },
  {
    q: "Can I practise before a real interview?",
    a: "Yes. Mock Interview lets you rehearse with a voice-based AI interviewer built around the company and role you enter."
  },
  {
    q: "How does it know about my experience?",
    a: "Attach your resume and any other documents to a session. Answers are drafted with that context and the job description in mind."
  },
  {
    q: "Is my transcript saved?",
    a: "Only if you choose. Each session has its own setting for saving the transcript."
  }
];

/* -------------------------------------------------------------------------- */
/*  Shared styles                                                             */
/* -------------------------------------------------------------------------- */

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

const primaryBtn = `inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#13296B] px-7 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#0E1F54] motion-safe:hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-8px_rgba(19,41,107,0.55)] active:translate-y-0 ${focusRing}`;

const secondaryBtn = `inline-flex h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-7 text-sm font-semibold text-slate-800 transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 motion-safe:hover:-translate-y-0.5 active:translate-y-0 ${focusRing}`;

/** Sets the entrance delay (ms) used by the .hero-in class. */
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/* -------------------------------------------------------------------------- */
/*  Pieces                                                                    */
/* -------------------------------------------------------------------------- */

function BrandMark() {
  return (
    <span className="flex items-center gap-3">
      <span className="flex h-14 items-center rounded-xl bg-white px-3 ring-1 ring-slate-200">
        <Image
          src={LOGO_SRC}
          alt="SPS logo"
          width={400}
          height={120}
          priority
          className="h-auto max-h-10 w-auto max-w-[170px] object-contain"
        />
      </span>
      <span className="hidden sm:block">
        <span className="block text-sm font-bold leading-tight text-[#13296B]">
          SPS AI Assistant
        </span>
        <span className="block text-[11px] text-slate-500">Intelligent Workspace</span>
      </span>
    </span>
  );
}

/** Menu for small screens, where the centre nav links are hidden. */
function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100 ${focusRing}`}
      >
        {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
      </button>

      {open && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full border-b border-slate-200 bg-white px-4 pb-5 pt-2 shadow-lg"
        >
          <nav aria-label="Mobile" className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-slate-100 py-3.5 text-base font-medium text-slate-700"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <Link href="/register" className={`mt-5 w-full ${primaryBtn}`}>
            Get Started
          </Link>
        </div>
      )}
    </div>
  );
}

function SectionHeading({
  title,
  text,
  light = false
}: {
  title: string;
  text?: string;
  light?: boolean;
}) {
  return (
    <Reveal className="max-w-2xl">
      <h2
        className={`text-3xl font-bold tracking-tight sm:text-[2.5rem] sm:leading-[1.15] ${
          light ? "text-white" : "text-slate-900"
        }`}
      >
        {title}
      </h2>
      {text && (
        <p className={`mt-4 text-base leading-7 ${light ? "text-blue-100" : "text-slate-600"}`}>
          {text}
        </p>
      )}
    </Reveal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function HomePage() {
  return (
    <div className={`${manrope.className} min-h-screen bg-white text-slate-900 antialiased`}>
      <style dangerouslySetInnerHTML={{ __html: ANIMATION_CSS }} />

      {/* Lets keyboard users jump past the navigation */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#13296B] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      {/* ------------------------------ NAV ------------------------------- */}
      <header className="hero-in sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="SPS AI Assistant home" className={`rounded-lg ${focusRing}`}>
            <BrandMark />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-9 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`group relative rounded py-1 text-sm font-medium text-slate-600 transition-colors hover:text-[#13296B] ${focusRing}`}
              >
                {link.label}
                <span className="absolute inset-x-0 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-[#13296B] transition-transform duration-300 group-hover:scale-x-100" />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-[#13296B] ${focusRing}`}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className={`hidden h-10 items-center rounded-lg bg-[#13296B] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0E1F54] sm:inline-flex ${focusRing}`}
            >
              Get Started
            </Link>
            <MobileMenu />
          </div>
        </div>
      </header>

      <main id="main">
        {/* ------------------------------ HERO ------------------------------ */}
        <section className="relative overflow-hidden bg-[#F5F8FF]">
          {/* Soft colour glows (no grid lines) */}
          <div
            aria-hidden
            className="hero-in pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-blue-200/40 blur-3xl"
          />
          <div
            aria-hidden
            className="hero-in pointer-events-none absolute -bottom-24 -left-40 h-96 w-96 rounded-full bg-sky-200/40 blur-3xl"
          />

          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:px-8 lg:py-28">
            <div>
              <h1
                style={delay(100)}
                className="hero-in text-4xl font-extrabold leading-[1.08] tracking-tight text-[#0E1F54] sm:text-5xl lg:text-[3.5rem]"
              >
                Your real-time AI interview assistant
              </h1>

              <p
                style={delay(220)}
                className="hero-in mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8"
              >
                Get the right answer while you are still talking, through
                interviews, sales calls, client meetings, or any conversation where
                freezing up is not an option.
              </p>

              <div style={delay(340)} className="hero-in mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className={`group ${primaryBtn}`}>
                  Get Started
                  <ArrowRight
                    size={17}
                    aria-hidden
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </Link>
                <Link href="/login" className={secondaryBtn}>
                  Sign In
                </Link>
              </div>

              <ul
                style={delay(460)}
                className="hero-in mt-12 grid gap-5 border-t border-slate-200 pt-8 sm:grid-cols-3"
              >
                {TRUST_POINTS.map((point) => {
                  const Icon = point.icon;
                  return (
                    <li key={point.title} className="flex items-start gap-3">
                      <Icon size={20} aria-hidden className="mt-0.5 shrink-0 text-[#1E3A8A]" />
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">
                          {point.title}
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                          {point.text}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* The one orchestrated moment: the preview plays a looping live session */}
            <div style={delay(300)} className="hero-in">
              <LiveSessionPreview />
            </div>
          </div>
        </section>

        {/* ---------------------------- FEATURES ---------------------------- */}
        <section id="features" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              title="Everything you need for a confident conversation"
              text="From preparation to review, SPS AI Assistant supports you before, during and after every call."
            />

            <div className="mt-14 grid border-t border-slate-200 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Reveal
                    key={feature.title}
                    delay={(index % 3) * 90}
                    className={`group border-b border-slate-200 py-8 sm:pr-8 lg:pr-10 ${
                      index % 3 !== 0 ? "lg:border-l lg:pl-10" : ""
                    } ${index % 2 !== 0 ? "sm:border-l sm:pl-8 lg:pl-10" : ""}`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#13296B] text-white transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                      <Icon size={20} aria-hidden />
                    </span>
                    <h3 className="mt-5 text-lg font-bold text-slate-900">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{feature.text}</p>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* -------------------------- HOW IT WORKS -------------------------- */}
        <section
          id="how-it-works"
          className="scroll-mt-20 border-y border-slate-200 bg-slate-50 px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeading title="Ready in three simple steps" />

            <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-0">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <Reveal key={step.title} as="li" delay={index * 220} className="relative md:pr-10">
                    {index < STEPS.length - 1 && (
                      <span
                        aria-hidden
                        className="draw-line absolute left-14 right-4 top-5 hidden h-px bg-slate-300 md:block"
                      />
                    )}
                    <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#13296B] text-sm font-bold text-white ring-8 ring-slate-50">
                      {index + 1}
                    </span>
                    <h3 className="mt-6 flex items-center gap-2 text-lg font-bold text-slate-900">
                      <Icon size={18} aria-hidden className="text-[#1E3A8A]" />
                      {step.title}
                    </h3>
                    <p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">{step.text}</p>
                  </Reveal>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ----------------------------- PRIVACY ---------------------------- */}
        <section id="privacy" className="scroll-mt-20 bg-[#0E1F54] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <Reveal>
                <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20">
                  <ShieldCheck size={24} aria-hidden />
                </span>
              </Reveal>
              <SectionHeading
                light
                title="Built so you stay in control"
                text="Your sessions, documents and transcripts belong to you. Choose what is saved for each session and manage your data from your account."
              />
            </div>

            <ul className="divide-y divide-white/15 border-y border-white/15">
              {PRIVACY_POINTS.map((item, index) => (
                <Reveal key={item} as="li" delay={index * 140} className="flex items-start gap-4 py-5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/40">
                    <Check size={14} aria-hidden />
                  </span>
                  <span className="text-base leading-7 text-blue-50">{item}</span>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------- FAQ ------------------------------ */}
        <section id="faq" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
            <SectionHeading
              title="Frequently asked questions"
              text="Quick answers about how SPS AI Assistant works."
            />

            <div className="divide-y divide-slate-200 border-y border-slate-200">
              {FAQS.map((item, index) => (
                <Reveal key={item.q} delay={index * 80}>
                  <details className="group py-5">
                    <summary
                      className={`flex cursor-pointer list-none items-center justify-between gap-4 rounded text-base font-semibold text-slate-900 [&::-webkit-details-marker]:hidden ${focusRing}`}
                    >
                      {item.q}
                      <ChevronDown
                        size={20}
                        aria-hidden
                        className="shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180"
                      />
                    </summary>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{item.a}</p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------ CTA ------------------------------- */}
        <section className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
          <Reveal className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-2xl border border-slate-200 bg-[#F5F8FF] p-8 sm:p-12 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-[#0E1F54] sm:text-4xl">
                Walk into your next conversation prepared
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Create your free account and set up your first session in minutes.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link href="/register" className={`group ${primaryBtn}`}>
                Get Started
                <ArrowRight
                  size={17}
                  aria-hidden
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </Link>
              <Link href="/login" className={secondaryBtn}>
                Sign In
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ----------------------------- FOOTER ----------------------------- */}
      <Footer />
    </div>
  );
}