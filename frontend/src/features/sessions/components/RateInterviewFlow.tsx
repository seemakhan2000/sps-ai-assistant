"use client";

import { useState, type ReactNode } from "react";
import {
  Ban,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  CircleCheckBig,
  Calendar,
  GraduationCap,
  Globe,
  Hourglass,
  MailX,
  MoreHorizontal,
  PartyPopper,
  Star,
  ThumbsDown,
  ThumbsUp,
  UserSearch,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------- Types */

export interface InterviewReview {
  role: string;
  interviewDate: string;
  rating: number;
  difficulty: number;
  outcome: string;
  source: string;
  involved: string[];
  duration: string;
  process: string;
  didWell: string;
  couldBeBetter: string;
  salary: { currency: string; period: "year" | "month" | "hour"; from: string; to: string };
  recommend: boolean | null;
}

interface RateInterviewFlowProps {
  company: string;
  defaultRole: string;
  onSubmit: (review: InterviewReview) => void | Promise<void>;
  onBackToStart?: () => void;
}

const TOTAL = 13;
const MIN_PROCESS_CHARS = 40;
const RATING_LABELS = ["Terrible", "Poor", "Okay", "Good", "Excellent"];

const OUTCOMES: [string, LucideIcon][] = [
  ["Offer accepted", PartyPopper],
  ["Offer declined", CircleCheckBig],
  ["No offer", MailX],
  ["Still waiting", Hourglass],
];
const SOURCES: [string, LucideIcon][] = [
  ["Applied online", Globe],
  ["Recruiter reached out", UserSearch],
  ["Employee referral", Users],
  ["Campus or university", GraduationCap],
  ["Other", MoreHorizontal],
];
const INVOLVED = [
  "Recruiter screen", "Behavioral questions", "Technical questions", "Live coding",
  "Take-home task", "System design", "Case study", "Role play", "Panel interview",
];
const DURATIONS: [string, LucideIcon][] = [
  ["Under a week", Zap],
  ["1 to 2 weeks", CalendarDays],
  ["3 to 4 weeks", CalendarRange],
  ["1 to 2 months", Calendar],
  ["Over 2 months", Hourglass],
];

/* ------------------------------------------------- UI bits */

const NAVY = "bg-[#172554] hover:bg-[#1E3A8A]";

function OptionRow({
  label, icon: Icon, selected, onClick,
}: { label: string; icon: LucideIcon; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex h-[46px] w-full items-center gap-3 rounded-xl border bg-white px-3 text-left text-[15px] text-[#0B1437] transition ${
        selected ? "border-[#172554] bg-[#EEF2FF] ring-1 ring-[#172554]" : "border-[#E3E6F0] hover:border-[#A5B4FC]"
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F1F3F9] text-[#172554]">
        <Icon size={15} />
      </span>
      {label}
    </button>
  );
}

function Title({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="text-center">
      <h3 className="text-[24px] font-semibold leading-8 tracking-[-0.01em] text-[#0B1437]">{children}</h3>
      {hint && <p className="mt-1 text-[14px] text-[#6B7280]">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[#D5D9E8] bg-white px-4 text-[15px] text-[#0B1437] placeholder:text-[#9AA1B5] focus:border-[#172554] focus:outline-none focus:ring-2 focus:ring-[#172554]/15";

/* ------------------------------------------------- Flow */

export default function RateInterviewFlow({
  company, defaultRole, onSubmit, onBackToStart,
}: RateInterviewFlowProps) {
  const [step, setStep] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<InterviewReview>({
    role: defaultRole,
    interviewDate: "",
    rating: 0,
    difficulty: 0,
    outcome: "",
    source: "",
    involved: [],
    duration: "",
    process: "",
    didWell: "",
    couldBeBetter: "",
    salary: { currency: "USD", period: "year", from: "", to: "" },
    recommend: null,
  });

  const set = <K extends keyof InterviewReview>(k: K, v: InterviewReview[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const optional = [2, 7, 8, 10, 11, 12].includes(step);
  const valid: Record<number, boolean> = {
    1: data.role.trim().length > 0,
    3: data.rating > 0,
    4: data.difficulty > 0,
    5: !!data.outcome,
    6: !!data.source,
    9: data.process.trim().length >= MIN_PROCESS_CHARS,
    13: data.recommend !== null,
  };
  const canNext = optional || valid[step];
  const isEmpty: Record<number, boolean> = {
    2: !data.interviewDate,
    7: data.involved.length === 0,
    8: !data.duration,
    10: !data.didWell.trim(),
    11: !data.couldBeBetter.trim(),
    12: !data.salary.from && !data.salary.to,
  };
  const nextLabel = step === TOTAL ? "Submit review" : optional && isEmpty[step] ? "Skip" : "Next";

  async function next() {
    if (step < TOTAL) return setStep(step + 1);
    try {
      setSaving(true);
      setError("");
      await onSubmit(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit your review. Try again.");
      setSaving(false);
    }
  }
  function back() {
    if (step > 1) setStep(step - 1);
    else onBackToStart?.();
  }

  function body() {
    switch (step) {
      case 1:
        return (
          <>
            <Title hint="Prefilled from your session; fix it if we got it wrong.">Which role did you interview for?</Title>
            <input className={`${inputCls} mt-6 h-12 text-center`} value={data.role} onChange={(e) => set("role", e.target.value)} />
          </>
        );
      case 2:
        return (
          <>
            <Title hint="Optional.">When was the interview?</Title>
            <input type="month" className={`${inputCls} mt-6 h-12 text-center`} value={data.interviewDate} onChange={(e) => set("interviewDate", e.target.value)} />
          </>
        );
      case 3:
        return (
          <>
            <Title>How was your interview at {company}?</Title>
            <div className="mt-6 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`${n} star`} onClick={() => set("rating", n)} className="rounded p-1 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#172554]/30">
                  <Star size={38} strokeWidth={1.6} className={n <= data.rating ? "fill-[#F59E0B] text-[#F59E0B]" : "text-[#A3A8B8]"} />
                </button>
              ))}
            </div>
            <p className="mt-3 h-5 text-center text-[14px] font-medium text-[#0B1437]">{data.rating ? RATING_LABELS[data.rating - 1] : ""}</p>
          </>
        );
      case 4:
        return (
          <>
            <Title>How hard was the interview?</Title>
            <div className="mt-6 grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => set("difficulty", n)} aria-pressed={data.difficulty === n}
                  className={`h-12 rounded-xl border text-[17px] transition ${data.difficulty === n ? "border-[#172554] bg-[#172554] text-white" : "border-[#E3E6F0] bg-white text-[#0B1437] hover:border-[#A5B4FC]"}`}>
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[13px] text-[#6B7280]"><span>Very easy</span><span>Very hard</span></div>
          </>
        );
      case 5:
        return (
          <>
            <Title>How did it end?</Title>
            <div className="mt-5 space-y-2.5">
              {OUTCOMES.map(([l, i]) => <OptionRow key={l} label={l} icon={i} selected={data.outcome === l} onClick={() => set("outcome", l)} />)}
            </div>
          </>
        );
      case 6:
        return (
          <>
            <Title>How did you get the interview?</Title>
            <div className="mt-5 space-y-2.5">
              {SOURCES.map(([l, i]) => <OptionRow key={l} label={l} icon={i} selected={data.source === l} onClick={() => set("source", l)} />)}
            </div>
          </>
        );
      case 7:
        return (
          <>
            <Title hint="Pick everything that applied. Optional.">What did the interview involve?</Title>
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              {INVOLVED.map((l) => {
                const on = data.involved.includes(l);
                return (
                  <button key={l} type="button" aria-pressed={on}
                    onClick={() => set("involved", on ? data.involved.filter((x) => x !== l) : [...data.involved, l])}
                    className={`rounded-full border px-4 py-2 text-[14px] transition ${on ? "border-[#172554] bg-[#172554] text-white" : "border-[#D5D9E8] bg-white text-[#0B1437] hover:border-[#A5B4FC]"}`}>
                    {l}
                  </button>
                );
              })}
            </div>
          </>
        );
      case 8:
        return (
          <>
            <Title hint="From first contact to the latest round. Optional.">How long has the process taken?</Title>
            <div className="mt-5 space-y-2.5">
              {DURATIONS.map(([l, i]) => <OptionRow key={l} label={l} icon={i} selected={data.duration === l} onClick={() => set("duration", l)} />)}
            </div>
          </>
        );
      case 9: {
        const missing = Math.max(0, MIN_PROCESS_CHARS - data.process.trim().length);
        return (
          <>
            <Title hint="Rounds, formats, how long each took, what surprised you. This is what helps the next candidate most.">How did the process go?</Title>
            <textarea className={`${inputCls} mt-5 h-36 resize-none py-3`} value={data.process} onChange={(e) => set("process", e.target.value)} placeholder="Two rounds over three weeks, a take-home task, a final panel…" />
            <p className="mt-2 text-right text-[13px] text-[#6B7280]">{missing > 0 ? `${missing} more characters needed` : "Looks good"}</p>
          </>
        );
      }
      case 10:
        return (
          <>
            <Title hint="Optional. Concrete beats polite.">What did {company} do well?</Title>
            <textarea className={`${inputCls} mt-5 h-32 resize-none py-3`} value={data.didWell} onChange={(e) => set("didWell", e.target.value)} placeholder="Clear about the process, interviewers who had read my resume, quick feedback…" />
          </>
        );
      case 11:
        return (
          <>
            <Title hint="Optional. Honest and specific beats vague.">What could {company} do better?</Title>
            <textarea className={`${inputCls} mt-5 h-32 resize-none py-3`} value={data.couldBeBetter} onChange={(e) => set("couldBeBetter", e.target.value)} placeholder="A take-home that took a weekend, two weeks of silence, questions unrelated to the role…" />
          </>
        );
      case 12:
        return (
          <>
            <Title hint="Only if it came up. Optional.">Was a salary range mentioned?</Title>
            <div className="mt-5 space-y-4">
              <label className="block text-[13px] text-[#6B7280]">Currency
                <select className={`${inputCls} mt-1 h-10 w-28`} value={data.salary.currency} onChange={(e) => set("salary", { ...data.salary, currency: e.target.value })}>
                  {["USD", "EUR", "GBP", "PKR", "INR", "AED"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <div>
                <span className="text-[13px] text-[#6B7280]">Period</span>
                <div className="mt-1 flex gap-1">
                  {(["year", "month", "hour"] as const).map((p) => (
                    <button key={p} type="button" onClick={() => set("salary", { ...data.salary, period: p })}
                      className={`rounded-full px-4 py-1.5 text-[14px] capitalize transition ${data.salary.period === p ? "bg-[#172554] text-white" : "text-[#6B7280] hover:bg-[#F1F3F9]"}`}>{p}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-3">
                {(["from", "to"] as const).map((k, i) => (
                  <div key={k} className="contents">
                    {i === 1 && <span className="pb-3 text-[#9AA1B5]">—</span>}
                    <label className="block flex-1 text-[13px] text-[#6B7280]">{k === "from" ? "From" : "To"}
                      <input inputMode="numeric" className={`${inputCls} mt-1 h-10`} placeholder={k === "from" ? "85,000" : "105,000"} value={data.salary[k]}
                        onChange={(e) => set("salary", { ...data.salary, [k]: e.target.value.replace(/[^\d,]/g, "") })} />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      default:
        return (
          <>
            <Title hint="Last one. Then your review is in.">Would you recommend interviewing at {company}?</Title>
            <div className="mt-5 space-y-2.5">
              <OptionRow label="Yes, I would" icon={ThumbsUp} selected={data.recommend === true} onClick={() => set("recommend", true)} />
              <OptionRow label="No, I would not" icon={ThumbsDown} selected={data.recommend === false} onClick={() => set("recommend", false)} />
            </div>
          </>
        );
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Step indicator */}
      <div className="relative mt-1 text-center">
        <button type="button" onClick={() => setMenuOpen((o) => !o)} className="inline-flex items-center gap-1 text-[12.5px] uppercase tracking-wide text-[#6B7280]">
          Step {step} of {TOTAL} <ChevronDown size={13} />
        </button>
        {menuOpen && (
          <div className="absolute left-1/2 z-10 mt-1 max-h-48 w-40 -translate-x-1/2 overflow-y-auto rounded-xl border border-[#E3E6F0] bg-white py-1 text-left shadow-lg">
            {Array.from({ length: TOTAL }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" disabled={n > step} onClick={() => { setStep(n); setMenuOpen(false); }}
                className="block w-full px-3 py-1.5 text-left text-[13px] text-[#0B1437] hover:bg-[#EEF2FF] disabled:text-[#B6BBCB] disabled:hover:bg-transparent">
                Step {n}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-2 h-[2px] w-full bg-[#E5E7EB]">
        <div className="h-full bg-[#16A34A] transition-all duration-300" style={{ width: `${(step / TOTAL) * 100}%` }} />
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-6">
        <div className="mx-auto max-w-[560px]">{body()}</div>
        {error && <p role="alert" className="mx-auto mt-3 max-w-[560px] text-center text-[13px] text-red-600">{error}</p>}
      </div>

      {/* Footer */}
      <div className="flex justify-center gap-3 pb-1 pt-2">
        <button type="button" onClick={back} className="h-11 min-w-[104px] rounded-xl bg-[#F1F3F9] px-6 text-[14px] font-medium text-[#0B1437] transition hover:bg-[#E5E9F5]">Back</button>
        <button type="button" disabled={!canNext || saving} onClick={next}
          className={`h-11 min-w-[104px] rounded-xl px-6 text-[14px] font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-[#94A3C4] ${NAVY}`}>
          {saving ? "Submitting…" : nextLabel}
        </button>
      </div>
    </div>
  );
}