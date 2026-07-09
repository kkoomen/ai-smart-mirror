import type { MirrorVoiceOptions } from "../../types/mirror-controller";
import type { VoiceCommandResponse } from "../../types/voice";
import i18n from "../../i18n";
import { normalizeLanguage } from "../../i18n/languages";
import { requestJson } from "../../utils/request-json";
import { getSpeechPrompt } from "../../utils/speech-prompts";
import type { VoiceCommandRequest } from "../../types/api";

export const useMirrorVoice = ({
  phase,
  registeredUser,
  wakeMirror,
  sleepMirror,
  clearDashboardPresenceTimer,
  startRegistration,
  createUserAndConfirm,
  browserFaceService,
  navigate,
  setPhase,
  setStatusText,
  setMirrorFadingOut,
  setCapturedName,
  setCapturedFaceLabel,
  setCapturedFaceDescriptor,
  setProgress,
  setScanFaceVisible,
  registrationCompletingRef,
  capturedName,
  hasRegisteredUsers,
  persistUserLanguage,
  speakText
}: MirrorVoiceOptions) => {
  const currentLanguage = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);

  const resolveTargetLanguage = (spokenText: string, intent: VoiceCommandResponse["intent"]) => {
    if (intent === "SET_LANGUAGE_EN") {
      return "en";
    }

    if (intent === "SET_LANGUAGE_ZH") {
      return "zh";
    }

    const normalized = spokenText.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    if (
      normalized.includes("english") ||
      normalized.includes("eng") ||
      normalized.includes("英语")
    ) {
      return "en";
    }

    if (
      normalized.includes("mandarin") ||
      normalized.includes("chinese") ||
      normalized.includes("普通话") ||
      normalized.includes("中文")
    ) {
      return "zh";
    }

    return null;
  };

  return async (spokenText: string) => {
    console.info("[Mirror voice] handling command:", spokenText.toLowerCase());

    const command = await requestJson<VoiceCommandResponse>("/api/voice/command", {
      method: "POST",
      body: JSON.stringify({
        transcript: spokenText,
        phase,
        userId: registeredUser?.id ?? null,
        language: currentLanguage
      } satisfies VoiceCommandRequest)
    });

    if (command.intent === "SLEEP_MIRROR") {
      if (phase === "idle") {
        sleepMirror();
        return;
      }

      clearDashboardPresenceTimer();
      setMirrorFadingOut(true);
      return;
    }

    if (command.intent === "WAKE_MIRROR") {
      wakeMirror();
      return;
    }

    if (command.intent === "START_REGISTRATION") {
      navigate("/register");
      await startRegistration();
      return;
    }

    if (command.intent === "CHANGE_LANGUAGE") {
      if (!hasRegisteredUsers || !registeredUser || (phase !== "hello" && phase !== "dashboard")) {
        setStatusText({ key: "status.notUnderstood" });
        return;
      }

      navigate("/change-lang");
      setPhase("changeLanguage");
      setStatusText({ key: "status.changeLanguagePrompt" });
      void speakText(getSpeechPrompt("changeLanguagePrompt", currentLanguage), currentLanguage);
      return;
    }

    if (phase === "changeLanguage") {
      const targetLanguage = resolveTargetLanguage(spokenText, command.intent);

      if (!targetLanguage) {
        setStatusText({ key: "status.changeLanguagePrompt" });
        return;
      }

      await i18n.changeLanguage(targetLanguage);
      await persistUserLanguage(targetLanguage);
      setPhase("dashboard");
      setStatusText({ key: "status.languageChanged" });
      void speakText(getSpeechPrompt("languageChanged", targetLanguage), targetLanguage);
      navigate("/");
      return;
    }

    if (phase === "idle" || phase === "waking" || phase === "hello") {
      return;
    }

    if (phase === "name") {
      if (command.intent !== "PROVIDE_NAME" || !command.name) {
        setStatusText({ key: "status.sayYourName" });
        void speakText(getSpeechPrompt("sayYourName", currentLanguage), currentLanguage);
        return;
      }

      setCapturedName(command.name);
      setCapturedFaceLabel(browserFaceService.generateFaceLabel(command.name));
      setPhase("nameConfirm");
      setStatusText({ key: "status.sayYesOrNo" });
      void speakText(getSpeechPrompt("confirmName", currentLanguage, { name: command.name }), currentLanguage);
      return;
    }

    if (phase === "nameConfirm") {
      if (command.intent === "CONFIRM_NO") {
        setCapturedName("");
        setCapturedFaceLabel(null);
        setCapturedFaceDescriptor(null);
        setPhase("name");
        setStatusText({ key: "status.sayYourName" });
        void speakText(getSpeechPrompt("sayYourName", currentLanguage), currentLanguage);
        return;
      }

      if (command.intent !== "CONFIRM_YES") {
        setStatusText({ key: "status.sayYesOrNo" });
        void speakText(getSpeechPrompt("sayYesOrNo", currentLanguage), currentLanguage);
        return;
      }

      setCapturedFaceDescriptor(null);
      setProgress(0);
      setScanFaceVisible(false);
      registrationCompletingRef.current = false;
      setPhase("scan");
      setStatusText({ key: "status.lookAtMirror" });
      void speakText(getSpeechPrompt("scanningFace", currentLanguage), currentLanguage);
      return;
    }

    if (phase === "scan") {
      setStatusText({ key: "status.lookAtMirror" });
      void speakText(getSpeechPrompt("lookAtMirror", currentLanguage), currentLanguage);
      return;
    }

    if (phase === "confirm") {
      if (command.intent === "CONFIRM_NO") {
        await startRegistration();
        return;
      }

      if (command.intent !== "CONFIRM_YES") {
        setStatusText({ key: "status.sayYesOrNo" });
        void speakText(getSpeechPrompt("sayYesOrNo", currentLanguage), currentLanguage);
        return;
      }

      await createUserAndConfirm(capturedName || command.name || "John");
      return;
    }

    if (phase === "dashboard") {
      if (command.intent === "GET_AGENDA") {
        setStatusText({ key: "status.todayAgenda" });
        return;
      }

      if (command.intent === "GET_WEATHER") {
        setStatusText({ key: "status.weatherShown" });
        return;
      }

      setStatusText({ key: "status.notUnderstood" });
      return;
    }

    if (phase === "unknown") {
      setStatusText({ key: "status.voiceStartRegistration" });
    }
  };
};
