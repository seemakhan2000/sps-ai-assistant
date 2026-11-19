"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Clock,
  Globe,
  LogOut,
  Maximize2,
  Mic,
  Monitor,
  MoreVertical,
  RefreshCw,
  ScanLine,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

/* -------------------------------------------------
   Types
------------------------------------------------- */

export type AnswerRequest = {
  question: string;
  transcript: string;
  language: string;
  image?: string;
};

type Props = {
  stream: MediaStream | null;
  language?: string;
  autoAnswerDefault?: boolean;
  durationSeconds?: number;
  planLabel?: string;
  title?: string;
  /** Connect your AI backend here. Return the answer text. */
  onRequestAnswer?: (request: AnswerRequest) => Promise<string>;
  /** Called for every final transcript line (use it to save to the DB). */
  onTranscriptLine?: (text: string) => void;
  onExit: () => void;
};

type Line = { id: number; text: string };

type AnswerItem = {
  id: number;
  question: string;
  image?: string;
  answer: string;
  status: "loading" | "done" | "error";
};

type RecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const LANGUAGES = [
  { value: "en", label: "English", code: "en-US" },
  { value: "es", label: "Spanish", code: "es-ES" },
  { value: "fr", label: "French", code: "fr-FR" },
  { value: "de", label: "German", code: "de-DE" },
  { value: "ar", label: "Arabic", code: "ar-SA" },
  { value: "ur", label: "Urdu", code: "ur-PK" },
];

const ghostBtn =
  "flex h-10 items-center gap-2 rounded-lg border border-[#1F2F5E] bg-[#0C1738]/90 px-4 text-[14px] font-medium text-[#DCE4FA] backdrop-blur transition hover:bg-[#15275A] disabled:cursor-not-allowed disabled:opacity-50";

