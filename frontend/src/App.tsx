import { useEffect, useMemo, useState } from "react";
import MirrorLayout from "./components/mirror-layout";
import LocalTime from "./components/local-time";
import WeatherForecast from "./components/weather-forecast";
import Agenda from "./components/agenda";
import StartScreen from "./components/start-screen";
import RegistrationFlow from "./components/registration-flow";
import VoiceControl from "./components/voice-control";
import DeviceStatus from "./components/device-status";

type User = {
  id: number;
  name: string;
  faceLabel: string;
  createdAt: string;
};

type MirrorStateResponse = {
  mode: "no_user" | "registering" | "recognized" | "unknown";
  registrationComplete: boolean;
  userCount: number;
  activeUser: User | null;
};

type UsersResponse = {
  users: User[];
};

type WeatherResponse = {
  userId: number;
  weather: {
    location: string;
    updatedAt: string;
    current: {
      temperatureC: number;
      condition: string;
      feelsLikeC: number;
      humidity: number;
      windKph: number;
    };
    forecast: Array<{
      label: string;
      temperatureC: number;
      condition: string;
    }>;
    note: string;
  };
};

type AgendaResponse = {
  userId: number;
  date: string;
  events: Array<{
    id: string | number;
    title: string;
    startTime: string;
    endTime: string;
    location: string | null;
    description: string | null;
  }>;
};

type VoicePhase = "start" | "name" | "scan" | "confirm" | "dashboard";
type VoiceIntent =
  | "START_REGISTRATION"
  | "PROVIDE_NAME"
  | "CONFIRM_YES"
  | "CONFIRM_NO"
  | "GET_AGENDA"
  | "GET_WEATHER"
  | "GET_TIME"
  | "UNKNOWN";

type VoiceCommandResponse = {
  ok: true;
  intent: VoiceIntent;
  name: string | null;
  response: string;
};

const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

const requestJson = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
};

const buildFaceLabel = (name: string) =>
  `face_${name.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")}_${Date.now().toString(36)}`;

