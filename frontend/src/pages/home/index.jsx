import { useTranslation } from "react-i18next";
import Agenda from "../../components/agenda";
import DeviceStatus from "../../components/device-status";
import FadeTransition from "../../components/fade-transition";
import LocalTime from "../../components/local-time";
import MirrorCenter from "../../components/mirror-center";
import MirrorLayout from "../../components/mirror-layout";
import VoiceControl from "../../components/voice-control";
import WeatherForecast from "../../components/weather-forecast";
import { normalizeLanguage } from "../../i18n/languages";

export default function HomePage({ controller }) {
  const { i18n, t } = useTranslation();
  const {
    phase,
    weather,
    agenda,
    deviceStatus,
    isMirrorFadingOut,
    handleVoiceCommand,
    statusText,
    sleepMirror,
    idleVideoRef
  } = controller;
  const locale = normalizeLanguage(i18n.language) === "zh" ? "zh-CN" : "en-GB";

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
                  rainChance={weather.current.rainChancePct === null ? null : `${weather.current.rainChancePct}%`}
                />
              ) : null
            }
            time={<LocalTime />}
            agenda={
              <Agenda
                events={agenda.map((event) => ({
                  time: new Intl.DateTimeFormat(locale, {
                    hour: "2-digit",
                    minute: "2-digit"
                  }).format(new Date(event.startTime)),
                  title: event.title
                }))}
              />
            }
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
