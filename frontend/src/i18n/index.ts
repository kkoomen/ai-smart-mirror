import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import zh from "./zh.json";
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY } from "../constants";
import { getStoredLanguage, normalizeLanguage } from "./languages";

const resources = {
  en: { translation: en },
  zh: { translation: zh }
} as const;

const initialLanguage = getStoredLanguage();

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: ["en", "zh"],
    interpolation: {
      escapeValue: false
    },
    returnNull: false
  });
}

i18n.on("languageChanged", (language) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizeLanguage(language));
  }
});

export default i18n;
