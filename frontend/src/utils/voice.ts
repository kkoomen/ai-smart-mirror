import i18n from "../i18n";
import type { AppLanguage } from "../i18n/languages";

const normalize = (value: string) => value.trim().toLowerCase();

const getPhrases = (
  key: "wake" | "sleep" | "startRegistration" | "changeLanguage" | "yes" | "no" | "umbrella"
) => {
  const phrases = i18n.t(`voice.phrases.${key}`, { returnObjects: true });

  if (!Array.isArray(phrases)) {
    return [];
  }

  return phrases
    .filter((phrase): phrase is string => typeof phrase === "string")
    .map((phrase) => normalize(phrase));
};

const includesPhrase = (value: string, phrases: string[]) => {
  const text = normalize(value);
  return phrases.some((phrase) => text.includes(phrase));
};

export const isWakePhrase = (value: string) => includesPhrase(value, getPhrases("wake"));

export const isSleepPhrase = (value: string) => includesPhrase(value, getPhrases("sleep"));

export const isStartRegistrationPhrase = (value: string) =>
  includesPhrase(value, getPhrases("startRegistration"));

export const isUmbrellaPhrase = (value: string) => includesPhrase(value, getPhrases("umbrella"));

export const isChangeLanguagePhrase = (value: string) =>
  includesPhrase(value, getPhrases("changeLanguage"));

export const resolveLanguageSelection = (
  value: string,
  currentLanguage: AppLanguage
): AppLanguage | null => {
  const text = normalize(value);

  if (currentLanguage === "en") {
    if (
      text.includes("mandarin") ||
      text.includes("chinese") ||
      text.includes("普通话") ||
      text.includes("中文")
    ) {
      return "zh";
    }

    if (text.includes("english") || text.includes("英语") || text.includes("英文")) {
      return "en";
    }
  }

  if (
    text.includes("english") ||
    text.includes("英语") ||
    text.includes("英文") ||
    text.includes("eng")
  ) {
    return "en";
  }

  if (
    text.includes("mandarin") ||
    text.includes("chinese") ||
    text.includes("普通话") ||
    text.includes("中文") ||
    text.includes("汉语")
  ) {
    return "zh";
  }

  return null;
};
