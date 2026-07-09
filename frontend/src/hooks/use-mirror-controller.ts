import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { normalizeLanguage, type AppLanguage } from "../i18n/languages";
import { BrowserFaceRecognitionService } from "../services/face-recognition";
import type { DashboardSummaryRequest } from "../types/api";
import type { MirrorController } from "../types/mirror-controller";
import type { LocalizedMessage } from "../types/i18n";
import type { User } from "../types/user";
import type { MirrorPhase } from "../types/mirror-phase";
import { toSubject } from "../utils/face-recognition";
import { cancelSpeech, preloadSpeech, speakText as speakBrowserText, type SpeakTextOptions } from "../utils/speech";
import { getSpeechPrompt } from "../utils/speech-prompts";
import { useMirrorBootstrap } from "../controllers/mirror/use-mirror-bootstrap";
import { useMirrorFaceDetection } from "../controllers/mirror/use-mirror-face-detection";
import { useMirrorVoice } from "../controllers/mirror/use-mirror-voice";
import { dashboardPresenceTimeoutMs } from "../constants";
import {
  confirmMirrorFace,
  generateMirrorDashboardSummary,
  registerMirrorUser,
  startMirrorRegistration
} from "../api/mirror";
import { getUserAgendaToday, updateUserLanguage } from "../api/users";
import { getWeather } from "../api/weather";
import {
  buildKnownUsersWithUpdatedUser,
  initialMirrorState,
  mirrorReducer
} from "../features/mirror/mirror-reducer";

export const useMirrorController = (navigate: (path: string) => void): MirrorController => {
  const { t } = useTranslation();
  const browserFaceService = useMemo(() => new BrowserFaceRecognitionService(), []);
  const scanVideoRef = useRef<HTMLVideoElement | null>(null);
  const idleVideoRef = useRef<HTMLVideoElement | null>(null);
  const wakeStartedAtRef = useRef<number | null>(null);
  const registrationCompletingRef = useRef(false);
  const dashboardPresenceTimerRef = useRef<number | null>(null);
  const pendingLanguageChangeRef = useRef<AppLanguage | null>(null);

  const [state, dispatch] = useReducer(mirrorReducer, initialMirrorState);
  const {
    phase,
    statusMessage,
    progress,
    capturedName,
    capturedFaceLabel,
    capturedFaceDescriptor,
    registeredUser,
    knownUsers,
    weather,
    agenda,
    scanFaceVisible,
    isMirrorFadingOut,
    dashboardSummaryText
  } = state;

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

  const setPhase = useCallback((nextPhase: MirrorPhase) => {
    dispatch({ type: "PHASE_CHANGED", phase: nextPhase });
  }, []);

  const setStatusMessage = useCallback((message: LocalizedMessage) => {
    dispatch({ type: "STATUS_CHANGED", statusMessage: message });
  }, []);

  const setProgress = useCallback((value: number | ((current: number) => number)) => {
    dispatch({
      type: "REGISTRATION_SCAN_PROGRESS_CHANGED",
      progress: typeof value === "function" ? value(state.progress) : value
    });
  }, [state.progress]);

  const setCapturedName = useCallback((name: string) => {
    dispatch({ type: "CAPTURED_NAME_CHANGED", name });
  }, []);

  const setCapturedFaceLabel = useCallback((faceLabel: string | null) => {
    dispatch({ type: "CAPTURED_FACE_LABEL_CHANGED", faceLabel });
  }, []);

  const setCapturedFaceDescriptor = useCallback((faceDescriptor: string | null) => {
    dispatch({ type: "CAPTURED_FACE_DESCRIPTOR_CHANGED", faceDescriptor });
  }, []);

  const setRegisteredUser = useCallback((user: User | null) => {
    dispatch({ type: "REGISTERED_USER_CHANGED", user });
  }, []);

  const setKnownUsers = useCallback((users: User[]) => {
    dispatch({ type: "KNOWN_USERS_CHANGED", users });
  }, []);

  const setScanFaceVisible = useCallback((visible: boolean) => {
    dispatch({ type: "REGISTRATION_SCAN_FACE_VISIBILITY_CHANGED", visible });
  }, []);

  const setIsMirrorFadingOut = useCallback((isFadingOut: boolean) => {
    dispatch({ type: "MIRROR_FADING_CHANGED", isFadingOut });
  }, []);

  useEffect(() => {
    preloadSpeech();
  }, []);

  useEffect(() => {
    if (phase !== "hello") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      dispatch({ type: "PHASE_CHANGED", phase: "dashboard" });
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
          dispatch({ type: "PRESENCE_LOST" });
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
    const response = await getWeather(location);

    dispatch({ type: "WEATHER_LOADED", weather: response.weather });
    return response.weather;
  };

  const loadDashboardData = async (userId: number, location: string) => {
    const [weatherResponse, agendaResponse] = await Promise.all([
      loadWeatherForLocation(location),
      getUserAgendaToday(userId)
    ]);

    const summaryResponse = await generateMirrorDashboardSummary({
      weather: weatherResponse,
      appointmentCount: agendaResponse.events.length,
      language: normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
    } satisfies DashboardSummaryRequest);

    dispatch({
      type: "DASHBOARD_DATA_LOADED",
      weather: weatherResponse,
      agenda: agendaResponse.events,
      summary: summaryResponse.summary
    });
  };

  const startRegistration = async () => {
    await startMirrorRegistration();

    dispatch({ type: "REGISTRATION_STARTED" });
    registrationCompletingRef.current = false;
    navigate("/register");
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

    const created = await registerMirrorUser({
      name,
      faceLabel,
      faceDescriptor,
      preferredLanguage
    });

    const confirmed = await confirmMirrorFace({
      userId: created.user.id,
      faceLabel: created.user.faceLabel
    });

    dispatch({ type: "REGISTRATION_COMPLETED", user: confirmed.user });
    registrationCompletingRef.current = false;
    await loadDashboardData(confirmed.user.id, confirmed.user.location);
    navigate("/");
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

    const response = await updateUserLanguage(registeredUser.id, {
      preferredLanguage: language
    });

    dispatch({ type: "REGISTERED_USER_CHANGED", user: response.user });
    dispatch({
      type: "KNOWN_USERS_CHANGED",
      users: buildKnownUsersWithUpdatedUser(knownUsers, response.user)
    });
    await loadDashboardData(response.user.id, response.user.location);
  };

  const beginLanguageChange = (language: AppLanguage) => {
    pendingLanguageChangeRef.current = language;
    dispatch({ type: "LANGUAGE_CHANGE_STARTED" });
  };

  const finishLanguageChange = async () => {
    const targetLanguage = pendingLanguageChangeRef.current;
    pendingLanguageChangeRef.current = null;

    if (!targetLanguage || !registeredUser) {
      dispatch({ type: "MIRROR_FADING_CHANGED", isFadingOut: false });
      return;
    }

    await i18n.changeLanguage(targetLanguage);
    await persistUserLanguage(targetLanguage);
    dispatch({ type: "LANGUAGE_CHANGE_COMPLETED" });
    navigate("/");
  };

  const sleepMirror = () => {
    clearDashboardPresenceTimer();
    cancelSpeech();
    wakeStartedAtRef.current = null;
    dispatch({ type: "SLEEP_REQUESTED" });
    navigate("/");
  };

  const wakeMirror = () => {
    wakeStartedAtRef.current = Date.now();
    dispatch({ type: "WAKE_REQUESTED", hasKnownUsers: knownUsers.length > 0 });
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
