import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { BrowserFaceRecognitionService, type FaceRecognitionSubject } from "../services/face-recognition";

export type User = {
  id: number;
  name: string;
  faceLabel: string;
  faceDescriptor: string | null;
  location: string;
  createdAt: string;
};

export type MirrorStateResponse = {
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

type VoicePhase =
  | "idle"
  | "waking"
  | "hello"
  | "name"
  | "nameConfirm"
  | "scan"
  | "confirm"
  | "dashboard"
  | "unknown";

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

export type MirrorController = {
  phase: VoicePhase;
  statusText: string;
  progress: number;
  capturedName: string;
  registeredUser: User | null;
  weather: WeatherData | null;
  agenda: AgendaResponse["events"];
  scanFaceVisible: boolean;
  isMirrorFadingOut: boolean;
  deviceStatus: {
    camera: "scanning" | "polling";
    microphone: "listening";
    network: "connected";
    battery: string;
  };
  scanVideoRef: RefObject<HTMLVideoElement | null>;
  idleVideoRef: RefObject<HTMLVideoElement | null>;
  wakeMirror: () => void;
  sleepMirror: () => void;
  startRegistration: () => Promise<void>;
  handleVoiceCommand: (spokenText: string) => Promise<void>;
  setMirrorFadingOut: (value: boolean) => void;
  browserFaceService: BrowserFaceRecognitionService;
};

export const useMirrorController = (navigate: (path: string) => void) => {
  const browserFaceService = useMemo(() => new BrowserFaceRecognitionService(), []);
  const scanVideoRef = useRef<HTMLVideoElement | null>(null);
  const idleVideoRef = useRef<HTMLVideoElement | null>(null);
  const wakeStartedAtRef = useRef<number | null>(null);
  const registrationCompletingRef = useRef(false);
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [statusText, setStatusText] = useState("Loading Mirror AI...");
  const [progress, setProgress] = useState(0);
  const [capturedName, setCapturedName] = useState("");
  const [capturedFaceLabel, setCapturedFaceLabel] = useState<string | null>(null);
  const [capturedFaceDescriptor, setCapturedFaceDescriptor] = useState<string | null>(null);
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);
  const [knownUsers, setKnownUsers] = useState<User[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [agenda, setAgenda] = useState<AgendaResponse["events"]>([]);
  const [scanFaceVisible, setScanFaceVisible] = useState(false);
  const [isMirrorFadingOut, setIsMirrorFadingOut] = useState(false);

  const deviceStatus = useMemo(
    () => ({
      camera: phase === "scan" ? "scanning" : "polling",
      microphone: "listening" as const,
      network: "connected" as const,
      battery: "92%"
    }),
    [phase]
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
        setPhase("nameConfirm");
        setStatusText("Say yes, no, or try again");
        return;
      }

      if (mirrorState.registrationComplete && mirrorState.activeUser) {
        setRegisteredUser(null);
        setPhase("idle");
        setStatusText("Say 'hey mirror' to wake");
        return;
      }

      setPhase("idle");
      setStatusText(
        faceApiReady
          ? "Say 'hey mirror' to wake"
          : "Face models are not loaded yet. Say 'hey mirror' to continue with voice mode."
      );
    } catch {
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
      if (video) {
        if (phase === "scan") {
          browserFaceService.stopCamera(idleVideoRef.current);
        }

        await browserFaceService.startCamera(video);
      }

      if (phase !== "scan" && phase !== "waking") {
        scheduleNext();
        return;
      }

      const detection = await browserFaceService.detectFace({
        knownUsers: knownUsers.map(toSubject),
        video
      });

      if (cancelled) {
        return;
      }

      if (phase === "scan") {
        setScanFaceVisible(detection.isFaceDetected);

        if (detection.faceDescriptor) {
          setCapturedFaceDescriptor(detection.faceDescriptor);
        }

        if (detection.isFaceDetected) {
          setProgress((current) => {
            const next = Math.min(100, current + 18);

            if (current < 100 && next >= 100 && !registrationCompletingRef.current) {
              registrationCompletingRef.current = true;
              setStatusText("Completing registration");
              window.setTimeout(() => {
                if (cancelled) {
                  return;
                }

                void createUserAndConfirm(capturedName || "Mirror user", detection.faceDescriptor).catch(
                  (error) => {
                    registrationCompletingRef.current = false;
                    setStatusText(
                      error instanceof Error
                        ? error.message
                        : "Registration failed. Please try again."
                    );
                    setPhase("scan");
                  }
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

        if (detection.isFaceDetected || wakeTimedOut) {
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
  }, [browserFaceService, capturedName, knownUsers, phase, registeredUser]);

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
    registrationCompletingRef.current = false;
    navigate("/register");
    setPhase("name");
    setStatusText("Say your name");
  };

  const createUserAndConfirm = async (name: string, faceDescriptorOverride?: string | null) => {
    const faceLabel = capturedFaceLabel ?? browserFaceService.generateFaceLabel(name);
    let faceDescriptor = faceDescriptorOverride ?? capturedFaceDescriptor;

    if (!faceDescriptor && (scanVideoRef.current || idleVideoRef.current)) {
      const fallbackVideo = scanVideoRef.current ?? idleVideoRef.current;
      const fallbackDetection = await browserFaceService.detectFace({
        knownUsers: knownUsers.map(toSubject),
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
    registrationCompletingRef.current = false;
    await loadDashboardData(confirmed.user.id, confirmed.user.location);
    navigate("/");
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
    setStatusText("Say 'hey mirror' to wake");
    navigate("/");
  };

  const wakeMirror = () => {
    wakeStartedAtRef.current = Date.now();
    setIsMirrorFadingOut(false);

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

    if (phase === "idle" && normalizedSpeech.includes("start registration")) {
      navigate("/register");
      await startRegistration();
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
        setStatusText("Say your name");
        return;
      }

      setCapturedName(command.name);
      setCapturedFaceLabel(browserFaceService.generateFaceLabel(command.name));
      setPhase("nameConfirm");
      setStatusText("Say yes, no, or try again");
      return;
    }

    if (currentPhase === "nameConfirm") {
      if (command.intent === "CONFIRM_NO") {
        setCapturedName("");
        setCapturedFaceLabel(null);
        setPhase("name");
        setStatusText("Say your name");
        return;
      }

      if (command.intent !== "CONFIRM_YES") {
        setStatusText("Say yes, no, or try again");
        return;
      }

      setCapturedFaceDescriptor(null);
      setProgress(0);
      setScanFaceVisible(false);
      registrationCompletingRef.current = false;
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
        navigate("/register");
        await startRegistration();
        return;
      }

      setStatusText("Say 'start registration' to begin");
    }
  };

  return {
    phase,
    statusText,
    progress,
    capturedName,
    registeredUser,
    weather,
    agenda,
    scanFaceVisible,
    isMirrorFadingOut,
    deviceStatus,
    scanVideoRef,
    idleVideoRef,
    wakeMirror,
    sleepMirror,
    startRegistration,
    handleVoiceCommand,
    setMirrorFadingOut: setIsMirrorFadingOut,
    browserFaceService
  };
};
