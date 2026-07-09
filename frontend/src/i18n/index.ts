import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import zh from "./zh.json";
import { defaultLanguage, languageStorageKey } from "../constants";
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
    fallbackLng: defaultLanguage,
    supportedLngs: ["en", "zh"],
    interpolation: {
      escapeValue: false
    },
    returnNull: false
  });
}

i18n.on("languageChanged", (language) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(languageStorageKey, normalizeLanguage(language));
  }
});

export default i18n;
