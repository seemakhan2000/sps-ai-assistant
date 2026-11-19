
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, ChevronRight, Coins, Mic } from "lucide-react";

import AppShell from "@/src/components/layout/Appshell";
import CreateSessionPage from "@/src/features/sessions/components/CreateSessionPage";

export default function MockInterviewPage() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <AppShell title="Mock Interview" subtitle="Practice with a voice AI interviewer">
      <div className="relative min-h-full overflow-hidden bg-white">
        {/* Light blue gradient background */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[300px] bg-[radial-gradient(ellipse_at_80%_70%,#DCEBFA_0%,#EFF6FF_45%,transparent_75%)]" />

        {/* Blue waveform decoration */}
        <div className="pointer-events-none absolute right-8 top-6 hidden h-40 items-center gap-[10px] opacity-40 lg:flex">
          {[40, 70, 100, 60, 120, 80, 140, 90, 110, 60, 90, 50, 80, 40].map(
            (h, i) => (
              <span
                key={i}
                style={{ height: h }}
                className="w-[3px] rounded-full bg-[#7DADE0]"
              />
            )
          )}
        </div>

        <div className="relative px-6 py-8 sm:px-8">
          {/* How it works pill */}
          <button
            type="button"
            className="absolute right-6 top-6 hidden items-center gap-2 rounded-full border border-[#DCE7F3] bg-white px-4 py-2 text-[13px] text-[#1F2430] shadow-sm sm:flex"
          >
            <Bot size={16} className="text-[#2563EB]" />
            How a mock interview works
            <ChevronRight size={14} />
          </button>

          <h1 className="text-[40px] font-bold leading-tight tracking-[-0.02em] text-[#111111]">
            Mock Interview
          </h1>

          <p className="mt-2 max-w-[520px] text-[16px] leading-6 text-[#6B7280]">
            Sit through a <b className="text-[#111]">30</b>-minute interview with
            an AI interviewer — answered out loud, with ParakeetAI drafting
            beside you, exactly as it will on the day.
          </p>

          <p className="mt-4 text-[18px] text-[#6B7280]">
            <b className="text-[#111]">30</b> Minutes
          </p>

          <p className="mt-3 flex items-center gap-2 text-[14px] text-[#6B7280]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E3EEFC] text-[#2563EB]">
              <Coins size={13} />
            </span>
            <b className="text-[#111]">0.5 credit each</b> — 30 minutes, on a
            clock that can&apos;t be extended.
          </p>

          {/* Custom mock card */}
          <div className="mt-10 flex flex-col gap-4 rounded-xl border border-[#D7E5F5] bg-white p-5 shadow-sm sm:flex-row sm:items-center">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#E3EEFC] text-[#2563EB]">
              <Mic size={18} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-semibold text-[#111]">
                Custom Mock Interview
              </h2>
              <p className="mt-1 text-[14px] leading-5 text-[#6B7280]">
                Name the company and paste the job description. The interviewer
                works from that, so you can rehearse a role nobody has reported
                yet.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="h-11 shrink-0 rounded-lg bg-[#172554] px-5 text-[14px] font-medium text-white transition hover:bg-[#1E3A8A]"
            >
              Create Mock Interview
            </button>
          </div>

          <Link
            href="/sessions"
            className="mt-6 inline-flex items-center gap-1 text-[14px] text-[#6B7280] underline underline-offset-4 hover:text-[#172554]"
          >
            Mocks you have already done <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Create session modal — mode = mock */}
      {showCreate && (
        <CreateSessionPage
          embedded
          defaultMode="mock"
          onClose={() => setShowCreate(false)}
        />
      )}
    </AppShell>
  );
}