export default function App() {
  const [phase, setPhase] = useState<VoicePhase>("start");
  const [statusText, setStatusText] = useState("Loading Mirror AI...");
  const [progress, setProgress] = useState(0);
  const [capturedName, setCapturedName] = useState("");
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);
  const [weather, setWeather] = useState<WeatherResponse["weather"] | null>(null);
  const [agenda, setAgenda] = useState<AgendaResponse["events"]>([]);

  const deviceStatus = useMemo(
    () => ({
      camera: phase === "dashboard" ? "active" : phase === "scan" ? "scanning" : "standby",
      microphone: phase === "scan" ? "listening" : "ready",
      network: "connected",
      battery: "92%"
    }),
    [phase]
  );

  const loadDashboardData = async (userId: number) => {
    const [weatherResponse, agendaResponse] = await Promise.all([
      requestJson<WeatherResponse>(`/api/users/${userId}/weather`),
      requestJson<AgendaResponse>(`/api/users/${userId}/agenda/today`)
    ]);

    setWeather(weatherResponse.weather);
    setAgenda(agendaResponse.events);
  };

  const bootstrap = async () => {
    try {
      const [mirrorState, usersResponse] = await Promise.all([
        requestJson<MirrorStateResponse>("/api/mirror/state"),
        requestJson<UsersResponse>("/api/users")
      ]);

      if (usersResponse.users.length === 0) {
        setPhase("start");
        setStatusText("Say 'start registration' to begin");
        return;
      }

      if (mirrorState.activeUser && !mirrorState.registrationComplete) {
        setRegisteredUser(mirrorState.activeUser);
        setCapturedName(mirrorState.activeUser.name);
        setPhase("confirm");
        setStatusText(
          `I recognized this face as ${mirrorState.activeUser.name}. Is that correct?`
        );
        return;
      }

      if (mirrorState.registrationComplete && mirrorState.activeUser) {
        setRegisteredUser(mirrorState.activeUser);
        await loadDashboardData(mirrorState.activeUser.id);
        setPhase("dashboard");
        setStatusText(`Good morning, ${mirrorState.activeUser.name}`);
        return;
      }

      setPhase("start");
      setStatusText("Say 'start registration' to begin");
    } catch {
      setPhase("start");
      setStatusText("Mirror backend unavailable");
    }
  };

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (phase !== "scan") {
      return;
    }

    setProgress(0);
    const interval = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 100) {
          window.clearInterval(interval);
          window.setTimeout(() => {
            setPhase("confirm");
            setStatusText(
              capturedName
                ? `I recognized this face as ${capturedName}. Is that correct?`
                : "I recognized this face. Is that correct?"
            );
          }, 350);
          return 100;
        }

        return Math.min(current + 10, 100);
      });
    }, 180);

    return () => {
      window.clearInterval(interval);
    };
  }, [phase, capturedName]);

  const startRegistration = async () => {
    await requestJson("/api/mirror/start-registration", {
      method: "POST",
      body: JSON.stringify({})
    });

    setCapturedName("");
    setProgress(0);
    setPhase("name");
    setStatusText("What is your name?");
  };

  const createUserAndConfirm = async (name: string) => {
    const faceLabel = buildFaceLabel(name);

    const created = await requestJson<{ ok: boolean; user: User }>("/api/mirror/register-user", {
      method: "POST",
      body: JSON.stringify({
        name,
        faceLabel
      })
    });

    const confirmed = await requestJson<{ ok: boolean; user: User }>("/api/mirror/confirm-face", {
      method: "POST",
      body: JSON.stringify({
        userId: created.user.id,
        faceLabel: created.user.faceLabel
      })
    });

    setRegisteredUser(confirmed.user);
    await loadDashboardData(confirmed.user.id);
    setPhase("dashboard");
    setStatusText(`Good morning, ${confirmed.user.name}`);
  };

  const handleVoiceCommand = async (spokenText: string) => {
    const currentPhase = phase;
    const currentUserId = registeredUser?.id ?? null;

    const command = await requestJson<VoiceCommandResponse>("/api/voice/command", {
      method: "POST",
      body: JSON.stringify({
        transcript: spokenText,
        phase: currentPhase,
        userId: currentUserId
      })
    });

    if (currentPhase === "start") {
      if (command.intent !== "START_REGISTRATION") {
        setStatusText("Say 'start registration' to begin");
        return;
      }

      await startRegistration();
      return;
    }

    if (currentPhase === "name") {
      if (command.intent !== "PROVIDE_NAME" || !command.name) {
        setStatusText("What is your name?");
        return;
      }

      setCapturedName(command.name);
      setPhase("scan");
      setStatusText("Look at the mirror");
      return;
    }

    if (currentPhase === "scan") {
      setStatusText("Look at the mirror");
      return;
    }

    if (currentPhase === "confirm") {
      if (command.intent === "CONFIRM_NO") {
        await startRegistration();
        return;
      }

      if (command.intent !== "CONFIRM_YES") {
        setStatusText("Say yes, confirm, no, or try again");
        return;
      }

      await createUserAndConfirm(capturedName || command.name || "John");
      return;
    }

    if (currentPhase === "dashboard") {
      if (command.intent === "GET_AGENDA") {
        setStatusText("Today's agenda is displayed on the mirror.");
        return;
      }

      if (command.intent === "GET_WEATHER") {
        setStatusText("Weather is displayed on the mirror.");
        return;
      }

      if (command.intent === "GET_TIME") {
        setStatusText("Time is shown in the top-right.");
        return;
      }

      setStatusText(command.response);
    }
  };

  const centerContent = (() => {
    if (phase === "start") {
      return (
        <section className="flex flex-col items-center gap-6 text-center">
          <StartScreen />
          <VoiceControl
            prompt="Say: start registration"
            onCommand={handleVoiceCommand}
            helperText={statusText}
          />
        </section>
      );
    }

    if (phase === "name") {
      return (
        <RegistrationFlow
          step="name"
          name={capturedName}
          progress={0}
          onCommand={handleVoiceCommand}
          helperText={statusText}
        />
      );
    }

    if (phase === "scan") {
      return (
        <RegistrationFlow
          step="scan"
          name={capturedName}
          progress={progress}
          onCommand={handleVoiceCommand}
          helperText={statusText}
        />
      );
    }

    if (phase === "confirm") {
      return (
        <RegistrationFlow
          step="confirm"
          name={capturedName}
          progress={100}
          onCommand={handleVoiceCommand}
          helperText={statusText}
        />
      );
    }

    return (
      <section className="flex flex-col items-center gap-5 text-center">
        <p className="text-xs uppercase tracking-[0.6em] text-white/45">mirror state</p>
        <h2 className="max-w-4xl text-4xl font-light tracking-[0.12em] sm:text-6xl lg:text-7xl">
          Good morning, {registeredUser?.name ?? "Mirror user"}
        </h2>
        <p className="max-w-2xl text-sm uppercase tracking-[0.3em] text-white/65 sm:text-base">
          Voice commands are active.
        </p>
        <VoiceControl
          prompt="Try: what do I have today"
          onCommand={handleVoiceCommand}
          helperText={statusText}
        />
      </section>
    );
  })();

  if (phase === "dashboard") {
    return (
      <MirrorLayout
        showPanels
        weather={
          weather ? (
            <WeatherForecast
              location={weather.location}
              summary={weather.current.condition}
              temperature={`${weather.current.temperatureC}°`}
              high={`${Math.max(...weather.forecast.map((item) => item.temperatureC))}°`}
              low={`${Math.min(...weather.forecast.map((item) => item.temperatureC))}°`}
              forecast={weather.forecast.map((item) => ({
                label: item.label,
                temp: `${item.temperatureC}°`,
                note: item.condition
              }))}
            />
          ) : null
        }
        time={<LocalTime />}
        agenda={
          <Agenda
            events={agenda.map((event) => ({
              time: new Intl.DateTimeFormat("en-GB", {
                hour: "2-digit",
                minute: "2-digit"
              }).format(new Date(event.startTime)),
              title: event.title
            }))}
          />
        }
        deviceStatus={<DeviceStatus {...deviceStatus} />}
        center={centerContent}
      />
    );
  }

  return <MirrorLayout showPanels={false} center={centerContent} />;
}
