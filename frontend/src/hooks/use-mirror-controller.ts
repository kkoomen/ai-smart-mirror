import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { normalizeLanguage, type AppLanguage } from "../i18n/languages";
import { BrowserFaceRecognitionService } from "../services/face-recognition";
import type { AgendaResponse } from "../types/agenda";
import type { DashboardSummaryRequest, DashboardSummaryResponse } from "../types/api";
import type { MirrorController } from "../types/mirror-controller";
import type { LocalizedMessage } from "../types/i18n";
import type { UserLanguageMutationRequest, UserMutationResponse } from "../types/api";
import type { User } from "../types/user";
import type { MirrorPhase } from "../types/mirror-phase";
import type { WeatherData, WeatherEnvelope } from "../types/weather";
import { requestJson } from "../utils/request-json";
import { toSubject } from "../utils/face-recognition";
import { cancelSpeech, preloadSpeech, speakText as speakBrowserText, type SpeakTextOptions } from "../utils/speech";
import { getSpeechPrompt } from "../utils/speech-prompts";
import { useMirrorBootstrap } from "../controllers/mirror/use-mirror-bootstrap";
import { useMirrorFaceDetection } from "../controllers/mirror/use-mirror-face-detection";
import { useMirrorVoice } from "../controllers/mirror/use-mirror-voice";
import { dashboardPresenceTimeoutMs } from "../constants";

