import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { AppLanguage } from "../i18n/languages";
import { BrowserFaceRecognitionService } from "../services/face-recognition";
import type { MirrorController } from "../types/mirror-controller";
import type { LocalizedMessage } from "../types/i18n";
import type { User } from "../types/user";
import type { MirrorPhase } from "../types/mirror-phase";
import { cancelSpeech } from "../utils/speech";
import { useMirrorBootstrap } from "../controllers/mirror/use-mirror-bootstrap";
import { useMirrorFaceDetection } from "../controllers/mirror/use-mirror-face-detection";
import { useMirrorVoice } from "../controllers/mirror/use-mirror-voice";
import { useDashboardData } from "../controllers/mirror/use-dashboard-data";
import { useDashboardPresence } from "../controllers/mirror/use-dashboard-presence";
import { useLanguageFlow } from "../controllers/mirror/use-language-flow";
import { useMirrorSpeech } from "../controllers/mirror/use-mirror-speech";
import { useRegistrationFlow } from "../controllers/mirror/use-registration-flow";
import { initialMirrorState, mirrorReducer } from "../features/mirror/mirror-reducer";

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
    if (phase !== "hello") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      dispatch({ type: "PHASE_CHANGED", phase: "dashboard" });
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [phase]);

  useDashboardPresence({
    browserFaceService,
    dashboardPresenceTimerRef,
    dispatch,
    idleVideoRef,
    knownUsers,
    phase,
    registeredUser
  });

  const clearDashboardPresenceTimer = () => {
    if (dashboardPresenceTimerRef.current !== null) {
      window.clearTimeout(dashboardPresenceTimerRef.current);
      dashboardPresenceTimerRef.current = null;
    }
  };

  const speakText = useMirrorSpeech();
  const { loadDashboardData } = useDashboardData(dispatch);
  const { createUserAndConfirm, startRegistration } = useRegistrationFlow({
    browserFaceService,
    capturedFaceDescriptor,
    capturedFaceLabel,
    dispatch,
    idleVideoRef,
    knownUsers,
    loadDashboardData,
    navigate,
    registrationCompletingRef,
    scanVideoRef,
    speakText
  });
  const { beginLanguageChange, finishLanguageChange, persistUserLanguage } = useLanguageFlow({
    dispatch,
    knownUsers,
    loadDashboardData,
    navigate,
    pendingLanguageChangeRef,
    registeredUser
  });

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
