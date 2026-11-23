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

export type TranscribeRequest = {
  audio: string;
  mimeType: string;
  language: string;
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
  /** Send a tab-audio chunk to speech-to-text. Return the transcript text. */
  onTranscribeAudio?: (request: TranscribeRequest) => Promise<string>;
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

/* Tab audio is cut into chunks of this length and sent to the backend. */
const CHUNK_MS = 8000;
/* Chunks quieter than this (0-128 scale) are treated as silence and skipped. */
const SILENCE_THRESHOLD = 8;

const QUESTION_RE =
  /\?|(^|[.!]\s+)(what|why|how|when|where|who|which|can|could|do|does|did|is|are|will|would|should|have|has|tell me|explain|describe|walk me|give me|difference)\b/i;

function looksLikeQuestion(text: string) {
  return text.trim().length > 6 && QUESTION_RE.test(text.trim());
}

function formatTime(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || "");
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(new Error("Unable to read audio."));
    reader.readAsDataURL(blob);
  });
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
  onTranscribeAudio,
  onTranscriptLine,
  onExit,
}: Props) {
  const [stream, setStream] = useState<MediaStream | null>(initialStream);
  const [audioOn, setAudioOn] = useState(true);
  const [lang, setLang] = useState(language);
  const [remaining, setRemaining] = useState(durationSeconds);

  const [listening, setListening] = useState(false);
  const [tabListening, setTabListening] = useState(false);
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
  const tabCleanupRef = useRef<(() => void) | null>(null);
  const idRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(initialStream);
  const linesRef = useRef<Line[]>([]);
  const autoAnswerRef = useRef(autoAnswer);
  const langRef = useRef(lang);
  const requestRef = useRef<(q: string, image?: string) => void>(() => {});
  const transcriptCbRef = useRef(onTranscriptLine);
  transcriptCbRef.current = onTranscriptLine;
  const transcribeRef = useRef(onTranscribeAudio);
  transcribeRef.current = onTranscribeAudio;
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
    const timer = setTimeout(() => setNotice(""), 5000);
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
    const handleEnded = () => {
      tabCleanupRef.current?.();
      setStream(null);
    };

    track?.addEventListener("ended", handleEnded);

    return () => track?.removeEventListener("ended", handleEnded);
  }, [stream]);

  // Warn once if the shared stream has no audio.
  useEffect(() => {
    if (stream && stream.getAudioTracks().length === 0) {
      setNotice(
        'No tab audio was shared. Click "Change tab", pick a Chrome Tab and tick "Also share tab audio".'
      );
    }
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

      tabCleanupRef.current?.();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setAudioOn(true);
      setStream(next);

      if (next.getAudioTracks().length > 0) {
        setNotice('Tab audio shared. Click "Connect" to start listening.');
      }
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

  /* ---------------- Transcript lines ---------------- */

  const addLine = useCallback((text: string) => {
    const id = ++idRef.current;

    setLines((previous) => [...previous, { id, text }]);
    transcriptCbRef.current?.(text);

    if (autoAnswerRef.current && looksLikeQuestion(text)) {
      requestRef.current(text);
    }
  }, []);

  /* ---------------- Tab audio -> speech to text ---------------- */

  const sendChunk = useCallback(
    async (blob: Blob, mime: string) => {
      const transcribe = transcribeRef.current;
      if (!transcribe) return;

      try {
        setInterim("Transcribing...");
        const audio = await blobToBase64(blob);
        const text = (
          await transcribe({
            audio,
            mimeType: mime.split(";")[0],
            language: langRef.current,
          })
        ).trim();

        if (text) addLine(text);
      } catch {
        /* skip this chunk, the next one will continue */
      } finally {
        setInterim("");
      }
    },
    [addLine]
  );

  const startTabTranscription = useCallback(() => {
    const audioTrack = streamRef.current?.getAudioTracks()[0];

    if (!audioTrack) {
      setNotice(
        'No tab audio. Click "Change tab", pick a Chrome Tab and tick "Also share tab audio".'
      );
      return false;
    }

    if (typeof MediaRecorder === "undefined") {
      setNotice("Audio recording is not supported in this browser.");
      return false;
    }

    const mime = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
    ].find((type) => MediaRecorder.isTypeSupported(type));

    if (!mime) {
      setNotice("This browser cannot record tab audio. Use Chrome or Edge.");
      return false;
    }

    tabCleanupRef.current?.();

    const audioStream = new MediaStream([audioTrack]);

    // Simple volume meter so silent chunks are not sent.
    const AudioCtx =
      window.AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new AudioCtx();
    const source = ctx.createMediaStreamSource(audioStream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);

    const buffer = new Uint8Array(analyser.fftSize);
    let peak = 0;

    const meter = setInterval(() => {
      analyser.getByteTimeDomainData(buffer);
      for (let i = 0; i < buffer.length; i++) {
        const diff = Math.abs(buffer[i] - 128);
        if (diff > peak) peak = diff;
      }
    }, 80);

    let active = true;
    let recorder: MediaRecorder | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Each chunk is a separate, complete audio file.
    const cycle = () => {
      if (!active) return;

      const parts: Blob[] = [];
      let heard = 0;
      const rec = new MediaRecorder(audioStream, { mimeType: mime });

      recorder = rec;
      peak = 0;

      rec.ondataavailable = (event) => {
        if (event.data.size > 0) parts.push(event.data);
      };

      rec.onstop = () => {
        const blob = new Blob(parts, { type: mime });

        if (heard > SILENCE_THRESHOLD && blob.size > 1500) {
          void sendChunk(blob, mime);
        }
      };

      rec.start();

      timer = setTimeout(() => {
        heard = peak;
        if (rec.state === "recording") rec.stop();
        cycle();
      }, CHUNK_MS);
    };

    tabCleanupRef.current = () => {
      active = false;
      clearInterval(meter);
      if (timer) clearTimeout(timer);

      try {
        if (recorder && recorder.state === "recording") recorder.stop();
      } catch {
        /* already stopped */
      }

      ctx.close().catch(() => {});
      tabCleanupRef.current = null;
      setTabListening(false);
      setListening(false);
      setInterim("");
    };

    cycle();
    setTabListening(true);
    setListening(true);

    return true;
  }, [sendChunk]);

  /* ---------------- Microphone speech to text ---------------- */

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
      const error = String(event.error || "");

      // Harmless: silence or a normal stop.
      if (error === "no-speech" || error === "aborted") return;

      wantListeningRef.current = false;
      setListening(false);

      if (error === "not-allowed" || error === "service-not-allowed") {
        setNotice(
          "Microphone permission was denied. Allow the mic in the browser address bar."
        );
      } else if (error === "audio-capture") {
        setNotice("No microphone found, or another app is using it.");
      } else if (error === "network") {
        setNotice(
          "Speech service could not be reached. Check your internet connection and try again."
        );
      } else {
        setNotice(`Speech recognition error: ${error || "unknown"}.`);
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

    try {
      rec.start();
      setListening(true);
    } catch {
      wantListeningRef.current = false;
      setListening(false);
      setNotice("Could not start the microphone. Please try again.");
    }
  }, [addLine]);

 function toggleListening() {
  if (listening) {
    tabCleanupRef.current?.();
    stopListening();
    return;
  }

  if (hasAudio) {
    stopListening();
    startTabTranscription();
  } else {
    startListening();
  }
}
    

  function changeLanguage(next: string) {
    setLang(next);
    langRef.current = next;

    // Tab audio reads the language on every chunk. Only the mic must restart.
    if (listening && !tabCleanupRef.current) {
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
    tabCleanupRef.current?.();
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
      tabCleanupRef.current?.();
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
              title={
                hasAudio
                  ? undefined
                  : 'No tab audio shared. Use "Change tab" and tick "Also share tab audio".'
              }
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
              {listening
                ? tabListening
                  ? "Listening to tab"
                  : "Listening"
                : "Connect"}
              {tabListening ? <Volume2 size={15} /> : <Mic size={15} />}
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
            <div className="text-[#9AA8CF]">
              <p>
                {listening
                  ? tabListening
                    ? "Listening to the shared tab..."
                    : "Listening..."
                  : "Click Connect to start listening."}
              </p>

              {stream && !hasAudio && (
                <p className="mt-2 text-[14px] text-[#F5C26B]">
                  Tab audio is not shared, so Connect will use your microphone.
                  To capture the other person, click &quot;Change tab&quot;,
                  pick a Chrome Tab and tick &quot;Also share tab audio&quot;.
                </p>
              )}
            </div>
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