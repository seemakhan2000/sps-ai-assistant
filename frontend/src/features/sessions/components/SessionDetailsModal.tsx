"use client";

import { useState } from "react";
import {
  Building2, CircleHelp, ArrowRight, Eraser, EllipsisVertical, Info,
  MessagesSquare, NotebookPen, Sparkles, Star, ThumbsUp, X, Send,
  Download, Copy, Check,
  type LucideIcon,
} from "lucide-react";
import RateInterviewFlow, { type InterviewReview } from "./RateInterviewFlow";

type View = "notes" | "transcript" | "ask" | "details" | "rate";

export interface SessionNotes {
  summary?: string;
  questions?: string[];
  nextSteps?: string[];
}

interface SessionDetailsModalProps {
  sessionId?: string;
  company: string;
  role: string;
  ratedCompany?: string;
  notes?: SessionNotes;
  notesLoading?: boolean;
  notesError?: string;
  transcript?: string[];
  details?: { label: string; value: string }[];
  initialView?: View;
  onClearNotes?: () => void;
  onRetryNotes?: () => void;
  onAskAI?: (question: string) => Promise<string>;
  onSubmitReview?: (review: InterviewReview) => void | Promise<void>;
  onClose: () => void;
}

const TRUSTPILOT_URL = "https://www.trustpilot.com"; // TODO: your Trustpilot page

