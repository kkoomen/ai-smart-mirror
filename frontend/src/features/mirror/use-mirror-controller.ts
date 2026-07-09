import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { AppLanguage } from "../../i18n/languages";
import { BrowserFaceRecognitionService } from "../../services/face-recognition";
import type { MirrorController } from "../../types/mirror-controller";
import type { LocalizedMessage } from "../../types/i18n";
import type { User } from "../../types/user";
import { cancelSpeech } from "../../utils/speech";
import { useMirrorBootstrap } from "./controllers/use-mirror-bootstrap";
import { useMirrorFaceDetection } from "./controllers/use-mirror-face-detection";
import { useMirrorVoice } from "./controllers/use-mirror-voice";
import { useDashboardData } from "./controllers/use-dashboard-data";
import { useDashboardPresence } from "./controllers/use-dashboard-presence";
import { useLanguageFlow } from "./controllers/use-language-flow";
import { useMirrorSpeech } from "./controllers/use-mirror-speech";
import { useRegistrationFlow } from "./controllers/use-registration-flow";
import { initialMirrorState, mirrorReducer } from "./mirror-reducer";

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

  const setStatusMessage = useCallback((message: LocalizedMessage) => {
    dispatch({ type: "STATUS_CHANGED", statusMessage: message });
  }, []);

  const setProgress = useCallback((value: number | ((current: number) => number)) => {
    dispatch({
      type: "REGISTRATION_SCAN_PROGRESS_CHANGED",
      progress: typeof value === "function" ? value(state.progress) : value
    });
  }, [state.progress]);

  const setScanFaceVisible = useCallback((visible: boolean) => {
    dispatch({ type: "REGISTRATION_SCAN_FACE_VISIBILITY_CHANGED", visible });
  }, []);

  const setIsMirrorFadingOut = useCallback((isFadingOut: boolean) => {
    dispatch({ type: "MIRROR_FADING_CHANGED", isFadingOut });
  }, []);

  const clearDashboardPresenceTimer = useCallback(() => {
    if (dashboardPresenceTimerRef.current !== null) {
      window.clearTimeout(dashboardPresenceTimerRef.current);
      dashboardPresenceTimerRef.current = null;
    }
  }, []);

  const bootstrapActions = useMemo(
    () => ({
      enterIdle: () => {
        dispatch({ type: "REGISTERED_USER_CHANGED", user: null });
        dispatch({ type: "PHASE_CHANGED", phase: "idle" });
        dispatch({ type: "STATUS_CHANGED", statusMessage: { key: "status.sayHeyMirrorToWake" } });
      },
      failBootstrap: () => {
        dispatch({ type: "BOOTSTRAP_FAILED", statusMessage: { key: "status.backendUnavailable" } });
      },
      loadKnownUsers: (users: User[]) => {
        dispatch({ type: "BOOTSTRAP_SUCCEEDED", knownUsers: users });
      },
      restoreRegistrationUser: (user: User) => {
        dispatch({ type: "REGISTERED_USER_CHANGED", user });
        dispatch({ type: "CAPTURED_NAME_CHANGED", name: user.name });
        dispatch({ type: "CAPTURED_FACE_LABEL_CHANGED", faceLabel: user.faceLabel });
        dispatch({ type: "CAPTURED_FACE_DESCRIPTOR_CHANGED", faceDescriptor: user.faceDescriptor });
        dispatch({ type: "PHASE_CHANGED", phase: "nameConfirm" });
        dispatch({ type: "STATUS_CHANGED", statusMessage: { key: "register.flow.yesNoTryAgain" } });
      }
    }),
    []
  );

  const faceDetectionActions = useMemo(
    () => ({
      captureFaceDescriptor: (faceDescriptor: string | null) => {
        dispatch({ type: "REGISTRATION_FACE_DESCRIPTOR_CAPTURED", faceDescriptor });
      },
      completeWake: (user: User) => {
        dispatch({ type: "REGISTERED_USER_CHANGED", user });
        dispatch({ type: "PHASE_CHANGED", phase: "hello" });
        dispatch({ type: "STATUS_CHANGED", statusMessage: { key: "status.hello", values: { name: user.name } } });
      },
      markUnknownUser: () => {
        dispatch({ type: "PHASE_CHANGED", phase: "unknown" });
        dispatch({ type: "STATUS_CHANGED", statusMessage: { key: "status.unknownUserDetected" } });
      },
      resetToScan: () => {
        dispatch({ type: "PHASE_CHANGED", phase: "scan" });
      },
      setScanFaceVisible,
      setStatus: setStatusMessage,
      updateScanProgress: setProgress
    }),
    [setProgress, setScanFaceVisible, setStatusMessage]
  );

  const mirrorActions = useMemo(
    () => ({
      fadeOut: () => {
        dispatch({ type: "MIRROR_FADING_CHANGED", isFadingOut: true });
      },
      openLanguageChange: () => {
        navigate("/change-lang");
        dispatch({ type: "PHASE_CHANGED", phase: "changeLanguage" });
        dispatch({ type: "STATUS_CHANGED", statusMessage: { key: "status.changeLanguagePrompt" } });
      },
      setStatus: setStatusMessage,
      sleep: () => {
        clearDashboardPresenceTimer();
        cancelSpeech();
        wakeStartedAtRef.current = null;
        dispatch({ type: "SLEEP_REQUESTED" });
        navigate("/");
      },
      wake: () => {
        wakeStartedAtRef.current = Date.now();
        dispatch({ type: "WAKE_REQUESTED", hasKnownUsers: knownUsers.length > 0 });
      }
    }),
    [knownUsers.length, navigate, setStatusMessage]
  );

  const registrationActions = useMemo(
    () => ({
      captureName: (name: string) => {
        dispatch({
          type: "REGISTRATION_NAME_CAPTURED",
          name,
          faceLabel: browserFaceService.generateFaceLabel(name)
        });
      },
      rejectName: () => {
        dispatch({ type: "REGISTRATION_NAME_REJECTED" });
      },
      startScan: () => {
        registrationCompletingRef.current = false;
        dispatch({ type: "REGISTRATION_SCAN_STARTED" });
      }
    }),
    [browserFaceService, registrationCompletingRef]
  );

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

  const languageActions = useMemo(
    () => ({
      beginChange: beginLanguageChange
    }),
    [beginLanguageChange]
  );
  const sleepMirror = mirrorActions.sleep;
  const wakeMirror = mirrorActions.wake;

  useMirrorBootstrap({
    browserFaceService,
    bootstrapActions,
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
    faceDetectionActions,
    wakeStartedAtRef,
    speakText
  });

  const handleVoiceCommand = useMirrorVoice({
    phase,
    registeredUser,
    mirrorActions,
    registrationActions,
    languageActions,
    clearDashboardPresenceTimer,
    startRegistration,
    createUserAndConfirm,
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
