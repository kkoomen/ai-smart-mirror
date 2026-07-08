import { useEffect, useRef, useState } from "react";

const getRecognitionCtor = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

export default function VoiceControl({
  prompt,
  onCommand,
  helperText,
  disabled = false,
  autoListen = true
}) {
  const [draft, setDraft] = useState("");
  const [voiceState, setVoiceState] = useState("idle");
  const [lastTranscript, setLastTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);
  const voiceStateRef = useRef("idle");
  const userStoppedRef = useRef(false);
  const autoStartAttemptedRef = useRef(false);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    const Recognition = getRecognitionCtor();
    if (!Recognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    const startRecognition = () => {
      if (disabled || !recognitionRef.current) {
        return;
      }

      try {
        recognitionRef.current.start();
      } catch {
        // Browser speech APIs can reject duplicate starts; keep the UI stable.
      }
    };

    recognition.onstart = () => {
      setErrorMessage("");
      setVoiceState("listening");
      userStoppedRef.current = false;
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (!transcript) {
        setErrorMessage("No speech detected.");
        setVoiceState("error");
        return;
      }

      setDraft(transcript);
      setLastTranscript(transcript);
      void submitTranscript(transcript);
    };

    recognition.onerror = () => {
      setErrorMessage("Speech recognition failed.");
      setVoiceState("error");
    };

    recognition.onend = () => {
      if (autoListen && !disabled && !userStoppedRef.current) {
        window.setTimeout(() => {
          if (voiceStateRef.current !== "thinking" && recognitionRef.current && !userStoppedRef.current) {
            startRecognition();
          }
        }, 250);
        return;
      }

      if (voiceStateRef.current === "listening") {
        setVoiceState("idle");
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [autoListen, disabled]);

  useEffect(() => {
    if (!autoListen || disabled || !isSupported || !recognitionRef.current) {
      return;
    }

    if (autoStartAttemptedRef.current) {
      return;
    }

    autoStartAttemptedRef.current = true;

    window.setTimeout(() => {
      if (recognitionRef.current && !userStoppedRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // Auto-start can fail until the browser grants permission; the manual button still works.
        }
      }
    }, 0);
  }, [autoListen, disabled, isSupported]);

  const submitTranscript = async (value) => {
    const transcript = value.trim();

    if (!transcript) {
      setErrorMessage("Type or speak a command first.");
      setVoiceState("error");
      return;
    }

    setVoiceState("thinking");
    setErrorMessage("");
    setLastTranscript(transcript);

    try {
      await onCommand(transcript);
      setVoiceState("confirmed");
      setDraft("");

      window.setTimeout(() => {
        if (voiceStateRef.current === "confirmed") {
          setVoiceState("idle");
        }
      }, 1200);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Command failed.");
      setVoiceState("error");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (disabled) {
      return;
    }

    await submitTranscript(draft);
  };

  const handleListen = () => {
    if (disabled || !isSupported || !recognitionRef.current) {
      setErrorMessage(
        !isSupported
          ? "Web Speech API is not available in this browser."
          : "Voice control is disabled right now."
      );
      setVoiceState("error");
      return;
    }

    if (voiceState === "listening") {
      userStoppedRef.current = true;
      recognitionRef.current.stop();
      setVoiceState("idle");
      return;
    }

    userStoppedRef.current = false;
    recognitionRef.current.start();
  };

  return (
    <section className="flex w-full flex-col items-center gap-4">
      <div className="flex w-full max-w-2xl items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.55em] text-white/40">voice control</p>
        <span className="border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-white/70">
          {voiceState}
        </span>
      </div>

      <div className="w-full max-w-2xl space-y-3 text-center">
        <div className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80">
          {prompt}
        </div>
        <div className="border border-white/15 px-4 py-4 text-left text-sm uppercase tracking-[0.2em] text-white/80">
          {lastTranscript ? `Transcript: ${lastTranscript}` : "Transcript will appear here."}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="flex-1 border border-white/20 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 disabled:cursor-not-allowed"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type the voice command or spoken phrase"
            disabled={disabled || voiceState === "thinking"}
          />
          <button
            type="button"
            onClick={handleListen}
            className="border border-white px-5 py-3 text-xs uppercase tracking-[0.35em] text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:border-white/25 disabled:text-white/35 disabled:hover:bg-black disabled:hover:text-white"
            disabled={disabled || !isSupported}
          >
            {voiceState === "listening" ? "Stop" : "Listen"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="border border-white px-5 py-3 text-xs uppercase tracking-[0.35em] text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:border-white/25 disabled:text-white/35 disabled:hover:bg-black disabled:hover:text-white"
            disabled={disabled || voiceState === "thinking"}
          >
            Send
          </button>
        </div>
        <p className="text-xs uppercase tracking-[0.25em] text-white/45">
          {helperText}
        </p>
        {errorMessage ? (
          <p className="text-xs uppercase tracking-[0.25em] text-white/60">
            {errorMessage}
          </p>
        ) : null}
        {!isSupported ? (
          <p className="text-xs uppercase tracking-[0.25em] text-white/40">
            Voice input uses typed fallback in this browser.
          </p>
        ) : null}
      </div>
    </section>
  );
}
