import type { MirrorVoiceOptions } from "../../types/mirror-controller";
import type { User } from "../../types/user";
import type { VoiceCommandResponse, VoicePhase } from "../../types/voice";
import type { WeatherData } from "../../types/weather";
import { isSleepPhrase, isWakePhrase } from "../../utils/voice";
import { requestJson } from "../../utils/request-json";
import type { VoiceCommandRequest } from "../../types/api";

export const useMirrorVoice = ({
  phase,
  registeredUser,
  weather,
  wakeMirror,
  sleepMirror,
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
  capturedName
}: MirrorVoiceOptions) => {
  return async (spokenText: string) => {
    const normalizedSpeech = spokenText.toLowerCase();
    console.info("[Mirror voice] handling command:", normalizedSpeech);

    if (isSleepPhrase(normalizedSpeech)) {
      if (phase === "idle") {
        sleepMirror();
        return;
      }

      setMirrorFadingOut(true);
      return;
    }

    if (isWakePhrase(normalizedSpeech)) {
      wakeMirror();
      return;
    }

    if (phase === "idle" && normalizedSpeech.includes("start registration")) {
      navigate("/register");
      await startRegistration();
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
        userId: registeredUser?.id ?? null
      } satisfies VoiceCommandRequest)
    });

    if (phase === "name") {
      if (command.intent !== "PROVIDE_NAME" || !command.name) {
        setStatusText("Say your name");
        return;
      }

      setCapturedName(command.name);
      setCapturedFaceLabel(browserFaceService.generateFaceLabel(command.name));
      setPhase("nameConfirm");
      setStatusText("Say yes or no");
      return;
    }

    if (phase === "nameConfirm") {
      if (command.intent === "CONFIRM_NO") {
        setCapturedName("");
        setCapturedFaceLabel(null);
        setCapturedFaceDescriptor(null);
        setPhase("name");
        setStatusText("Say your name");
        return;
      }

      if (command.intent !== "CONFIRM_YES") {
        setStatusText("Say yes or no");
        return;
      }

      setCapturedFaceDescriptor(null);
      setProgress(0);
      setScanFaceVisible(false);
      registrationCompletingRef.current = false;
      setPhase("scan");
      setStatusText("Look at the mirror");
      return;
    }

    if (phase === "scan") {
      setStatusText("Look at the mirror");
      return;
    }

    if (phase === "confirm") {
      if (command.intent === "CONFIRM_NO") {
        await startRegistration();
        return;
      }

      if (command.intent !== "CONFIRM_YES") {
        setStatusText("Say yes or no");
        return;
      }

      await createUserAndConfirm(capturedName || command.name || "John");
      return;
    }

    if (phase === "dashboard") {
      if (command.intent === "GET_AGENDA") {
        setStatusText("Today's agenda is on the mirror.");
        return;
      }

      if (command.intent === "GET_WEATHER") {
        if (normalizedSpeech.includes("umbrella")) {
          const answer = await getUmbrellaAnswer(registeredUser?.location ?? weather?.location ?? "Amsterdam");
          setStatusText(answer);
          return;
        }

        setStatusText("Weather is shown on the mirror.");
        return;
      }

      if (command.intent === "GET_TIME") {
        setStatusText("Time is shown in the top-right.");
        return;
      }

      setStatusText(command.response);
      return;
    }

    if (phase === "unknown") {
      if (command.intent === "START_REGISTRATION") {
        navigate("/register");
        await startRegistration();
        return;
      }

      setStatusText("Say 'start registration' to begin");
    }
  };
};
