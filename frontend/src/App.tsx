import { useEffect, useMemo, useRef, useState } from "react";
import MirrorLayout from "./components/mirror-layout";
import LocalTime from "./components/local-time";
import WeatherForecast from "./components/weather-forecast";
import Agenda from "./components/agenda";
import RegistrationFlow from "./components/registration-flow";
import VoiceControl from "./components/voice-control";
import DeviceStatus from "./components/device-status";
import FadeTransition from "./components/fade-transition";
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
  location: string;
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

type WeatherData = {
  location: string;
  updatedAt: string;
  current: {
    temperatureC: number;
    condition: string;
    feelsLikeC: number;
    humidity: number;
    windKph: number;
    rainChancePct: number | null;
  };
  forecast: Array<{
    label: string;
    temperatureC: number;
    condition: string;
    rainChancePct: number | null;
  }>;
  note: string;
};

type WeatherResponse = {
  userId: number;
  weather: WeatherData;
};

type WeatherEnvelope = {
  weather: WeatherData;
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

type VoicePhase = "idle" | "waking" | "hello" | "name" | "scan" | "confirm" | "dashboard" | "unknown";
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

const isWakePhrase = (value: string) =>
  value.includes("hey mirror") || value.includes("hello mirror");

const isSleepPhrase = (value: string) =>
  value.includes("bye mirror") || value.includes("goodbye mirror");

export default function App() {
  const browserFaceService = useMemo(() => new BrowserFaceRecognitionService(), []);
  const simulatedFaceService = useMemo(() => new SimulatedFaceRecognitionService(), []);
  const scanVideoRef = useRef<HTMLVideoElement | null>(null);
  const idleVideoRef = useRef<HTMLVideoElement | null>(null);
  const wakeStartedAtRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [statusText, setStatusText] = useState("Loading Mirror AI...");
  const [progress, setProgress] = useState(0);
  const [capturedName, setCapturedName] = useState("");
  const [capturedFaceLabel, setCapturedFaceLabel] = useState<string | null>(null);
  const [capturedFaceDescriptor, setCapturedFaceDescriptor] = useState<string | null>(null);
  const [detectedFaceLabel, setDetectedFaceLabel] = useState<string | null>(null);
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);
  const [knownUsers, setKnownUsers] = useState<User[]>([]);
  const [weather, setWeather] = useState<WeatherResponse["weather"] | null>(null);
  const [agenda, setAgenda] = useState<AgendaResponse["events"]>([]);
  const [faceMode, setFaceMode] = useState<FaceRecognitionMode>("live");
  const [scanFaceVisible, setScanFaceVisible] = useState(false);
  const [isMirrorFadingOut, setIsMirrorFadingOut] = useState(false);

  const deviceStatus = useMemo(
    () => ({
      camera:
        faceMode === "live" && phase === "scan"
          ? "scanning"
          : faceMode === "live"
            ? "polling"
            : "standby",
      microphone: "listening",
      network: "connected",
      battery: "92%"
    }),
    [faceMode, phase]
  );

  const loadWeatherForLocation = async (location: string) => {
    const response = await requestJson<WeatherEnvelope>(
      `/api/weather?location=${encodeURIComponent(location || "Amsterdam")}`
    );

    setWeather(response.weather);
    return response.weather;
  };

  const loadDashboardData = async (userId: number, location: string) => {
    const [, agendaResponse] = await Promise.all([
      loadWeatherForLocation(location),
      requestJson<AgendaResponse>(`/api/users/${userId}/agenda/today`)
    ]);

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
        setPhase("idle");
        setStatusText(
          faceApiReady
            ? "Say 'hey mirror' to wake"
            : "Face models are not loaded yet. Say 'hey mirror' to continue with voice mode."
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
        setRegisteredUser(null);
        setFaceMode("live");
        setPhase("idle");
        setStatusText("Say 'hey mirror' to wake");
        return;
      }

      setFaceMode("live");
      setPhase("idle");
      setStatusText(
        faceApiReady
          ? "Say 'hey mirror' to wake"
          : "Face models are not loaded yet. Say 'hey mirror' to continue with voice mode."
      );
    } catch {
      setFaceMode("live");
      setPhase("idle");
      setStatusText("Mirror backend unavailable");
    }
  };

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (phase !== "hello") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPhase("dashboard");
    }, 2000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [phase]);

  useEffect(() => {
    let cancelled = false;
    const faceService = faceMode === "live" ? browserFaceService : simulatedFaceService;
    let timeoutId: number | null = null;
    const delayMs = phase === "scan" || phase === "waking" ? 300 : 1000;
    const activeVideoRef = phase === "scan" ? scanVideoRef : idleVideoRef;

    const scheduleNext = () => {
      if (cancelled) {
        return;
      }

      timeoutId = window.setTimeout(() => {
        void runDetection().catch((error) => {
          if (!cancelled) {
            console.error("Face detection failed", error);
          }
        });
      }, delayMs);
    };

    const runDetection = async () => {
      const video = activeVideoRef.current;
      if (faceMode === "live" && video) {
        if (phase === "scan") {
          browserFaceService.stopCamera(idleVideoRef.current);
        }

        await browserFaceService.startCamera(video);
      }

      if (phase !== "scan" && phase !== "waking") {
        scheduleNext();
        return;
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

      if (phase === "waking") {
        const matchedUser = knownUsers.find((user) => user.faceLabel === detection.matchedUser?.faceLabel);

        if (matchedUser) {
          setRegisteredUser(matchedUser);
          await loadDashboardData(matchedUser.id, matchedUser.location);
          setPhase("hello");
          setStatusText(`Hello ${matchedUser.name}`);
          return;
        }

        const wakeStartedAt = wakeStartedAtRef.current ?? Date.now();
        const wakeTimedOut = Date.now() - wakeStartedAt > 3000;

        if (detection.isFaceDetected || faceMode === "unknown_person" || wakeTimedOut) {
          setPhase("unknown");
          setStatusText("Unknown user detected");
          return;
        }

        scheduleNext();
        return;
      }
    };

    void runDetection().catch((error) => {
      if (!cancelled) {
        console.error("Face detection failed", error);
      }
    });

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      if (activeVideoRef === scanVideoRef) {
        browserFaceService.stopCamera(activeVideoRef.current);
      }
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
    setDetectedFaceLabel(null);
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
    await loadDashboardData(confirmed.user.id, confirmed.user.location);
    setPhase("hello");
    setStatusText(`Hello ${confirmed.user.name}`);
  };

  const getUmbrellaAnswer = async (location: string) => {
    const payload = weather ?? (await loadWeatherForLocation(location));
    const rainChance = payload.current.rainChancePct;
    const rainChanceLabel = rainChance === null ? "unknown" : `${rainChance}%`;
    const shouldCarryUmbrella =
      typeof rainChance === "number"
        ? rainChance >= 50
        : /rain|shower|storm/i.test(payload.current.condition);

    if (shouldCarryUmbrella) {
      return `Yes. Rain chance is ${rainChanceLabel} in ${payload.location}. Bring an umbrella.`;
    }

    return `Probably not. Rain chance is ${rainChanceLabel} in ${payload.location}.`;
  };

  const sleepMirror = () => {
    wakeStartedAtRef.current = null;
    setIsMirrorFadingOut(false);
    setPhase("idle");
    setRegisteredUser(null);
    setWeather(null);
    setAgenda([]);
    setDetectedFaceLabel(null);
    setStatusText("Say 'hey mirror' to wake");
  };

  const wakeMirror = () => {
    wakeStartedAtRef.current = Date.now();
    setIsMirrorFadingOut(false);
    setDetectedFaceLabel(null);

    if (knownUsers.length === 0) {
      setPhase("unknown");
      setStatusText("Unknown user detected");
      return;
    }

    setPhase("waking");
    setStatusText("Checking face");
  };

  const handleVoiceCommand = async (spokenText: string) => {
    const normalizedSpeech = spokenText.toLowerCase();
    console.info("[Mirror voice] handling command:", normalizedSpeech);

    if (isSleepPhrase(normalizedSpeech)) {
      if (phase === "idle") {
        sleepMirror();
        return;
      }

      setIsMirrorFadingOut(true);
      return;
    }

    if (isWakePhrase(normalizedSpeech)) {
      wakeMirror();
      return;
    }

    if (phase === "idle" || phase === "waking" || phase === "hello") {
      return;
    }

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
        if (spokenText.toLowerCase().includes("umbrella")) {
          const answer = await getUmbrellaAnswer(registeredUser?.location ?? weather?.location ?? "Amsterdam");
          setStatusText(answer);
          return;
        }

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
  const shouldShowMirror = phase !== "idle" && !isMirrorFadingOut;
  const hiddenLiveCamera =
    faceMode === "live" && phase !== "scan" ? (
      <video
        ref={idleVideoRef}
        autoPlay
        muted
        playsInline
        className="pointer-events-none absolute -left-[9999px] h-px w-px opacity-0"
      />
    ) : null;

  const centerContent = (() => {
    if (phase === "idle" || phase === "waking") {
      return null;
    }

    if (phase === "name") {
      return (
        <RegistrationFlow
          step="name"
          name={capturedName}
          progress={0}
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
          helperText={statusText}
          videoRef={scanVideoRef}
          scanStatus={scanFaceVisible ? "Face detected" : "Waiting for face"}
        />
      );
    }

    if (phase === "confirm") {
      return (
        <RegistrationFlow
          step="confirm"
          name={capturedName}
          progress={100}
          helperText={statusText}
        />
      );
    }

    if (phase === "hello") {
      return (
        <section className="flex flex-col items-center gap-4 text-center">
          <h2 className="max-w-4xl text-4xl font-light tracking-[0.12em] sm:text-6xl lg:text-7xl">
            Hello {registeredUser?.name ?? "Mirror user"}
          </h2>
        </section>
      );
    }

    if (phase === "unknown") {
      return (
        <section className="flex flex-col items-center gap-5 text-center">
          <h2 className="max-w-4xl text-4xl font-light tracking-[0.12em] sm:text-6xl lg:text-7xl">
            Unknown user
          </h2>
          <p className="max-w-2xl text-sm uppercase tracking-[0.3em] text-white/65 sm:text-base">
            Say start registration
          </p>
        </section>
      );
    }

    return null;
  })();

  return (
    <>
      {hiddenLiveCamera}
      <FadeTransition
        show={shouldShowMirror}
        className="min-h-screen"
        onExited={() => {
          if (isMirrorFadingOut) {
            sleepMirror();
          }
        }}
      >
        <FadeTransition transitionKey={phase} className="min-h-screen">
          <MirrorLayout
            showPanels={showPanels}
            showGradient={phase === "hello"}
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
            center={<div className="relative">{centerContent}</div>}
          />
        </FadeTransition>
      </FadeTransition>
      <VoiceControl
        prompt="Say: hey mirror"
        onCommand={handleVoiceCommand}
        helperText={statusText}
        visible={false}
      />
    </>
  );
}
