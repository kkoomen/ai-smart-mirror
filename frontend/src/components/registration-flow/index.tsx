import { type RefObject, useEffect, useRef } from "react";
import FadeTransition from "../fade-transition";
import CameraPreview from "../camera-preview";
import { useTranslation } from "react-i18next";
import { normalizeLanguage } from "../../i18n/languages";
import type { MirrorController } from "../../types/mirror-controller";
import { getSpeechPrompt } from "../../utils/speech-prompts";
import styles from "./styles.module.css";

type RegistrationStep = "name" | "nameConfirm" | "scan";

type RegistrationFlowProps = {
  step: RegistrationStep;
  name: string;
  progress: number;
  helperText: string;
  videoRef?: RefObject<HTMLVideoElement | null>;
  scanStatus?: string;
  controller?: MirrorController;
};

export default function RegistrationFlow({
  step,
  name,
  progress,
  helperText,
  videoRef,
  scanStatus,
  controller
}: RegistrationFlowProps) {
  const { t, i18n } = useTranslation();
  const hasSpokenNamePromptRef = useRef(false);
  const currentLabelMap: Record<RegistrationStep, string> = {
    name: t("register.flow.name"),
    nameConfirm: t("register.flow.nameConfirm"),
    scan: t("register.flow.scan")
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
    <section className={styles.root}>
      <FadeTransition
        transitionKey={step}
        className={styles.content}
      >
        <h2 className={styles.title}>
          {currentLabelMap[step]}
        </h2>

        {step === "scan" ? (
          <div className={styles.cameraWrap}>
            <CameraPreview videoRef={videoRef} progress={progress} statusText={scanStatus} />
          </div>
        ) : null}

        {step === "nameConfirm" ? (
          <div className={styles.confirm}>
            <p className={styles.message}>
              {t("register.flow.confirmName", { name })}
            </p>
            <p className={styles.hint}>
              {t("register.flow.yesNo")}
            </p>
          </div>
        ) : null}

        {step === "name" ? (
          <p className={styles.message}>
            {t("register.flow.sayYourName")}
          </p>
        ) : null}
        {step === "scan" ? (
          <p className={styles.scanHelp}>{helperText}</p>
        ) : null}
      </FadeTransition>
    </section>
  );
}
