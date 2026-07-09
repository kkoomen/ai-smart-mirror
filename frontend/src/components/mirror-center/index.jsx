import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { normalizeLanguage } from "../../i18n/languages";
import { getSpeechPrompt } from "../../utils/speech-prompts";

export default function MirrorCenter({ controller }) {
  const { t, i18n } = useTranslation();
  const { phase, registeredUser, speakText } = controller;
  const hasSpokenStartPromptRef = useRef(false);

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

  return null;
}