function formatTime(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* -------------------------------------------------
   Live session screen
------------------------------------------------- */

export default function LiveSession({
  stream: initialStream,
  language = "en",
  autoAnswerDefault = false,
  durationSeconds = 600,
  planLabel = "Free",
  title = "AI Assistant",
  onRequestAnswer,
  onTranscriptLine,
  onExit,
}: Props) {
  const [stream, setStream] = useState<MediaStream | null>(initialStream);
  const [audioOn, setAudioOn] = useState(true);
  const [lang, setLang] = useState(language);
  const [remaining, setRemaining] = useState(durationSeconds);

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [lines, setLines] = useState<Line[]>([]);

  const [answers, setAnswers] = useState<AnswerItem[]>([]);
  const [autoAnswer, setAutoAnswer] = useState(autoAnswerDefault);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoWrapRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<RecognitionLike | null>(null);
  const wantListeningRef = useRef(false);
  const idRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(initialStream);
  const linesRef = useRef<Line[]>([]);
  const autoAnswerRef = useRef(autoAnswer);
  const langRef = useRef(lang);
  const requestRef = useRef<(q: string, image?: string) => void>(() => {});
  const transcriptCbRef = useRef(onTranscriptLine);
  transcriptCbRef.current = onTranscriptLine;
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const answersEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    autoAnswerRef.current = autoAnswer;
  }, [autoAnswer]);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    linesRef.current = lines;
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, interim]);

  useEffect(() => {
    answersEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [answers]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  /* ---------------- Stream ---------------- */

  useEffect(() => {
    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }

    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    const handleEnded = () => setStream(null);

    track?.addEventListener("ended", handleEnded);

    return () => track?.removeEventListener("ended", handleEnded);
  }, [stream]);

  async function changeTab() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setNotice("Your browser does not support screen sharing.");
      return;
    }

    try {
      const next = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
        selfBrowserSurface: "exclude",
        surfaceSwitching: "include",
        systemAudio: "include",
      } as unknown as DisplayMediaStreamOptions);

      streamRef.current?.getTracks().forEach((track) => track.stop());
      setAudioOn(true);
      setStream(next);
    } catch {
      setNotice("Sharing was cancelled.");
    }
  }

  function toggleTabAudio() {
    const tracks = stream?.getAudioTracks() ?? [];
    const next = !audioOn;

    tracks.forEach((track) => {
      track.enabled = next;
    });

    setAudioOn(next);
  }

  function goFullscreen() {
    videoWrapRef.current?.requestFullscreen?.().catch(() => {});
  }

  /* ---------------- Answers ---------------- */

  async function requestAnswer(question: string, image?: string) {
    const id = ++idRef.current;

    setAnswers((previous) => [
      ...previous,
      { id, question, image, answer: "", status: "loading" },
    ]);

    try {
      if (!onRequestAnswer) {
        throw new Error("The answer service is not connected yet.");
      }

      const answer = await onRequestAnswer({
        question,
        transcript: linesRef.current.map((line) => line.text).join("\n"),
        language: langRef.current,
        image,
      });

      setAnswers((previous) =>
        previous.map((item) =>
          item.id === id ? { ...item, answer, status: "done" } : item
        )
      );
    } catch (error) {
      setAnswers((previous) =>
        previous.map((item) =>
          item.id === id
            ? {
                ...item,
                answer:
                  error instanceof Error
                    ? error.message
                    : "Unable to get an answer.",
                status: "error",
              }
            : item
        )
      );
    }
  }

  useEffect(() => {
    requestRef.current = requestAnswer;
  });

  function handleAnswerClick() {
    const recent = linesRef.current
      .slice(-3)
      .map((line) => line.text)
      .join(" ")
      .trim();

    if (!recent) {
      setNotice("Nothing to answer yet. Start listening or type a message.");
      return;
    }

    requestAnswer(recent);
  }

  function handleSend() {
    const text = message.trim();

    if (!text) return;

    setMessage("");
    requestAnswer(text);
  }

  function captureScreenshot() {
    const video = videoRef.current;

    if (!video || !video.videoWidth) {
      setNotice("Share a tab first to take a screenshot.");
      return;
    }

    const scale = Math.min(1, 1280 / video.videoWidth);
    const canvas = document.createElement("canvas");

    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);

    requestAnswer(
      "Answer the question shown in this screenshot.",
      canvas.toDataURL("image/jpeg", 0.8)
    );
  }

  /* ---------------- Speech to text (microphone) ---------------- */

  const addLine = useCallback((text: string) => {
    const id = ++idRef.current;

    setLines((previous) => [...previous, { id, text }]);
    transcriptCbRef.current?.(text);

    if (autoAnswerRef.current) {
      requestRef.current(text);
    }
  }, []);

  const stopListening = useCallback(() => {
    wantListeningRef.current = false;
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
    setInterim("");
  }, []);

  const startListening = useCallback(() => {
    const Ctor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!Ctor) {
      setNotice("Speech recognition works in Chrome or Edge only.");
      return;
    }

    const rec: RecognitionLike = new Ctor();

    rec.continuous = true;
    rec.interimResults = true;
    rec.lang =
      LANGUAGES.find((item) => item.value === langRef.current)?.code ??
      "en-US";

    rec.onresult = (event) => {
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = String(result[0].transcript).trim();

        if (result.isFinal) {
          if (text) addLine(text);
        } else {
          interimText += `${text} `;
        }
      }

      setInterim(interimText.trim());
    };

    rec.onerror = (event) => {
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        wantListeningRef.current = false;
        setListening(false);
        setNotice("Microphone permission was denied.");
      }
    };

    rec.onend = () => {
      if (wantListeningRef.current) {
        try {
          rec.start();
        } catch {
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };

    wantListeningRef.current = true;
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [addLine]);

  function toggleListening() {
    if (listening) stopListening();
    else startListening();
  }

  function changeLanguage(next: string) {
    setLang(next);
    langRef.current = next;

    if (listening) {
      stopListening();
      setTimeout(startListening, 250);
    }
  }

  function clearTranscript() {
    setLines([]);
    setInterim("");
  }

  /* ---------------- Exit / timer ---------------- */

  const exit = useCallback(() => {
    wantListeningRef.current = false;
    recRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    onExit();
  }, [onExit]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (remaining === 0) exit();
  }, [remaining, exit]);

  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      recRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function copyTranscript() {
    navigator.clipboard
      ?.writeText(lines.map((line) => line.text).join("\n"))
      .then(() => setNotice("Transcript copied."))
      .catch(() => setNotice("Unable to copy."));
    setMenuOpen(false);
  }

  const hasAudio = (stream?.getAudioTracks().length ?? 0) > 0;

  /* ---------------- Render ---------------- */

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#070E24] text-white lg:flex-row">
      {/* LEFT: shared tab + transcript */}

      <section className="flex min-h-0 flex-1 flex-col border-[#1C2B57] lg:border-r">
        <div
          ref={videoWrapRef}
          className="relative h-[46%] min-h-[200px] shrink-0 bg-black"
        >
          {stream ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <Monitor size={28} className="text-[#6B7BA8]" />
              <p className="text-[14px] text-[#8D9BC4]">
                Sharing stopped. Pick a tab to continue.
              </p>
            </div>
          )}

          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <button type="button" onClick={goFullscreen} className={ghostBtn}>
              <Maximize2 size={15} />
              Fullscreen
            </button>

            <button type="button" onClick={changeTab} className={ghostBtn}>
              <RefreshCw size={15} />
              Change tab
            </button>

            <button
              type="button"
              onClick={toggleTabAudio}
              disabled={!hasAudio}
              className={ghostBtn}
            >
              {audioOn ? <VolumeX size={15} /> : <Volume2 size={15} />}
              {audioOn ? "Stop tab audio" : "Start tab audio"}
            </button>
          </div>
        </div>

        {/* Controls */}

        <div className="flex shrink-0 items-center justify-between gap-3 border-y border-[#1C2B57] px-5 py-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleListening}
              className={`flex h-11 items-center gap-2 rounded-xl border px-4 text-[15px] font-medium transition ${
                listening
                  ? "border-[#2F5BFF] bg-[#16307A] text-white"
                  : "border-[#1F2F5E] bg-[#0C1738] text-[#DCE4FA] hover:bg-[#15275A]"
              }`}
            >
              {listening ? "Listening" : "Connect"}
              <Mic size={15} />
            </button>

            <button
              type="button"
              onClick={clearTranscript}
              className="flex h-11 items-center gap-2 rounded-xl border border-[#1F2F5E] bg-[#0C1738] px-4 text-[15px] font-medium text-[#DCE4FA] transition hover:bg-[#15275A]"
            >
              <X size={15} />
              Clear
            </button>
          </div>

          <div className="relative">
            <Globe
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C7D2F0]"
            />

            <select
              value={lang}
              onChange={(event) => changeLanguage(event.target.value)}
              className="h-11 appearance-none rounded-xl border border-[#1F2F5E] bg-[#0C1738] pl-10 pr-9 text-[15px] font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#4F7BFF]/40"
            >
              {LANGUAGES.map((item) => (
                <option key={item.value} value={item.value} className="text-black">
                  {item.label}
                </option>
              ))}
            </select>

            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8D9BC4]"
            />
          </div>
        </div>

        {/* Transcript */}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 text-[16px] leading-7">
          {lines.length === 0 && !interim ? (
            <p className="text-[#9AA8CF]">
              {listening ? "Listening..." : "Click Connect to start listening."}
            </p>
          ) : (
            <>
              {lines.map((line) => (
                <p key={line.id} className="mb-2 text-[#E4EAFB]">
                  {line.text}
                </p>
              ))}

              {interim && <p className="text-[#7F8FBA]">{interim}</p>}
            </>
          )}

          <div ref={transcriptEndRef} />
        </div>
      </section>

      {/* RIGHT: answers */}

      <section className="flex min-h-0 flex-1 flex-col">
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#1C2B57] px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2F5BFF] to-[#6D8BFF]">
              <Sparkles size={20} />
            </span>

            <span className="text-[18px] font-semibold">{title}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="flex h-10 items-center gap-2 rounded-xl border border-[#1F2F5E] bg-[#0C1738] px-4 text-[14px] text-[#9AA8CF]">
              <Clock size={14} />
              {formatTime(remaining)} ({planLabel})
            </span>

            <div className="relative">
              <button
                type="button"
                aria-label="More options"
                onClick={() => setMenuOpen((current) => !current)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1F2F5E] bg-[#0C1738] text-[#DCE4FA] transition hover:bg-[#15275A]"
              >
                <MoreVertical size={17} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 z-10 w-48 rounded-xl border border-[#1F2F5E] bg-[#0A1530] p-1 shadow-xl">
                  <button
                    type="button"
                    onClick={copyTranscript}
                    className="w-full rounded-lg px-3 py-2 text-left text-[14px] hover:bg-[#15275A]"
                  >
                    Copy transcript
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAnswers([]);
                      setMenuOpen(false);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-[14px] hover:bg-[#15275A]"
                  >
                    Clear answers
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={exit}
              className="flex h-10 items-center gap-2 rounded-xl bg-[#DC2626] px-4 text-[14px] font-semibold text-white transition hover:bg-[#EF4444]"
            >
              <LogOut size={15} />
              Exit
            </button>
          </div>
        </header>

        {/* Answers */}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {answers.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Sparkles size={26} className="text-[#C7D2F0]" />

              <p className="mt-3 text-[16px] font-semibold">No answers yet</p>

              <p className="mt-1.5 max-w-[320px] text-[14px] leading-6 text-[#8D9BC4]">
                Press Answer when a question is asked, or turn on Auto Answer.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {answers.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#1F2F5E] bg-[#0A1530] p-4"
                >
                  <p className="text-[13px] font-medium text-[#8D9BC4]">
                    {item.question}
                  </p>

                  {item.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt="Screenshot"
                      className="mt-3 max-h-40 rounded-lg border border-[#1F2F5E]"
                    />
                  )}

                  <p
                    className={`mt-3 whitespace-pre-wrap text-[15px] leading-6 ${
                      item.status === "error"
                        ? "text-[#FCA5A5]"
                        : "text-[#E4EAFB]"
                    }`}
                  >
                    {item.status === "loading" ? "Thinking..." : item.answer}
                  </p>
                </article>
              ))}

              <div ref={answersEndRef} />
            </div>
          )}
        </div>

        {/* Composer */}

        <div className="shrink-0 border-t border-[#1C2B57] px-5 pb-5 pt-4">
          {notice && (
            <p role="status" className="mb-3 text-[13px] text-[#9DB4FF]">
              {notice}
            </p>
          )}

          <button
            type="button"
            onClick={() => setAutoAnswer((current) => !current)}
            aria-pressed={autoAnswer}
            className="mb-3 flex h-10 items-center gap-2.5 rounded-xl border border-[#1F2F5E] bg-[#0C1738] px-4 text-[14px] font-medium text-[#C7D2F0] transition hover:bg-[#15275A]"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                autoAnswer ? "bg-[#22C55E]" : "bg-[#6B7BA8]"
              }`}
            />
            Auto Answer {autoAnswer ? "On" : "Off"}
          </button>

          <div className="flex items-center gap-2.5">
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a manual message..."
              className="h-12 min-w-0 flex-1 rounded-xl border border-[#1F2F5E] bg-[#0A1530] px-4 text-[15px] text-white placeholder:text-[#6B7BA8] focus:outline-none focus:ring-2 focus:ring-[#4F7BFF]/40"
            />

            <button
              type="button"
              aria-label="Capture screenshot"
              onClick={captureScreenshot}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#1F2F5E] bg-[#0C1738] text-[#DCE4FA] transition hover:bg-[#15275A]"
            >
              <ScanLine size={18} />
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={!message.trim()}
              className="h-12 rounded-xl border border-[#1F2F5E] bg-[#0C1738] px-5 text-[15px] font-medium text-[#DCE4FA] transition hover:bg-[#15275A] disabled:opacity-50"
            >
              Send
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleAnswerClick}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#E6EBFA] text-[15px] font-semibold text-[#0A1530] transition hover:bg-white"
            >
              <Sparkles size={16} />
              Answer
            </button>

            <button
              type="button"
              onClick={captureScreenshot}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#1F2F5E] bg-[#0C1738] text-[15px] font-semibold text-[#DCE4FA] transition hover:bg-[#15275A]"
            >
              <Monitor size={16} />
              Screenshot
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}