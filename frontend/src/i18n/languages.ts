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

  const storedLanguage = window.localStorage.getItem(languageStorageKey);
  if (storedLanguage) {
    return normalizeLanguage(storedLanguage);
  }

  const browserLanguage = typeof window.navigator?.language === "string"
    ? window.navigator.language
    : null;

  if (browserLanguage) {
    return normalizeLanguage(browserLanguage);
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (typeof timezone === "string") {
    const normalizedTimezone = timezone.toLowerCase();

    if (
      normalizedTimezone.includes("shanghai") ||
      normalizedTimezone.includes("chongqing") ||
      normalizedTimezone.includes("hong_kong") ||
      normalizedTimezone.includes("taipei") ||
      normalizedTimezone.includes("macau") ||
      normalizedTimezone.includes("urumqi") ||
      normalizedTimezone.includes("harbin")
    ) {
      return "zh";
    }
  }

  return defaultLanguage;
};
