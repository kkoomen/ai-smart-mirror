import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserFaceRecognitionService } from "../services/face-recognition";
import type { AgendaResponse } from "../types/agenda";
import type { MirrorController } from "../types/mirror-controller";
import type { UserMutationResponse } from "../types/api";
import type { User } from "../types/user";
import type { VoicePhase } from "../types/voice";
import type { WeatherData, WeatherEnvelope } from "../types/weather";
import { requestJson } from "../utils/request-json";
import { toSubject } from "../utils/face-recognition";
import { useMirrorBootstrap } from "../controllers/mirror/use-mirror-bootstrap";
import { useMirrorFaceDetection } from "../controllers/mirror/use-mirror-face-detection";
import { useMirrorVoice } from "../controllers/mirror/use-mirror-voice";
import { dashboardPresenceTimeoutMs } from "../constants";

export const useMirrorController = (navigate: (path: string) => void): MirrorController => {
  const browserFaceService = useMemo(() => new BrowserFaceRecognitionService(), []);
  const scanVideoRef = useRef<HTMLVideoElement | null>(null);
  const idleVideoRef = useRef<HTMLVideoElement | null>(null);
  const wakeStartedAtRef = useRef<number | null>(null);
  const registrationCompletingRef = useRef(false);
  const dashboardPresenceTimerRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (phase !== "hello") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPhase("dashboard");
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [phase]);

  useEffect(() => {
    if (phase !== "dashboard" || !registeredUser) {
      return;
    }

    let cancelled = false;
    dashboardPresenceTimerRef.current = window.setTimeout(async () => {
      if (cancelled) {
        return;
      }

      try {
        const detection = await browserFaceService.detectFace({
          knownUsers: knownUsers.map(toSubject),
          video: idleVideoRef.current
        });

        const activeFaceLabel = registeredUser.faceLabel;
        const matchedFaceLabel = detection.matchedUser?.faceLabel ?? null;

        if (!detection.isFaceDetected || matchedFaceLabel !== activeFaceLabel) {
          setIsMirrorFadingOut(true);
        }
      } catch (error) {
        console.error("Dashboard presence check failed", error);
      }
    }, dashboardPresenceTimeoutMs);

    return () => {
      cancelled = true;
      if (dashboardPresenceTimerRef.current !== null) {
        window.clearTimeout(dashboardPresenceTimerRef.current);
        dashboardPresenceTimerRef.current = null;
      }
    };
  }, [browserFaceService, idleVideoRef, knownUsers, phase, registeredUser]);

  const clearDashboardPresenceTimer = () => {
    if (dashboardPresenceTimerRef.current !== null) {
      window.clearTimeout(dashboardPresenceTimerRef.current);
      dashboardPresenceTimerRef.current = null;
    }
  };

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

    const created = await requestJson<UserMutationResponse>("/api/mirror/register-user", {
      method: "POST",
      body: JSON.stringify({
        name,
        faceLabel,
        faceDescriptor
      })
    });

    const confirmed = await requestJson<UserMutationResponse>("/api/mirror/confirm-face", {
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
    clearDashboardPresenceTimer();
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

  useMirrorBootstrap({
    browserFaceService,
    setKnownUsers,
    setRegisteredUser,
    setCapturedName,
    setCapturedFaceLabel,
    setCapturedFaceDescriptor,
    setPhase,
    setStatusText
  });

  useMirrorFaceDetection({
    browserFaceService,
    capturedName,
    createUserAndConfirm,
    idleVideoRef,
    knownUsers,
    loadDashboardData,
    phase,
    registrationCompletingRef,
    scanVideoRef,
    setCapturedFaceDescriptor,
    setPhase,
    setProgress,
    setRegisteredUser,
    setScanFaceVisible,
    setStatusText,
    wakeStartedAtRef
  });

  const handleVoiceCommand = useMirrorVoice({
    phase,
    registeredUser,
    weather,
    wakeMirror,
    sleepMirror,
    clearDashboardPresenceTimer,
    startRegistration,
    createUserAndConfirm,
    getUmbrellaAnswer,
    browserFaceService,
    navigate,
    setPhase,
    setStatusText,
    setMirrorFadingOut: setIsMirrorFadingOut,
    setCapturedName,
    setCapturedFaceLabel,
    setCapturedFaceDescriptor,
    setProgress,
    setScanFaceVisible,
    registrationCompletingRef,
    capturedName
  });

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