export default function SessionDetailsModal({
  company, role, ratedCompany, notes, transcript = [], details = [],
  initialView = "notes", onClearNotes, onRetryNotes, onAskAI, onSubmitReview, onClose,
  notesLoading = false, notesError = "",
}: SessionDetailsModalProps) {
  const target = ratedCompany || company;
  const [view, setView] = useState<View>(initialView);
  const [rated, setRated] = useState(false);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const [thread, setThread] = useState<{ q: string; a: string }[]>([]);
  const [asking, setAsking] = useState(false);
  const [copied, setCopied] = useState(false);

  const tabs: [View, string, LucideIcon][] = [
    ["notes", "AI notes", NotebookPen],
    ["transcript", "Transcript", MessagesSquare],
    ["ask", "Ask AI", Sparkles],
    ["details", "Call details", Info],
  ];

  async function ask() {
    const text = q.trim();
    if (!text || !onAskAI || asking) return;
    setAsking(true);
    setQ("");
    try {
      const a = await onAskAI(text);
      setThread((t) => [...t, { q: text, a }]);
    } catch {
      setThread((t) => [...t, { q: text, a: "Could not get an answer. Please try again." }]);
    } finally {
      setAsking(false);
    }
  }

  // ---------- Transcript download / copy ----------
  const hasTranscript = transcript.length > 0;

  function buildTranscriptText() {
    return (
      `${company || "Call"} - ${role || "Session"}\n` +
      `Date: ${new Date().toLocaleString()}\n\n` +
      transcript.map((line, i) => `${i + 1}. ${line}`).join("\n\n")
    );
  }

  function downloadTranscript() {
    if (!hasTranscript) return;
    const blob = new Blob([buildTranscriptText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = `${company}-${role}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    a.href = url;
    a.download = `${slug || "session"}-transcript.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copyTranscript() {
    if (!hasTranscript) return;
    try {
      await navigator.clipboard.writeText(buildTranscriptText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  const item = (active: boolean) =>
    `flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[14px] transition ${
      active ? "bg-[#E8ECFA] font-medium text-[#0B1437]" : "text-[#1F2430] hover:bg-[#EEF1FB]"
    }`;

  const headerBtn =
    "flex h-9 items-center gap-2 rounded-lg bg-[#F1F3F9] px-3 text-[14px] text-[#0B1437] transition hover:bg-[#E5E9F5]";

  const Section = ({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) => (
    <section className="mt-5">
      <h4 className="flex items-center gap-2 text-[14.5px] font-medium text-[#0B1437]"><Icon size={15} />{title}</h4>
      <div className="mt-2 text-[14px] leading-6 text-[#6B7280]">{children}</div>
    </section>
  );

  return (
    <div className="fixed inset-0 z-[310] flex items-center justify-center bg-[#0B1437]/40 p-2 backdrop-blur-[2px] sm:p-4">
      <div role="dialog" aria-modal="true" className="relative flex h-[min(560px,92vh)] w-full max-w-[880px] gap-4 overflow-hidden rounded-[20px] bg-white p-3.5 shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
        {/* Sidebar */}
        <aside className="hidden w-[232px] shrink-0 flex-col rounded-2xl bg-[#F8F9FC] p-4 sm:flex">
          <h2 className="truncate text-[16px] font-semibold text-[#0B1437]">{company || "Call session"}</h2>
          <p className="truncate text-[13px] text-[#6B7280]">{role || "AI notes"}</p>

          <nav className="mt-5 space-y-1">
            {tabs.map(([id, label, Icon]) => (
              <button key={id} type="button" onClick={() => setView(id)} className={item(view === id)}>
                <Icon size={16} strokeWidth={1.7} />{label}
              </button>
            ))}
          </nav>

          <div className="mt-auto space-y-1">
            {!rated && (
              <button type="button" onClick={() => setView("rate")} className={item(view === "rate")}>
                <Building2 size={16} strokeWidth={1.7} /><span className="truncate">Rate {target || "this call"}</span>
              </button>
            )}
            <a href={TRUSTPILOT_URL} target="_blank" rel="noreferrer" className={item(false)}>
              <ThumbsUp size={16} strokeWidth={1.7} />Rate us on Trustpilot
            </a>
          </div>
        </aside>

        {/* Content */}
        <main className="flex min-w-0 flex-1 flex-col pr-2 pt-2">
          <header className="flex items-center justify-between gap-3">
            <h3 className="truncate text-[16px] font-medium text-[#0B1437]">
              {view === "rate" ? `Rate your interview at ${target}` : tabs.find((t) => t[0] === view)?.[1]}
            </h3>
            <div className="relative flex items-center gap-1">
              {view === "notes" && onClearNotes && (
                <button type="button" onClick={onClearNotes} className={`mr-1 ${headerBtn}`}>
                  <Eraser size={15} />Clear notes
                </button>
              )}

              <button type="button" aria-label="More" onClick={() => setMenu((m) => !m)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#0B1437] hover:bg-[#EEF2FF]">
                <EllipsisVertical size={16} />
              </button>
              {menu && (
                <div className="absolute right-8 top-9 z-10 w-52 rounded-xl border border-[#E3E6F0] bg-white py-1 shadow-lg">
                  {hasTranscript && (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          await copyTranscript();
                          setTimeout(() => setMenu(false), 900);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-[#EEF2FF]"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? "Copied!" : "Copy transcript"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMenu(false); downloadTranscript(); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-[#EEF2FF]"
                      >
                        <Download size={14} />Download transcript
                      </button>
                    </>
                  )}
                  <button type="button" onClick={() => { setMenu(false); window.open(TRUSTPILOT_URL, "_blank"); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-[#EEF2FF]">
                    <Star size={14} />Give feedback
                  </button>
                </div>
              )}
              <button type="button" aria-label="Close" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#0B1437] hover:bg-[#EEF2FF]">
                <X size={18} />
              </button>
            </div>
          </header>

          <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
            {view === "notes" && (
              <>
                {/* CHANGED: Details */}
                <Section icon={Info} title="Details">
                  <ul className="list-disc space-y-0.5 pl-5 marker:text-[#9AA1B5]">
                    {company && (
                      <li><b className="font-medium text-[#0B1437]">Company:</b> {company}</li>
                    )}
                    {role && (
                      <li><b className="font-medium text-[#0B1437]">Position:</b> {role}</li>
                    )}
                    <li><b className="font-medium text-[#0B1437]">Type:</b> {company || role ? "Interview" : "Call"}</li>
                  </ul>
                </Section>
                <hr className="mt-4 border-[#E5E7EB]" />

                <Section icon={Sparkles} title="Summary">
                  {notesLoading ? (
                    "Generating your AI notes…"
                  ) : notes?.summary ? (
                    notes.summary
                  ) : (
                    <>
                      {notesError ||
                        "No transcript was available, so the interview content and feedback could not be summarized."}
                      {onRetryNotes && (
                        <button
                          type="button"
                          onClick={onRetryNotes}
                          className="mt-2 block rounded-lg bg-[#172554] px-3 py-1.5 text-[13px] text-white transition hover:bg-[#1E3A8A]"
                        >
                          Retry
                        </button>
                      )}
                    </>
                  )}
                </Section>

                <Section icon={CircleHelp} title="Questions">
                  {notesLoading
                    ? "Generating…"
                    : notes?.questions?.length
                    ? <ul className="list-disc pl-5">{notes.questions.map((x, i) => <li key={i}>{x}</li>)}</ul>
                    : "No questions were available."}
                </Section>

                <Section icon={ArrowRight} title="Next Steps">
                  {notesLoading
                    ? "Generating…"
                    : notes?.nextSteps?.length
                    ? <ul className="list-disc pl-5">{notes.nextSteps.map((x, i) => <li key={i}>{x}</li>)}</ul>
                    : "No next steps were requested."}
                </Section>
              </>
            )}

            {view === "transcript" && (
              hasTranscript ? (
                <ul className="space-y-2 text-[14px] leading-6 text-[#1F2430]">{transcript.map((l, i) => <li key={i} className="rounded-lg bg-[#F8F9FC] px-3 py-2">{l}</li>)}</ul>
              ) : <p className="text-[14px] text-[#6B7280]">No transcript was saved for this session.</p>
            )}

            {view === "ask" && (
              <div className="flex h-full flex-col">
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {thread.length === 0 && <p className="text-[14px] text-[#6B7280]">Ask anything about this session, for example “What went well?”</p>}
                  {thread.map((m, i) => (
                    <div key={i} className="space-y-1.5">
                      <p className="ml-auto w-fit max-w-[85%] rounded-xl bg-[#172554] px-3 py-2 text-[14px] text-white">{m.q}</p>
                      <p className="w-fit max-w-[85%] rounded-xl bg-[#F1F3F9] px-3 py-2 text-[14px] text-[#0B1437]">{m.a}</p>
                    </div>
                  ))}
                  {asking && <p className="text-[13px] text-[#6B7280]">Thinking…</p>}
                </div>
                <div className="mt-3 flex gap-2">
                  <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder="Ask AI about this session" className="h-11 flex-1 rounded-xl border border-[#D5D9E8] px-4 text-[14px] focus:border-[#172554] focus:outline-none focus:ring-2 focus:ring-[#172554]/15" />
                  <button type="button" onClick={ask} disabled={!q.trim() || asking} aria-label="Send" className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#172554] text-white transition hover:bg-[#1E3A8A] disabled:bg-[#94A3C4]"><Send size={16} /></button>
                </div>
              </div>
            )}

            {view === "details" && (
              <dl className="divide-y divide-[#E5E7EB] text-[14px]">
                {[
                  ...(company ? [{ label: "Company", value: company }] : []),
                  ...(role ? [{ label: "Position", value: role }] : []),
                  ...details,
                ].map((d) => (
                  <div key={d.label} className="flex justify-between py-3"><dt className="text-[#6B7280]">{d.label}</dt><dd className="font-medium text-[#0B1437]">{d.value}</dd></div>
                ))}
              </dl>
            )}

            {view === "rate" && (
              <RateInterviewFlow
                company={target}
                defaultRole={role}
                onBackToStart={() => setView("notes")}
                onSubmit={async (r) => { await onSubmitReview?.(r); setRated(true); setView("notes"); }}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}