import { useEffect, useMemo, useRef, useState } from "react";
import MirrorLayout from "./components/mirror-layout";
import LocalTime from "./components/local-time";
import WeatherForecast from "./components/weather-forecast";
import Agenda from "./components/agenda";
import StartScreen from "./components/start-screen";
import RegistrationFlow from "./components/registration-flow";
import VoiceControl from "./components/voice-control";
import DeviceStatus from "./components/device-status";
import PrototypePanel from "./components/prototype-panel";
import {
  BrowserFaceRecognitionService,
  SimulatedFaceRecognitionService,
  type FaceRecognitionMode,
  type FaceRecognitionSubject
} from "./services/face-recognition";

type User = {
  id: number;
  name: string;
  faceLabel: string;
  faceDescriptor: string | null;
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

type VoicePhase = "start" | "name" | "scan" | "confirm" | "dashboard" | "unknown";
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

const toSubject = (user: User): FaceRecognitionSubject => ({
  id: user.id,
  name: user.name,
  faceLabel: user.faceLabel,
  faceDescriptor: user.faceDescriptor
});

export default function App() {
  const browserFaceService = useMemo(() => new BrowserFaceRecognitionService(), []);
  const simulatedFaceService = useMemo(() => new SimulatedFaceRecognitionService(), []);
  const scanVideoRef = useRef<HTMLVideoElement | null>(null);
  const idleVideoRef = useRef<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState<VoicePhase>("start");
  const [statusText, setStatusText] = useState("Loading Mirror AI...");
  const [progress, setProgress] = useState(0);
  const [capturedName, setCapturedName] = useState("");
  const [capturedFaceLabel, setCapturedFaceLabel] = useState<string | null>(null);
  const [capturedFaceDescriptor, setCapturedFaceDescriptor] = useState<string | null>(null);
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);
  const [knownUsers, setKnownUsers] = useState<User[]>([]);
  const [weather, setWeather] = useState<WeatherResponse["weather"] | null>(null);
  const [agenda, setAgenda] = useState<AgendaResponse["events"]>([]);
  const [faceMode, setFaceMode] = useState<FaceRecognitionMode>("live");
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [detectedFaceLabel, setDetectedFaceLabel] = useState<string | null>(null);
  const [scanFaceVisible, setScanFaceVisible] = useState(false);

  const deviceStatus = useMemo(
    () => ({
      camera:
        faceMode === "live" && phase === "scan"
          ? "scanning"
          : faceMode === "live" && phase !== "name" && phase !== "confirm"
            ? "polling"
            : "standby",
      microphone: phase === "scan" ? "listening" : "ready",
      network: "connected",
      battery: "92%"
    }),
    [faceMode, phase]
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
      let faceApiReady = true;

      try {
        await browserFaceService.load();
      } catch {
        faceApiReady = false;
      }

      const [mirrorState, usersResponse] = await Promise.all([
        requestJson<MirrorStateResponse>("/api/mirror/state"),
        requestJson<UsersResponse>("/api/users")
      ]);

      setKnownUsers(usersResponse.users);

      if (usersResponse.users.length === 0) {
        setFaceMode("live");
        setPhase("start");
        setStatusText(
          faceApiReady
            ? "Say 'start registration' to begin"
            : "Face models are not loaded yet. Say 'start registration' to continue with voice mode."
        );
        return;
      }

      if (mirrorState.activeUser && !mirrorState.registrationComplete) {
        setRegisteredUser(mirrorState.activeUser);
        setCapturedName(mirrorState.activeUser.name);
        setCapturedFaceLabel(mirrorState.activeUser.faceLabel);
        setCapturedFaceDescriptor(mirrorState.activeUser.faceDescriptor);
        setPhase("confirm");
        setStatusText(
          `I recognized this face as ${mirrorState.activeUser.name}. Is that correct?`
        );
        return;
      }

      if (mirrorState.registrationComplete && mirrorState.activeUser) {
        setRegisteredUser(mirrorState.activeUser);
        setFaceMode("live");
        await loadDashboardData(mirrorState.activeUser.id);
        setPhase("dashboard");
        setStatusText(`Good morning, ${mirrorState.activeUser.name}`);
        return;
      }

      setFaceMode("live");
      setPhase("start");
      setStatusText(
        faceApiReady
          ? "Say 'start registration' to begin"
          : "Face models are not loaded yet. Say 'start registration' to continue with voice mode."
      );
    } catch {
      setFaceMode("live");
      setPhase("start");
      setStatusText("Mirror backend unavailable");
    }
  };

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (phase === "name" || phase === "confirm") {
      return;
    }

    let cancelled = false;
    const faceService = faceMode === "live" ? browserFaceService : simulatedFaceService;
    let timeoutId: number | null = null;
    const delayMs = phase === "scan" ? 350 : 5000;
    const activeVideoRef = phase === "scan" ? scanVideoRef : idleVideoRef;

    const scheduleNext = () => {
      if (cancelled) {
        return;
      }

      timeoutId = window.setTimeout(() => {
        void runDetection();
      }, delayMs);
    };

    const runDetection = async () => {
      const video = activeVideoRef.current;
      let cameraStarted = false;

      try {
        if (faceMode === "live" && video) {
          await browserFaceService.startCamera(video);
          cameraStarted = true;
        }

        const detection = await faceService.detectFace({
          mode: faceMode,
          knownUsers: knownUsers.map(toSubject),
          activeUser: registeredUser ? toSubject(registeredUser) : null,
          video
        });

        if (cancelled) {
          return;
        }

        setDetectedFaceLabel(detection.detectedFaceLabel);

        if (phase === "scan") {
          setScanFaceVisible(detection.isFaceDetected);

          if (detection.faceDescriptor) {
            setCapturedFaceDescriptor(detection.faceDescriptor);
          }

          if (detection.isFaceDetected) {
            setProgress((current) => {
              const next = Math.min(100, current + 18);

              if (current < 100 && next >= 100) {
                window.setTimeout(() => {
                  if (cancelled) {
                    return;
                  }

                  setPhase("confirm");
                  setStatusText(
                    capturedName
                      ? `I recognized this face as ${capturedName}. Is that correct?`
                      : "I recognized this face. Is that correct?"
                  );
                }, 250);
              }

              return next;
            });
          } else {
            setProgress((current) => Math.max(0, current - 12));
          }

          scheduleNext();
          return;
        }

        if (detection.matchedUser) {
          const matchedUser = knownUsers.find((user) => user.faceLabel === detection.matchedUser?.faceLabel);

          if (matchedUser) {
            const isSameUser = registeredUser?.faceLabel === matchedUser.faceLabel;

            if (!isSameUser) {
              setRegisteredUser(matchedUser);
            }

            if (!isSameUser || phase !== "dashboard") {
              browserFaceService.stopCamera(video);
              await loadDashboardData(matchedUser.id);
              setPhase("dashboard");
              setStatusText(`Good morning, ${matchedUser.name}`);
              return;
            }
          }

          if (detection.isFaceDetected && !detection.matchedUser && knownUsers.length > 0) {
            browserFaceService.stopCamera(video);
            setPhase("unknown");
            setStatusText("Unknown user detected");
            return;
          }
        }

        if (!detection.isFaceDetected && knownUsers.length > 0 && phase === "dashboard") {
          browserFaceService.stopCamera(video);
          setPhase("unknown");
          setStatusText("Unknown user detected");
          return;
        }

        if (phase === "scan") {
          scheduleNext();
          return;
        }

        if (!detection.isFaceDetected) {
          scheduleNext();
          return;
        }

        if (faceMode === "unknown_person") {
          browserFaceService.stopCamera(video);
          setPhase("unknown");
          setStatusText("Unknown user detected");
          return;
        }

        browserFaceService.stopCamera(video);
        scheduleNext();
      } finally {
        if (cameraStarted && phase !== "scan") {
          browserFaceService.stopCamera(video);
        }
      }
    };

    void runDetection();

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      browserFaceService.stopCamera(activeVideoRef.current);
    };
  }, [
    browserFaceService,
    capturedName,
    faceMode,
    knownUsers,
    phase,
    registeredUser,
    simulatedFaceService
  ]);

  const startRegistration = async () => {
    await requestJson("/api/mirror/start-registration", {
      method: "POST",
      body: JSON.stringify({})
    });

    setCapturedName("");
    setCapturedFaceLabel(null);
    setCapturedFaceDescriptor(null);
    setProgress(0);
    setScanFaceVisible(false);
    setPhase("name");
    setStatusText("What is your name?");
  };

  const createUserAndConfirm = async (name: string) => {
    const faceLabel = capturedFaceLabel ?? browserFaceService.generateFaceLabel(name);
    let faceDescriptor = capturedFaceDescriptor;

    if (!faceDescriptor && faceMode === "live" && (scanVideoRef.current || idleVideoRef.current)) {
      const fallbackVideo = scanVideoRef.current ?? idleVideoRef.current;
      const fallbackDetection = await browserFaceService.detectFace({
        mode: "live",
        knownUsers: knownUsers.map(toSubject),
        activeUser: registeredUser ? toSubject(registeredUser) : null,
        video: fallbackVideo
      });

      if (fallbackDetection.isFaceDetected && fallbackDetection.faceDescriptor) {
        faceDescriptor = fallbackDetection.faceDescriptor;
      }
    }

    if (!faceDescriptor) {
      throw new Error("No face descriptor captured. Please scan your face again.");
    }

    const created = await requestJson<{ ok: boolean; user: User }>("/api/mirror/register-user", {
      method: "POST",
      body: JSON.stringify({
        name,
        faceLabel,
        faceDescriptor
      })
    });

    const confirmed = await requestJson<{ ok: boolean; user: User }>("/api/mirror/confirm-face", {
      method: "POST",
      body: JSON.stringify({
        userId: created.user.id,
        faceLabel: created.user.faceLabel
      })
    });

    setKnownUsers((current) => {
      const withoutDuplicate = current.filter((user) => user.id !== confirmed.user.id);
      return [...withoutDuplicate, confirmed.user];
    });
    setRegisteredUser(confirmed.user);
    setCapturedFaceLabel(confirmed.user.faceLabel);
    setCapturedFaceDescriptor(confirmed.user.faceDescriptor);
    setFaceMode("live");
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
      setCapturedFaceLabel(browserFaceService.generateFaceLabel(command.name));
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
      return;
    }

    if (currentPhase === "unknown") {
      if (command.intent === "START_REGISTRATION") {
        await startRegistration();
        return;
      }

      setStatusText("Say 'start registration' to begin");
    }
  };

  const showPanels = phase === "dashboard";
  const hiddenLiveCamera =
    faceMode === "live" && phase !== "scan" && phase !== "name" && phase !== "confirm" ? (
      <video
        ref={idleVideoRef}
        autoPlay
        muted
        playsInline
        className="pointer-events-none absolute -left-[9999px] h-px w-px opacity-0"
      />
    ) : null;

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
          videoRef={scanVideoRef}
          scanStatus={scanFaceVisible ? "Face detected" : "Waiting for face"}
          detectedFaceLabel={detectedFaceLabel}
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

    if (phase === "unknown") {
      return (
        <section className="flex flex-col items-center gap-5 text-center">
          {hiddenLiveCamera}
          <p className="text-xs uppercase tracking-[0.6em] text-white/45">mirror state</p>
          <h2 className="max-w-4xl text-4xl font-light tracking-[0.12em] sm:text-6xl lg:text-7xl">
            Unknown user detected
          </h2>
          <p className="max-w-2xl text-sm uppercase tracking-[0.3em] text-white/65 sm:text-base">
            Try again or start registration.
          </p>
          <VoiceControl
            prompt="Say: start registration"
            onCommand={handleVoiceCommand}
            helperText={statusText}
          />
        </section>
      );
    }

    return (
      <section className="flex flex-col items-center gap-5 text-center">
        {hiddenLiveCamera}
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

  return (
    <>
      <MirrorLayout
        showPanels={showPanels}
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
        center={
          <div className="relative">
            {centerContent}
            {phase === "dashboard" && detectedFaceLabel ? (
              <div className="mt-4 text-center text-[10px] uppercase tracking-[0.35em] text-white/20">
                detected: {detectedFaceLabel}
              </div>
            ) : null}
          </div>
        }
      />
      <PrototypePanel
        open={debugPanelOpen}
        mode={faceMode}
        onToggle={() => setDebugPanelOpen((current) => !current)}
        onModeChange={(mode) => setFaceMode(mode as FaceRecognitionMode)}
      />
    </>
  );
}
