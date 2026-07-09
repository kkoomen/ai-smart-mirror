import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getSpeechLocale } from "../i18n/languages";
import { subscribeToSpeechActivity } from "../utils/speech";
import { setVoiceListenerState } from "../utils/voice-listener";

type VoiceRecognitionState = "idle" | "listening" | "thinking" | "confirmed" | "error";

type SpeechRecognitionResultEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  abort: () => void;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};

type UseSpeechRecognitionOptions = {
  autoListen?: boolean;
  disabled?: boolean;
  onCommand: (transcript: string) => Promise<void>;
  onTranscript?: (transcript: string) => void;
};

const getRecognitionCtor = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const speechWindow = window as WindowWithSpeechRecognition;
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
};

const SPEECH_RECOGNITION_RESUME_DELAY_MS = 2000;

export const useSpeechRecognition = ({
  autoListen = true,
  disabled = false,
  onCommand,
  onTranscript
}: UseSpeechRecognitionOptions) => {
  const { i18n, t } = useTranslation();
  const [voiceState, setVoiceState] = useState<VoiceRecognitionState>("idle");
  const [lastTranscript, setLastTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceStateRef = useRef<VoiceRecognitionState>("idle");
  const onCommandRef = useRef(onCommand);
  const onTranscriptRef = useRef(onTranscript);
  const userStoppedRef = useRef(false);
  const autoStartAttemptedRef = useRef(false);
  const isSpeechActiveRef = useRef(false);
  const speechWasActiveRef = useRef(false);
  const speechSuppressedUntilRef = useRef(0);

  const isRecognitionSuppressed = () =>
    isSpeechActiveRef.current || Date.now() < speechSuppressedUntilRef.current;

  const abortRecognition = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setVoiceListenerState({ isEnabled: false });
      return;
    }

    try {
      recognition.abort();
    } catch {
      try {
        recognition.stop();
      } catch {
        // Speech recognition can throw if already stopped.
      }
    }

    setVoiceListenerState({ isEnabled: false });
  };

  const submitTranscript = async (value: string) => {
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

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    onCommandRef.current = onCommand;
    onTranscriptRef.current = onTranscript;
  }, [onCommand, onTranscript]);

  useEffect(
    () =>
      subscribeToSpeechActivity((isSpeechActive) => {
        isSpeechActiveRef.current = isSpeechActive;

        if (isSpeechActive) {
          speechWasActiveRef.current = true;
          speechSuppressedUntilRef.current = Number.POSITIVE_INFINITY;
          abortRecognition();
          setVoiceState("idle");
          return;
        }

        if (!speechWasActiveRef.current) {
          return;
        }

        speechWasActiveRef.current = false;
        speechSuppressedUntilRef.current = Date.now() + SPEECH_RECOGNITION_RESUME_DELAY_MS;

        if (autoListen && !disabled && recognitionRef.current) {
          window.setTimeout(() => {
            if (!isRecognitionSuppressed() && recognitionRef.current && !userStoppedRef.current) {
              try {
                recognitionRef.current.start();
              } catch {
                // Browser speech APIs reject duplicate starts.
              }
            }
          }, SPEECH_RECOGNITION_RESUME_DELAY_MS);
        }
      }),
    [autoListen, disabled]
  );

  useEffect(() => {
    const Recognition = getRecognitionCtor();
    if (!Recognition) {
      setIsSupported(false);
      setVoiceListenerState({ isEnabled: false });
      return;
    }

    setIsSupported(true);

    const recognition = new Recognition();
    recognition.lang = getSpeechLocale(i18n.language);
    recognition.interimResults = false;
    recognition.continuous = false;

    const startRecognition = () => {
      if (disabled || isRecognitionSuppressed() || !recognitionRef.current) {
        return;
      }

      try {
        recognitionRef.current.start();
      } catch {
        // Browser speech APIs can reject duplicate starts; keep the UI stable.
      }
    };

    recognition.onstart = () => {
      if (isRecognitionSuppressed()) {
        abortRecognition();
        return;
      }

      setVoiceListenerState({ isEnabled: true });
      setErrorMessage("");
      setVoiceState("listening");
      userStoppedRef.current = false;
    };

    recognition.onresult = (event) => {
      if (isRecognitionSuppressed()) {
        setVoiceListenerState({ isEnabled: false });
        setVoiceState("idle");
        return;
      }

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
      if (isRecognitionSuppressed()) {
        setVoiceListenerState({ isEnabled: false });
        setVoiceState("idle");
        return;
      }

      setErrorMessage(t("voice.errors.speechFailed"));
      setVoiceState("error");
    };

    recognition.onend = () => {
      setVoiceListenerState({ isEnabled: false });

      if (autoListen && !disabled && !userStoppedRef.current && !isRecognitionSuppressed()) {
        window.setTimeout(() => {
          if (recognitionRef.current && !userStoppedRef.current && !isRecognitionSuppressed()) {
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
      abortRecognition();
      recognitionRef.current = null;
      autoStartAttemptedRef.current = false;
      setVoiceListenerState({ isEnabled: false });
    };
  }, [autoListen, disabled, i18n.language]);

  useEffect(() => {
    if (!autoListen || disabled) {
      setVoiceListenerState({ isEnabled: false });
    }
  }, [autoListen, disabled]);

  useEffect(() => {
    if (
      !autoListen ||
      disabled ||
      isRecognitionSuppressed() ||
      !isSupported ||
      !recognitionRef.current
    ) {
      return;
    }

    if (autoStartAttemptedRef.current) {
      return;
    }

    autoStartAttemptedRef.current = true;

    window.setTimeout(() => {
      if (recognitionRef.current && !userStoppedRef.current && !isRecognitionSuppressed()) {
        try {
          recognitionRef.current.start();
        } catch {
          // Auto-start can fail until the browser grants permission.
        }
      }
    }, 0);
  }, [autoListen, disabled, i18n.language, isSupported]);

  return {
    errorMessage,
    isSupported,
    lastTranscript,
    voiceState
  };
};
