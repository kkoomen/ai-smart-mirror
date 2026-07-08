import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
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

type FlowPhase = "booting" | "start" | "name" | "scan" | "confirm" | "dashboard";

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

const normalizeText = (value: string) => value.trim().toLowerCase();

const isRegistrationStart = (text: string) => normalizeText(text).includes("start registration");

const isConfirmationYes = (text: string) => {
  const value = normalizeText(text);
  return value === "yes" || value === "confirm" || value === "ok" || value === "okay";
};

const isConfirmationNo = (text: string) => {
  const value = normalizeText(text);
  return value === "no" || value === "try again" || value === "retry";
};

const buildFaceLabel = (name: string) =>
  `face_${name.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")}_${Date.now().toString(36)}`;

export default function App() {
  const [phase, setPhase] = useState<FlowPhase>("booting");
  const [transcript, setTranscript] = useState("");
  const [statusText, setStatusText] = useState("Loading Mirror AI...");
  const [progress, setProgress] = useState(0);
  const [capturedName, setCapturedName] = useState("");
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);
  const [weather, setWeather] = useState<WeatherResponse["weather"] | null>(null);
  const [agenda, setAgenda] = useState<AgendaResponse["events"]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const deviceStatus = useMemo(
    () => ({
      camera: phase === "dashboard" ? "active" : "standby",
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
                : "Is that correct?"
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

  const logVoiceCommand = async (
    spokenText: string,
    intent?: string,
    response?: string,
    userId?: number | null
  ) => {
    await requestJson("/api/voice/command", {
      method: "POST",
      body: JSON.stringify({
        transcript: spokenText,
        intent,
        response,
        userId: userId ?? undefined
      })
    });
  };

  const startRegistration = async (spokenText: string) => {
    setIsSubmitting(true);

    try {
      await logVoiceCommand(spokenText, "start_registration", "Starting registration flow.");
      await requestJson("/api/mirror/start-registration", {
        method: "POST",
        body: JSON.stringify({})
      });
      setTranscript("");
      setCapturedName("");
      setProgress(0);
      setPhase("name");
      setStatusText("What is your name?");
    } finally {
      setIsSubmitting(false);
    }
  };

  const captureName = async (spokenText: string) => {
    const name = spokenText.trim();
    if (!name) {
      setStatusText("Please say your name.");
      return;
    }

    setIsSubmitting(true);

    try {
      await logVoiceCommand(spokenText, "register_user", `Captured name ${name}.`);
      setCapturedName(name);
      setTranscript("");
      setStatusText("Look at the mirror");
      setPhase("scan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeRegistration = async (spokenText: string) => {
    const normalized = normalizeText(spokenText);

    if (isConfirmationNo(normalized)) {
      await logVoiceCommand(spokenText, "confirm_face", "Okay, let's try again.");
      setCapturedName("");
      setTranscript("");
      setProgress(0);
      setStatusText("What is your name?");
      setPhase("name");
      return;
    }

    if (!isConfirmationYes(normalized)) {
      setStatusText("Please say yes, confirm, no, or try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const name = capturedName || "John";
      const faceLabel = buildFaceLabel(name);

      await logVoiceCommand(spokenText, "confirm_face", `Confirmed face for ${name}.`);

      const created = await requestJson<{
        ok: boolean;
        user: User;
        state: unknown;
        nextStep: string;
      }>("/api/mirror/register-user", {
        method: "POST",
        body: JSON.stringify({
          name,
          faceLabel
        })
      });

      const confirmed = await requestJson<{
        ok: boolean;
        user: User;
        state: unknown;
        mode: string;
      }>("/api/mirror/confirm-face", {
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
      setTranscript("");
      setCapturedName(confirmed.user.name);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const spokenText = transcript.trim();
    if (!spokenText) {
      setStatusText("Please type the simulated voice command.");
      return;
    }

    if (phase === "start") {
      if (!isRegistrationStart(spokenText)) {
        setStatusText("Say 'start registration' to begin");
        return;
      }

      await startRegistration(spokenText);
      return;
    }

    if (phase === "name") {
      await captureName(spokenText);
      return;
    }

    if (phase === "confirm") {
      await completeRegistration(spokenText);
    }
  };

  const centerContent = (() => {
    if (phase === "start") {
      return (
        <section className="flex flex-col items-center gap-6 text-center">
          <StartScreen />
          <VoiceControl
            prompt="Say: start registration"
            transcript={transcript}
            onTranscriptChange={(event) => setTranscript(event.target.value)}
            onSubmit={handleSubmit}
            buttonLabel="Begin"
            helperText={statusText}
            disabled={isSubmitting}
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
          transcript={transcript}
          onTranscriptChange={(event) => setTranscript(event.target.value)}
          onSubmit={handleSubmit}
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
          transcript=""
          onTranscriptChange={(event) => setTranscript(event.target.value)}
          onSubmit={handleSubmit}
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
          transcript={transcript}
          onTranscriptChange={(event) => setTranscript(event.target.value)}
          onSubmit={handleSubmit}
          helperText="Say: yes, confirm, no, or try again"
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
          Your mirror is ready.
        </p>
        <VoiceControl
          prompt="Say: show my schedule"
          transcript={transcript}
          onTranscriptChange={(event) => setTranscript(event.target.value)}
          onSubmit={async (event) => {
            event.preventDefault();
            setTranscript("");
            setStatusText("Mirror is ready.");
          }}
          buttonLabel="Send"
          helperText={statusText}
          disabled={isSubmitting}
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
        agenda={<Agenda events={agenda.map((event) => ({
          time: new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            minute: "2-digit"
          }).format(new Date(event.startTime)),
          title: event.title
        }))} />}
        deviceStatus={<DeviceStatus {...deviceStatus} />}
        center={centerContent}
      />
    );
  }

  return <MirrorLayout showPanels={false} center={centerContent} />;
}
