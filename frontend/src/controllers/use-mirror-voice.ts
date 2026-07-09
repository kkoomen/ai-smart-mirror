import { classifyVoiceCommand } from "../api/voice";
import i18n from "../i18n";
import { normalizeLanguage, type AppLanguage } from "../i18n/languages";
import type { VoiceCommandRequest } from "../types/api";
import type { MirrorVoiceOptions } from "../types/mirror-controller";
import type { VoiceCommandResponse } from "../types/voice";
import { getSpeechPrompt } from "../utils/speech-prompts";

type CreateMirrorVoiceHandlerOptions = MirrorVoiceOptions & {
  currentLanguage: AppLanguage;
  classifyCommand?: (payload: VoiceCommandRequest) => Promise<VoiceCommandResponse>;
};

export const resolveTargetLanguage = (
  spokenText: string,
  intent: VoiceCommandResponse["intent"]
) => {
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

  if (normalized.includes("english") || normalized.includes("eng") || normalized.includes("英语")) {
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

export const createMirrorVoiceHandler = ({
  phase,
  registeredUser,
  mirrorActions,
  registrationActions,
  languageActions,
  clearDashboardPresenceTimer,
  startRegistration,
  createUserAndConfirm,
  capturedName,
  hasRegisteredUsers,
  speakText,
  currentLanguage,
  classifyCommand = classifyVoiceCommand
}: CreateMirrorVoiceHandlerOptions) => {
  return async (spokenText: string) => {
    console.info("[Mirror voice] handling command:", spokenText.toLowerCase());

    const command = await classifyCommand({
      transcript: spokenText,
      phase,
      userId: registeredUser?.id ?? null,
      language: currentLanguage
    } satisfies VoiceCommandRequest);

    if (command.intent === "SLEEP_MIRROR") {
      if (phase === "idle") {
        mirrorActions.sleep();
        return;
      }

      clearDashboardPresenceTimer();
      mirrorActions.fadeOut();
      return;
    }

    if (command.intent === "WAKE_MIRROR") {
      mirrorActions.wake();
      return;
    }

    if (command.intent === "START_REGISTRATION") {
      await startRegistration();
      return;
    }

    if (command.intent === "CHANGE_LANGUAGE") {
      if (!hasRegisteredUsers || !registeredUser || (phase !== "hello" && phase !== "dashboard")) {
        mirrorActions.setStatus({ key: "status.notUnderstood" });
        return;
      }

      mirrorActions.openLanguageChange();
      void speakText(getSpeechPrompt("changeLanguagePrompt", currentLanguage), currentLanguage);
      return;
    }

    if (phase === "changeLanguage") {
      const targetLanguage = resolveTargetLanguage(spokenText, command.intent);

      if (!targetLanguage) {
        mirrorActions.setStatus({ key: "status.changeLanguagePrompt" });
        return;
      }

      languageActions.beginChange(targetLanguage);
      return;
    }

    if (phase === "idle" || phase === "waking" || phase === "hello") {
      return;
    }

    if (phase === "name") {
      if (command.intent !== "PROVIDE_NAME" || !command.name) {
        mirrorActions.setStatus({ key: "status.sayYourName" });
        void speakText(getSpeechPrompt("sayYourName", currentLanguage), currentLanguage);
        return;
      }

      registrationActions.captureName(command.name);
      void speakText(
        getSpeechPrompt("confirmName", currentLanguage, { name: command.name }),
        currentLanguage
      );
      return;
    }

    if (phase === "nameConfirm") {
      if (command.intent === "CONFIRM_NO") {
        registrationActions.rejectName();
        void speakText(getSpeechPrompt("sayYourName", currentLanguage), currentLanguage);
        return;
      }

      if (command.intent !== "CONFIRM_YES") {
        mirrorActions.setStatus({ key: "status.sayYesOrNo" });
        void speakText(getSpeechPrompt("sayYesOrNo", currentLanguage), currentLanguage);
        return;
      }

      registrationActions.startScan();
      void speakText(getSpeechPrompt("scanningFace", currentLanguage), currentLanguage);
      return;
    }

    if (phase === "scan") {
      mirrorActions.setStatus({ key: "status.lookAtMirror" });
      void speakText(getSpeechPrompt("lookAtMirror", currentLanguage), currentLanguage);
      return;
    }

    if (phase === "confirm") {
      if (command.intent === "CONFIRM_NO") {
        await startRegistration();
        return;
      }

      if (command.intent !== "CONFIRM_YES") {
        mirrorActions.setStatus({ key: "status.sayYesOrNo" });
        void speakText(getSpeechPrompt("sayYesOrNo", currentLanguage), currentLanguage);
        return;
      }

      await createUserAndConfirm(capturedName || command.name || "John");
      return;
    }

    if (phase === "dashboard") {
      if (command.intent === "GET_AGENDA") {
        mirrorActions.setStatus({ key: "status.todayAgenda" });
        return;
      }

      if (command.intent === "GET_WEATHER") {
        mirrorActions.setStatus({ key: "status.weatherShown" });
        return;
      }

      mirrorActions.setStatus({ key: "status.notUnderstood" });
      return;
    }

    if (phase === "unknown") {
      mirrorActions.setStatus({ key: "status.voiceStartRegistration" });
    }
  };
};

export const useMirrorVoice = (options: MirrorVoiceOptions) => {
  const currentLanguage = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);

  return createMirrorVoiceHandler({
    ...options,
    currentLanguage
  });
};
