import i18n from "../i18n";
import type { AppLanguage } from "../i18n/languages";

type SpeechPromptKey =
  | "changeLanguagePrompt"
  | "languageChanged"
  | "sayYourName"
  | "startRegistration"
  | "confirmName"
  | "sayYesOrNo"
  | "scanningFace"
  | "lookAtMirror"
  | "hello";

export const getSpeechPrompt = (
  key: SpeechPromptKey,
  language: AppLanguage,
  values: Record<string, string> = {}
) => {
  return i18n.t(`speechPrompts.${key}`, {
    lng: language,
    ...values
  });
};
