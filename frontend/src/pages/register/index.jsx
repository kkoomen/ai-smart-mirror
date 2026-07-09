import { useTranslation } from "react-i18next";
import FadeTransition from "../../components/fade-transition";
import MirrorLayout from "../../components/mirror-layout";
import RegistrationCenter from "../../components/registration-center";
import VoiceControl from "../../components/voice-control";

export default function RegisterPage({ controller }) {
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
        <FadeTransition transitionKey="register" className="min-h-screen">
          <MirrorLayout showPanels={false} center={<RegistrationCenter controller={controller} />} />
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
