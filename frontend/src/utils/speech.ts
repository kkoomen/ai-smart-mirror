import { getSpeechLocale, type AppLanguage } from "../i18n/languages";

const ENGLISH_VOICE_INDEX = 181;
const MANDARIN_VOICE_INDEX = 196;

let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeRequestId = 0;

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

const cleanupSpeech = () => {
  if (activeUtterance) {
    activeUtterance.onend = null;
    activeUtterance.onerror = null;
    activeUtterance = null;
  }

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

    utterance.onend = () => {
      options.onEnd?.();
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
    };

    utterance.onerror = (event) => {
      options.onError?.(event);
      if (requestId === activeRequestId) {
        console.error("[Speech] playback failed", event.error);
      }
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
    };

    synthesis.speak(utterance);
  } catch (error) {
    if (requestId === activeRequestId) {
      console.error("[Speech] speak failed", error);
      cleanupSpeech();
    }
  }
};
