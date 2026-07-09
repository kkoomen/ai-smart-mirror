import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeLanguage } from "../../i18n/languages";
import { getSpeechPrompt } from "../../utils/speech-prompts";
import FadeTransition from "../fade-transition";

export default function MirrorCenter({ controller }) {
  const { t, i18n } = useTranslation();
  const { phase, registeredUser, speakText, dashboardSummaryText } = controller;
  const hasSpokenStartPromptRef = useRef(false);
  const hasSpokenSummaryRef = useRef("");
  const summaryHideTimerRef = useRef(null);
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
      <section className="flex flex-col items-center gap-4 text-center">
        <h2 className="max-w-4xl text-4xl font-light tracking-[0.12em] sm:text-6xl lg:text-7xl">
          {t("status.hello", { name: registeredUser?.name ?? t("home.mirror.defaultUser") })}
        </h2>
      </section>
    );
  }

  if (phase === "unknown") {
    return (
      <section className="flex flex-col items-center gap-5 text-center">
        <h2 className="max-w-4xl text-4xl font-light tracking-[0.12em] sm:text-6xl lg:text-7xl">
          {t("home.mirror.welcome")}
        </h2>
        <p className="max-w-2xl text-sm uppercase tracking-[0.3em] text-white/65 sm:text-base">
          {t("home.mirror.startRegistration")}
        </p>
      </section>
    );
  }

  if (phase === "dashboard") {
    return (
      <FadeTransition show={isSummaryVisible} className="flex flex-col items-center gap-3 text-center">
        <section className="flex flex-col items-center gap-3 text-center">
          <h2 className="max-w-3xl text-sm font-light tracking-[0.14em] text-white/85 sm:text-sm lg:text-base">
            {dashboardSummaryText}
          </h2>
        </section>
      </FadeTransition>
    );
  }

  return null;
}
