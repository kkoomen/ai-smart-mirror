import { defaultLanguage, languageStorageKey } from "../constants";

export const supportedLanguages = [
  {
    code: "en",
    speechLocale: "en-US",
    labelKey: "languages.english"
  },
  {
    code: "zh",
    speechLocale: "zh-CN",
    labelKey: "languages.mandarin"
  }
] as const;

export type AppLanguage = (typeof supportedLanguages)[number]["code"];

export const isSupportedLanguage = (value: string): value is AppLanguage =>
  supportedLanguages.some((language) => language.code === value);

export const normalizeLanguage = (value: string | undefined | null): AppLanguage => {
  if (!value) {
    return defaultLanguage;
  }

  const lowerCased = value.trim().toLowerCase();
  if (lowerCased.startsWith("zh")) {
    return "zh";
  }

  return isSupportedLanguage(lowerCased) ? lowerCased : defaultLanguage;
};

export const getSpeechLocale = (value: string | undefined | null) => {
  const language = normalizeLanguage(value);
  return supportedLanguages.find((entry) => entry.code === language)?.speechLocale ?? "en-US";
};

export const getStoredLanguage = () => {
  if (typeof window === "undefined") {
    return defaultLanguage;
  }

  return normalizeLanguage(window.localStorage.getItem(languageStorageKey));
};
