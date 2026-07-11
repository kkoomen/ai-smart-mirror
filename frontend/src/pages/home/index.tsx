import { useTranslation } from "react-i18next";
// import Agenda from "../../components/agenda";
import DeviceStatus from "../../components/device-status";
import FadeTransition from "../../components/fade-transition";
import LocalTime from "../../components/local-time";
import MirrorCenter from "../../components/mirror-center";
import MirrorLayout from "../../components/mirror-layout";
import PublicTransport from "../../components/public-transport";
import VoiceControl from "../../components/voice-control";
import WeatherForecast from "../../components/weather-forecast";
import type { MirrorController } from "../../types/mirror-controller";

type HomePageProps = {
  controller: MirrorController;
};

export default function HomePage({ controller }: HomePageProps) {
  const { t } = useTranslation();
  const {
    phase,
    registeredUser,
    weather,
    // agenda,
    deviceStatus,
    isMirrorFadingOut,
    handleVoiceCommand,
    statusText,
    sleepMirror,
    idleVideoRef
  } = controller;
  return (
    <>
      <video
        ref={idleVideoRef}
        autoPlay
        muted
        playsInline
        className="pointer-events-none absolute -left-[9999px] h-px w-px opacity-0"
      />
      <FadeTransition
        show={phase !== "idle" && !isMirrorFadingOut}
        className="min-h-screen"
        onExited={sleepMirror}
      >
        <FadeTransition transitionKey={phase} className="min-h-screen">
          <MirrorLayout
            showPanels={phase === "dashboard"}
            showGradient={phase === "hello"}
            blank={phase === "idle"}
            weather={
              weather ? (
                <WeatherForecast
                  location={weather.location}
                  summary={weather.current.condition}
                  temperature={`${weather.current.temperatureC}°`}
                  rainChance={
                    weather.current.rainChancePct === null
                      ? null
                      : `${weather.current.rainChancePct}%`
                  }
                />
              ) : null
            }
            time={<LocalTime />}
            agenda={<PublicTransport userId={registeredUser?.id ?? null} />}
            deviceStatus={<DeviceStatus {...deviceStatus} />}
            center={<MirrorCenter controller={controller} />}
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
