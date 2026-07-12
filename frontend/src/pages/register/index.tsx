import { useTranslation } from "react-i18next";
import FadeTransition from "../../components/fade-transition";
import MirrorLayout from "../../components/mirror-layout";
import RegistrationCenter from "../../components/registration-center";
import VoiceControl from "../../components/voice-control";
import type { MirrorController } from "../../types/mirror-controller";
import styles from "./styles.module.css";

type RegisterPageProps = {
  controller: MirrorController;
};

export default function RegisterPage({ controller }: RegisterPageProps) {
  const { t } = useTranslation();
  const { phase, isMirrorFadingOut, handleVoiceCommand, statusText, sleepMirror, idleVideoRef } =
    controller;

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
        onExited={sleepMirror}
      >
        <FadeTransition transitionKey="register" className={styles.fullScreen}>
          <MirrorLayout
            showPanels={false}
            center={<RegistrationCenter controller={controller} />}
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
