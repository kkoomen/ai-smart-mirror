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
  const name = values.name ?? "John";

  if (language === "zh") {
    switch (key) {
      case "changeLanguagePrompt":
        return "说普通话或者英语。";
      case "languageChanged":
        return "语言已更新。";
      case "sayYourName":
        return "请说出你的名字。";
      case "startRegistration":
        return "说：开始注册，开始注册流程。";
      case "confirmName":
        return `你的名字是${name}吗？`;
      case "sayYesOrNo":
        return "请说：是或否。";
      case "scanningFace":
        return "正在扫描人脸。";
      case "lookAtMirror":
        return "请看着镜子。";
      case "hello":
        return `你好，${name}。`;
      default:
        return "";
    }
  }

  switch (key) {
    case "changeLanguagePrompt":
      return "Say Mandarin or English.";
    case "languageChanged":
      return "Language updated.";
    case "sayYourName":
      return "Say your name.";
    case "startRegistration":
      return "Say: start registration";
    case "confirmName":
      return `Is ${name} your name?`;
    case "sayYesOrNo":
      return "Say yes or no.";
    case "scanningFace":
      return "Scanning face.";
    case "lookAtMirror":
      return "Look at the mirror.";
    case "hello":
      return `Hello, ${name}.`;
    default:
      return "";
  }
};
