import { getSpeechLocale, type AppLanguage } from "../i18n/languages";

const ENGLISH_VOICE_INDEX = 181;
const MANDARIN_VOICE_INDEX = 196;

let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeRequestId = 0;
let speechActiveCount = 0;
const speechActivityListeners = new Set<(isSpeaking: boolean) => void>();

const getSpeechSynthesis = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.speechSynthesis ?? null;
};

const getAvailableVoices = async () => {
  const synthesis = getSpeechSynthesis();
  if (!synthesis) {
    return [];
  }

  const voices = synthesis.getVoices();
  if (voices.length > 0) {
    return voices;
  }

  return await new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const timeoutId = window.setTimeout(() => resolve(synthesis.getVoices()), 1000);

    synthesis.onvoiceschanged = () => {
      window.clearTimeout(timeoutId);
      resolve(synthesis.getVoices());
    };
  });
};

const pickVoice = async (language: AppLanguage) => {
  const voices = await getAvailableVoices();
  return language === "zh" ? voices[MANDARIN_VOICE_INDEX] : voices[ENGLISH_VOICE_INDEX];
};

const emitSpeechActivity = () => {
  const isSpeaking = speechActiveCount > 0;
  speechActivityListeners.forEach((listener) => listener(isSpeaking));
};

const setSpeechActive = (isActive: boolean) => {
  const nextCount = Math.max(0, speechActiveCount + (isActive ? 1 : -1));
  if (speechActiveCount > 0 === nextCount > 0) {
    speechActiveCount = nextCount;
    return;
  }

  speechActiveCount = nextCount;
  emitSpeechActivity();
};

export const subscribeToSpeechActivity = (listener: (isSpeaking: boolean) => void) => {
  speechActivityListeners.add(listener);
  listener(speechActiveCount > 0);

  return () => {
    speechActivityListeners.delete(listener);
  };
};

const cleanupSpeech = () => {
  if (activeUtterance) {
    activeUtterance.onend = null;
    activeUtterance.onerror = null;
    activeUtterance = null;
  }

  speechActiveCount = 0;
  emitSpeechActivity();

  const synthesis = getSpeechSynthesis();
  synthesis?.cancel();
};

export const preloadSpeech = () => {
  void getAvailableVoices().catch((error) => {
    console.error("[Speech] preload failed", error);
  });
};

export const cancelSpeech = () => {
  activeRequestId += 1;
  cleanupSpeech();
};

export type SpeakTextOptions = {
  onEnd?: () => void;
  onError?: (event: SpeechSynthesisErrorEvent) => void;
};

export const speakText = async (
  text: string,
  language: AppLanguage = "en",
  interrupt = true,
  options: SpeakTextOptions = {}
) => {
  const trimmedText = text.trim();
  if (!trimmedText) {
    return;
  }

  const synthesis = getSpeechSynthesis();
  if (!synthesis) {
    return;
  }

  const requestId = ++activeRequestId;
  if (interrupt) {
    cleanupSpeech();
  }

  try {
    const utterance = new SpeechSynthesisUtterance(trimmedText);
    const voice = await pickVoice(language);

    if (requestId !== activeRequestId) {
      return;
    }

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || getSpeechLocale(language);
    }

    activeUtterance = utterance;
    setSpeechActive(true);

    const finishUtterance = () => {
      setSpeechActive(false);
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
    };

    utterance.onend = () => {
      options.onEnd?.();
      finishUtterance();
    };

    utterance.onerror = (event) => {
      options.onError?.(event);
      if (requestId === activeRequestId) {
        console.error("[Speech] playback failed", event.error);
      }
      finishUtterance();
    };

    synthesis.speak(utterance);
  } catch (error) {
    if (requestId === activeRequestId) {
      console.error("[Speech] speak failed", error);
      cleanupSpeech();
    }
  }
};
