import { useTranslation } from "react-i18next";
import FadeTransition from "../../components/fade-transition";
import MirrorLayout from "../../components/mirror-layout";
import VoiceControl from "../../components/voice-control";

export default function ChangeLanguagePage({ controller }) {
  const { t } = useTranslation();
  const { phase, isMirrorFadingOut, handleVoiceCommand, statusText, sleepMirror, idleVideoRef } = controller;

  return (
    <>
      <video
        ref={idleVideoRef}
        autoPlay
        muted
        playsInline
        className="pointer-events-none absolute -left-[9999px] h-px w-px opacity-0"
      />
      <FadeTransition show={phase !== "idle" && !isMirrorFadingOut} className="min-h-screen" onExited={sleepMirror}>
        <FadeTransition transitionKey="change-language" className="min-h-screen">
          <MirrorLayout
            showPanels={false}
            center={
              <section className="flex flex-col items-center gap-5 text-center">
                <p className="text-xs uppercase tracking-[0.6em] text-white/45">
                  {t("changeLanguage.title")}
                </p>
                <h1 className="max-w-4xl text-4xl font-light tracking-[0.12em] sm:text-6xl lg:text-7xl">
                  {t("changeLanguage.subtitle")}
                </h1>
                <p className="max-w-2xl text-sm uppercase tracking-[0.3em] text-white/65 sm:text-base">
                  {statusText}
                </p>
                <p className="text-xs uppercase tracking-[0.35em] text-white/45">
                  {t("changeLanguage.prompt")}
                </p>
                <p className="text-[11px] uppercase tracking-[0.32em] text-white/35">
                  {t("changeLanguage.options.english")} / {t("changeLanguage.options.mandarin")}
                </p>
              </section>
            }
          />
        </FadeTransition>
      </FadeTransition>
      <VoiceControl
        prompt={t("voice.promptWake")}
        onCommand={handleVoiceCommand}
        helperText={statusText}
        visible={false}
      />
    </>
  );
}
