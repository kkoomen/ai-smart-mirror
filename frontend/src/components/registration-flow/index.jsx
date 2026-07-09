import { useEffect, useRef } from "react";
import FadeTransition from "../fade-transition";
import CameraPreview from "../camera-preview";
import { useTranslation } from "react-i18next";
import { normalizeLanguage } from "../../i18n/languages";
import { getSpeechPrompt } from "../../utils/speech-prompts";

export default function RegistrationFlow({
  step,
  name,
  progress,
  helperText,
  videoRef,
  scanStatus,
  controller
}) {
  const { t, i18n } = useTranslation();
  const hasSpokenNamePromptRef = useRef(false);
  const currentLabelMap = {
    name: t("register.flow.name"),
    nameConfirm: t("register.flow.nameConfirm"),
    scan: t("register.flow.scan"),
    confirm: t("register.flow.confirm")
  };

  useEffect(() => {
    if (step !== "name" || hasSpokenNamePromptRef.current) {
      return;
    }

    hasSpokenNamePromptRef.current = true;
    controller?.speakText(getSpeechPrompt("sayYourName", normalizeLanguage(i18n.language)));
  }, [controller, i18n.language, step]);

  useEffect(() => {
    if (step !== "name") {
      hasSpokenNamePromptRef.current = false;
    }
  }, [step]);

  return (
    <section className="flex flex-col items-center gap-6 text-center">
      <FadeTransition transitionKey={step} className="flex w-full flex-col items-center gap-6 text-center">
        <h2 className="max-w-4xl text-3xl font-light tracking-[0.12em] sm:text-5xl">
          {currentLabelMap[step]}
        </h2>

        {step === "scan" ? (
          <div className="flex w-full max-w-2xl flex-col gap-4">
            <CameraPreview videoRef={videoRef} progress={progress} statusText={scanStatus} />
          </div>
        ) : null}

        {step === "confirm" ? (
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.25em] text-white/65">
              {t("register.flow.confirmFace", { name })}
            </p>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              {t("register.flow.yesNoTryAgain")}
            </p>
          </div>
        ) : null}

        {step === "nameConfirm" ? (
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.25em] text-white/65">
              {t("register.flow.confirmName", { name })}
            </p>
            <p className="pt-2 text-xs uppercase tracking-[0.3em] text-white/40">
              {t("register.flow.yesNo")}
            </p>
          </div>
        ) : null}

        {step === "name" ? (
          <p className="text-sm uppercase tracking-[0.25em] text-white/65">
            {t("register.flow.sayYourName")}
          </p>
        ) : null}
        {step !== "name" && step !== "nameConfirm" ? (
          <p className="text-xs uppercase tracking-[0.25em] text-white/45">{helperText}</p>
        ) : null}
      </FadeTransition>
    </section>
  );
}