export const useMirrorController = (navigate: (path: string) => void): MirrorController => {
  const { t } = useTranslation();
  const browserFaceService = useMemo(() => new BrowserFaceRecognitionService(), []);
  const scanVideoRef = useRef<HTMLVideoElement | null>(null);
  const idleVideoRef = useRef<HTMLVideoElement | null>(null);
  const wakeStartedAtRef = useRef<number | null>(null);
  const registrationCompletingRef = useRef(false);
  const dashboardPresenceTimerRef = useRef<number | null>(null);
  const pendingLanguageChangeRef = useRef<AppLanguage | null>(null);

  const [phase, setPhase] = useState<MirrorPhase>("idle");
  const [statusMessage, setStatusMessage] = useState<LocalizedMessage>({ key: "status.loading" });
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
  const [dashboardSummaryText, setDashboardSummaryText] = useState("");

  const deviceStatus = useMemo(
    () => ({
      camera: phase === "scan" ? "scanning" : "polling",
      microphone: "listening" as const,
      network: "connected" as const,
      battery: "92%"
    }),
    [phase]
  );

  const statusText = useMemo(
    () => t(statusMessage.key, statusMessage.values),
    [statusMessage, t]
  );

  useEffect(() => {
    preloadSpeech();
  }, []);

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

  const speakText = useCallback(
    (text: string, language?: AppLanguage, interrupt = true, options?: SpeakTextOptions) => {
      speakBrowserText(
        text,
        language ?? normalizeLanguage(i18n.resolvedLanguage ?? i18n.language),
        interrupt,
        options
      );
    },
    [i18n.language, i18n.resolvedLanguage]
  );

  const loadWeatherForLocation = async (location: string) => {
    const response = await requestJson<WeatherEnvelope>(
      `/api/weather?location=${encodeURIComponent(location || "Amsterdam")}`
    );

    setWeather(response.weather);
    return response.weather;
  };

  const loadDashboardData = async (userId: number, location: string) => {
    const [weatherResponse, agendaResponse] = await Promise.all([
      loadWeatherForLocation(location),
      requestJson<AgendaResponse>(`/api/users/${userId}/agenda/today`)
    ]);

    setAgenda(agendaResponse.events);

    const summaryResponse = await requestJson<DashboardSummaryResponse>("/api/mirror/dashboard-summary", {
      method: "POST",
      body: JSON.stringify({
        weather: weatherResponse,
        appointmentCount: agendaResponse.events.length,
        language: normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
      } satisfies DashboardSummaryRequest)
    });

    setDashboardSummaryText(summaryResponse.summary);
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
    setStatusMessage({ key: "status.sayYourName" });
  };

  const createUserAndConfirm = async (name: string, faceDescriptorOverride?: string | null) => {
    const preferredLanguage = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
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
        faceDescriptor,
        preferredLanguage
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
    setStatusMessage({ key: "status.hello", values: { name: confirmed.user.name } });
    speakText(
      getSpeechPrompt("hello", normalizeLanguage(confirmed.user.preferredLanguage), {
        name: confirmed.user.name
      }),
      normalizeLanguage(confirmed.user.preferredLanguage)
    );
  };

  const persistUserLanguage = async (language: AppLanguage) => {
    if (!registeredUser) {
      return;
    }

    const response = await requestJson<UserMutationResponse>(`/api/users/${registeredUser.id}/language`, {
      method: "POST",
      body: JSON.stringify({
        preferredLanguage: language
      } satisfies UserLanguageMutationRequest)
    });

    setRegisteredUser(response.user);
    setKnownUsers((current) =>
      current.map((user) => (user.id === response.user.id ? response.user : user))
    );
    await loadDashboardData(response.user.id, response.user.location);
  };

  const beginLanguageChange = (language: AppLanguage) => {
    pendingLanguageChangeRef.current = language;
    setIsMirrorFadingOut(true);
  };

  const finishLanguageChange = async () => {
    const targetLanguage = pendingLanguageChangeRef.current;
    pendingLanguageChangeRef.current = null;

    if (!targetLanguage || !registeredUser) {
      setIsMirrorFadingOut(false);
      return;
    }

    await i18n.changeLanguage(targetLanguage);
    await persistUserLanguage(targetLanguage);
    setPhase("dashboard");
    setStatusMessage({ key: "status.languageChanged" });
    setIsMirrorFadingOut(false);
    navigate("/");
  };

  const sleepMirror = () => {
    clearDashboardPresenceTimer();
    setDashboardSummaryText("");
    cancelSpeech();
    wakeStartedAtRef.current = null;
    setIsMirrorFadingOut(false);
    setPhase("idle");
    setRegisteredUser(null);
    setWeather(null);
    setAgenda([]);
    setStatusMessage({ key: "status.sayHeyMirrorToWake" });
    navigate("/");
  };

  const wakeMirror = () => {
    wakeStartedAtRef.current = Date.now();
    setIsMirrorFadingOut(false);

    if (knownUsers.length === 0) {
      setPhase("unknown");
      setStatusMessage({ key: "status.unknownUserDetected" });
      return;
    }

    setPhase("waking");
    setStatusMessage({ key: "status.checkingFace" });
  };

  useMirrorBootstrap({
    browserFaceService,
    setKnownUsers,
    setRegisteredUser,
    setCapturedName,
    setCapturedFaceLabel,
    setCapturedFaceDescriptor,
    setPhase,
    setStatusText: setStatusMessage,
    speakText
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
    setStatusText: setStatusMessage,
    wakeStartedAtRef,
    speakText
  });

  const handleVoiceCommand = useMirrorVoice({
    phase,
    registeredUser,
    wakeMirror,
    sleepMirror,
    beginLanguageChange,
    clearDashboardPresenceTimer,
    startRegistration,
    createUserAndConfirm,
    browserFaceService,
    navigate,
    setPhase,
    setStatusText: setStatusMessage,
    setMirrorFadingOut: setIsMirrorFadingOut,
    setCapturedName,
    setCapturedFaceLabel,
    setCapturedFaceDescriptor,
    setProgress,
    setScanFaceVisible,
    registrationCompletingRef,
    capturedName,
    hasRegisteredUsers: knownUsers.length > 0,
    persistUserLanguage,
    speakText
  });

  return {
    phase,
    statusText,
    progress,
    capturedName,
    registeredUser,
    hasRegisteredUsers: knownUsers.length > 0,
    weather,
    agenda,
    scanFaceVisible,
    isMirrorFadingOut,
    dashboardSummaryText,
    deviceStatus,
    scanVideoRef,
    idleVideoRef,
    wakeMirror,
    sleepMirror,
    beginLanguageChange,
    finishLanguageChange,
    startRegistration,
    handleVoiceCommand,
    setMirrorFadingOut: setIsMirrorFadingOut,
    browserFaceService,
    speakText
  };
};
