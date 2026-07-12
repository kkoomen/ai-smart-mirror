import { useTranslation } from "react-i18next";
import FadeTransition from "../../components/fade-transition";
import MirrorLayout from "../../components/mirror-layout";
import VoiceControl from "../../components/voice-control";
import type { MirrorController } from "../../types/mirror-controller";
import styles from "./styles.module.css";

type ChangeLanguagePageProps = {
  controller: MirrorController;
};

export default function ChangeLanguagePage({ controller }: ChangeLanguagePageProps) {
  const { t } = useTranslation();
  const {
    phase,
    isMirrorFadingOut,
    handleVoiceCommand,
    statusText,
    finishLanguageChange,
    idleVideoRef
  } = controller;

  return (
    <>
      <video
        ref={idleVideoRef}
        autoPlay
        muted
        playsInline
        className={styles.hiddenVideo}
      />
      <FadeTransition
        show={phase !== "idle" && !isMirrorFadingOut}
        className={styles.fullScreen}
        onExited={() => {
          void finishLanguageChange();
        }}
      >
        <FadeTransition transitionKey="change-language" className={styles.fullScreen}>
          <MirrorLayout
            showPanels={false}
            center={
              <section className={styles.language}>
                <p className={styles.kicker}>
                  {t("changeLanguage.title")}
                </p>
                <h1 className={styles.title}>
                  {t("changeLanguage.subtitle")}
                </h1>
                <p className={styles.prompt}>
                  {t("changeLanguage.prompt")}
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
