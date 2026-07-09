import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getSpeechLocale } from "../../i18n/languages";

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
  autoListen = true,
  onTranscript,
  visible = true
}) {
  const { i18n, t } = useTranslation();
  const [voiceState, setVoiceState] = useState("idle");
  const [lastTranscript, setLastTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);
  const voiceStateRef = useRef("idle");
  const onCommandRef = useRef(onCommand);
  const onTranscriptRef = useRef(onTranscript);
  const userStoppedRef = useRef(false);
  const autoStartAttemptedRef = useRef(false);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    onCommandRef.current = onCommand;
    onTranscriptRef.current = onTranscript;
  }, [onCommand, onTranscript]);

  useEffect(() => {
    const Recognition = getRecognitionCtor();
    if (!Recognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const recognition = new Recognition();
    recognition.lang = getSpeechLocale(i18n.language);
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
        setErrorMessage(t("voice.errors.noSpeech"));
        setVoiceState("error");
        return;
      }

      console.info("[Mirror voice] transcript detected:", transcript);
      setLastTranscript(transcript);
      onTranscriptRef.current?.(transcript);
      void submitTranscript(transcript);
    };

    recognition.onerror = () => {
      setErrorMessage(t("voice.errors.speechFailed"));
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
      autoStartAttemptedRef.current = false;
    };
  }, [autoListen, disabled, i18n.language]);

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
          // Auto-start can fail until the browser grants permission.
        }
      }
    }, 0);
  }, [autoListen, disabled, isSupported]);

  const submitTranscript = async (value) => {
    const transcript = value.trim();

    if (!transcript) {
      setErrorMessage(t("voice.errors.speakCommand"));
      setVoiceState("error");
      return;
    }

    console.info("[Mirror voice] command submitted:", transcript);
    setVoiceState("thinking");
    setErrorMessage("");
    setLastTranscript(transcript);
    onTranscriptRef.current?.(transcript);

    try {
      await onCommandRef.current(transcript);
      setVoiceState("confirmed");

      window.setTimeout(() => {
        if (voiceStateRef.current === "confirmed") {
          setVoiceState("idle");
        }
      }, 1200);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("voice.errors.commandFailed"));
      setVoiceState("error");
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <section className="flex w-full flex-col items-center gap-4">
      <div className="flex w-full max-w-2xl items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.55em] text-white/40">{t("voice.control")}</p>
        <span className="border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-white/70">
          {t(`voice.states.${voiceState}`)}
        </span>
      </div>

      <div className="w-full max-w-2xl space-y-3 text-center">
        <div className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80">
          {prompt}
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
            {t("voice.errors.notSupported")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
