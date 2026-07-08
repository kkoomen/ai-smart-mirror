import { useEffect, useState } from "react";
import MirrorLayout from "./components/mirror-layout";
import LocalTime from "./components/local-time";
import WeatherForecast from "./components/weather-forecast";
import Agenda from "./components/agenda";
import StartScreen from "./components/start-screen";
import RegistrationFlow from "./components/registration-flow";
import VoiceControl from "./components/voice-control";
import DeviceStatus from "./components/device-status";

const demoStates = ["start", "registering", "recognized", "unknown"] as const;

const weather = {
  location: "Amsterdam",
  summary: "Clear sky",
  temperature: "18°",
  high: "21°",
  low: "12°",
  forecast: [
    { label: "Now", temp: "18°", note: "Clear" },
    { label: "12:00", temp: "20°", note: "Sunny" },
    { label: "15:00", temp: "21°", note: "Light wind" }
  ]
};

const agenda = [
  { time: "08:30", title: "Team standup" },
  { time: "11:00", title: "Face model review" },
  { time: "16:30", title: "Grocery pickup" }
];

const deviceStatus = {
  camera: "active",
  microphone: "listening",
  network: "connected",
  battery: "92%"
};

export default function App() {
  const [demoIndex, setDemoIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDemoIndex((value) => (value + 1) % demoStates.length);
    }, 8000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const mirrorState = demoStates[demoIndex];

  let centerContent;

  if (mirrorState === "start") {
    centerContent = <StartScreen />;
  } else if (mirrorState === "registering") {
    centerContent = <RegistrationFlow />;
  } else if (mirrorState === "recognized") {
    centerContent = (
      <section className="flex flex-col items-center gap-4 text-center">
        <p className="text-xs uppercase tracking-[0.6em] text-white/50">
          mirror state
        </p>
        <h2 className="max-w-4xl text-4xl font-light tracking-[0.12em] sm:text-6xl lg:text-7xl">
          Good morning, Maya
        </h2>
        <VoiceControl prompt="Say: show my schedule" />
      </section>
    );
  } else {
    centerContent = (
      <section className="flex flex-col items-center gap-4 text-center">
        <p className="text-xs uppercase tracking-[0.6em] text-white/50">
          mirror state
        </p>
        <h2 className="max-w-4xl text-4xl font-light tracking-[0.12em] sm:text-6xl lg:text-7xl">
          I don&apos;t recognize you yet
        </h2>
        <VoiceControl prompt="Say: start registration" />
      </section>
    );
  }

  return (
    <MirrorLayout
      weather={<WeatherForecast {...weather} />}
      time={<LocalTime />}
      agenda={<Agenda events={agenda} />}
      deviceStatus={<DeviceStatus {...deviceStatus} />}
      center={centerContent}
    />
  );
}
