import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeLanguage } from "../../i18n/languages";
import type { MirrorController } from "../../types/mirror-controller";
import { getSpeechPrompt } from "../../utils/speech-prompts";
import FadeTransition from "../fade-transition";
import styles from "./styles.module.css";

type MirrorCenterProps = {
  controller: MirrorController;
};

export default function MirrorCenter({ controller }: MirrorCenterProps) {
  const { t, i18n } = useTranslation();
  const { phase, registeredUser, speakText, dashboardSummaryText } = controller;
  const hasSpokenStartPromptRef = useRef(false);
  const hasSpokenSummaryRef = useRef("");
  const summaryHideTimerRef = useRef<number | null>(null);
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);

  useEffect(() => {
    if (phase !== "unknown" || hasSpokenStartPromptRef.current) {
      return;
    }

    hasSpokenStartPromptRef.current = true;
    speakText(getSpeechPrompt("startRegistration", normalizeLanguage(i18n.language)));
  }, [i18n.language, phase, speakText]);

  useEffect(() => {
    if (phase !== "unknown") {
      hasSpokenStartPromptRef.current = false;
    }
  }, [phase]);

  useEffect(() => {
    if (summaryHideTimerRef.current !== null) {
      window.clearTimeout(summaryHideTimerRef.current);
      summaryHideTimerRef.current = null;
    }

    if (phase !== "dashboard" || !dashboardSummaryText) {
      hasSpokenSummaryRef.current = "";
      setIsSummaryVisible(false);
      return;
    }

    if (hasSpokenSummaryRef.current === dashboardSummaryText) {
      return;
    }

    hasSpokenSummaryRef.current = dashboardSummaryText;
    setIsSummaryVisible(true);

    speakText(dashboardSummaryText, normalizeLanguage(i18n.language), true, {
      onEnd: () => {
        summaryHideTimerRef.current = window.setTimeout(() => {
          setIsSummaryVisible(false);
          summaryHideTimerRef.current = null;
        }, 2000);
      }
    });
  }, [dashboardSummaryText, i18n.language, phase, speakText]);

  useEffect(
    () => () => {
      if (summaryHideTimerRef.current !== null) {
        window.clearTimeout(summaryHideTimerRef.current);
      }
    },
    []
  );

  if (phase === "hello") {
    return (
      <section className={styles.hello}>
        <h2 className={styles.heroTitle}>
          {t("status.hello", { name: registeredUser?.name ?? t("home.mirror.defaultUser") })}
        </h2>
      </section>
    );
  }

  if (phase === "unknown") {
    return (
      <section className={styles.unknown}>
        <h2 className={styles.heroTitle}>
          {t("home.mirror.welcome")}
        </h2>
        <p className={styles.prompt}>
          {t("home.mirror.startRegistration")}
        </p>
      </section>
    );
  }

  if (phase === "dashboard") {
    return (
      <FadeTransition
        show={isSummaryVisible}
        className={styles.summaryWrap}
      >
        <section className={styles.summary}>
          <h2 className={styles.summaryText}>
            {dashboardSummaryText}
          </h2>
        </section>
      </FadeTransition>
    );
  }

  return null;
}
