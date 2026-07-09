import type { MirrorVoiceOptions } from "../../types/mirror-controller";
import type { VoiceCommandResponse } from "../../types/voice";
import i18n from "../../i18n";
import { normalizeLanguage } from "../../i18n/languages";
import {
  isChangeLanguagePhrase,
  isSleepPhrase,
  isStartRegistrationPhrase,
  isUmbrellaPhrase,
  isWakePhrase,
  resolveLanguageSelection
} from "../../utils/voice";
import { requestJson } from "../../utils/request-json";
import type { VoiceCommandRequest } from "../../types/api";

export const useMirrorVoice = ({
  phase,
  registeredUser,
  weather,
  wakeMirror,
  sleepMirror,
  clearDashboardPresenceTimer,
  startRegistration,
  createUserAndConfirm,
  getUmbrellaAnswer,
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
  persistUserLanguage
}: MirrorVoiceOptions) => {
  const currentLanguage = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);

  return async (spokenText: string) => {
    const normalizedSpeech = spokenText.toLowerCase();
    console.info("[Mirror voice] handling command:", normalizedSpeech);

    if (isSleepPhrase(normalizedSpeech)) {
      if (phase === "idle") {
        sleepMirror();
        return;
      }

      clearDashboardPresenceTimer();
      setMirrorFadingOut(true);
      return;
    }

    if (isWakePhrase(normalizedSpeech)) {
      wakeMirror();
      return;
    }

    if (isStartRegistrationPhrase(normalizedSpeech)) {
      navigate("/register");
      await startRegistration();
      return;
    }

    if (
      hasRegisteredUsers &&
      registeredUser &&
      (phase === "hello" || phase === "dashboard") &&
      isChangeLanguagePhrase(normalizedSpeech)
    ) {
      navigate("/change-lang");
      setPhase("changeLanguage");
      setStatusText({ key: "status.changeLanguagePrompt" });
      return;
    }

    if (phase === "changeLanguage") {
      const targetLanguage = resolveLanguageSelection(normalizedSpeech, currentLanguage);

      if (!targetLanguage) {
        setStatusText({ key: "status.changeLanguagePrompt" });
        return;
      }

      await i18n.changeLanguage(targetLanguage);
      await persistUserLanguage(targetLanguage);
      setPhase("dashboard");
      setStatusText({ key: "status.languageChanged" });
      navigate("/");
      return;
    }

    if (phase === "idle" || phase === "waking" || phase === "hello") {
      return;
    }

    const command = await requestJson<VoiceCommandResponse>("/api/voice/command", {
      method: "POST",
      body: JSON.stringify({
        transcript: spokenText,
        phase,
        userId: registeredUser?.id ?? null,
        language: currentLanguage
      } satisfies VoiceCommandRequest)
    });

    if (phase === "name") {
      if (command.intent !== "PROVIDE_NAME" || !command.name) {
        setStatusText({ key: "status.sayYourName" });
        return;
      }

      setCapturedName(command.name);
      setCapturedFaceLabel(browserFaceService.generateFaceLabel(command.name));
      setPhase("nameConfirm");
      setStatusText({ key: "status.sayYesOrNo" });
      return;
    }

    if (phase === "nameConfirm") {
      if (command.intent === "CONFIRM_NO") {
        setCapturedName("");
        setCapturedFaceLabel(null);
        setCapturedFaceDescriptor(null);
        setPhase("name");
        setStatusText({ key: "status.sayYourName" });
        return;
      }

      if (command.intent !== "CONFIRM_YES") {
        setStatusText({ key: "status.sayYesOrNo" });
        return;
      }

      setCapturedFaceDescriptor(null);
      setProgress(0);
      setScanFaceVisible(false);
      registrationCompletingRef.current = false;
      setPhase("scan");
      setStatusText({ key: "status.lookAtMirror" });
      return;
    }

    if (phase === "scan") {
      setStatusText({ key: "status.lookAtMirror" });
      return;
    }

    if (phase === "confirm") {
      if (command.intent === "CONFIRM_NO") {
        await startRegistration();
        return;
      }

      if (command.intent !== "CONFIRM_YES") {
        setStatusText({ key: "status.sayYesOrNo" });
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
        if (isUmbrellaPhrase(normalizedSpeech)) {
          const answer = await getUmbrellaAnswer(
            registeredUser?.location ?? weather?.location ?? "Amsterdam"
          );
          setStatusText(answer);
          return;
        }

        setStatusText({ key: "status.weatherShown" });
        return;
      }

      if (command.intent === "GET_TIME") {
        setStatusText({ key: "status.timeShown" });
        return;
      }

      setStatusText({ key: "status.notUnderstood" });
      return;
    }

    if (phase === "unknown") {
      if (command.intent === "START_REGISTRATION") {
        navigate("/register");
        await startRegistration();
        return;
      }

      setStatusText({ key: "status.voiceStartRegistration" });
    }
  };
};
