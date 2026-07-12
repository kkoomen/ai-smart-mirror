import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";
import { normalizeLanguage, type AppLanguage } from "../i18n/languages";
import { BrowserFaceRecognitionService } from "../services/face-recognition";
import { initialMirrorState, mirrorReducer, type MirrorWidget } from "../state/mirror-reducer";
import type { LocalizedMessage } from "../types/i18n";
import type { MirrorController } from "../types/mirror-controller";
import type { User } from "../types/user";
import { cancelSpeech } from "../utils/speech";
import { getSpeechPrompt } from "../utils/speech-prompts";
import { useDashboardData } from "./use-dashboard-data";
import { useDashboardPresence } from "./use-dashboard-presence";
import { useLanguageFlow } from "./use-language-flow";
import { useMirrorBootstrap } from "./use-mirror-bootstrap";
import { useMirrorFaceDetection } from "./use-mirror-face-detection";
import { useMirrorSpeech } from "./use-mirror-speech";
import { useMirrorVoice } from "./use-mirror-voice";
import { useRegistrationFlow } from "./use-registration-flow";

export const useMirrorController = (navigate: (path: string) => void): MirrorController => {
  const { t } = useTranslation();
  const browserFaceService = useMemo(() => new BrowserFaceRecognitionService(), []);
  const scanVideoRef = useRef<HTMLVideoElement | null>(null);
  const idleVideoRef = useRef<HTMLVideoElement | null>(null);
  const wakeStartedAtRef = useRef<number | null>(null);
  const registrationCompletingRef = useRef(false);
  const dashboardPresenceTimerRef = useRef<number | null>(null);
  const pendingLanguageChangeRef = useRef<AppLanguage | null>(null);
  const helloFallbackTimerRef = useRef<number | null>(null);
  const lastHelloSpokenForUserRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const capturedFaceLabelRef = useRef<string | null>(null);
  const capturedFaceDescriptorRef = useRef<string | null>(null);

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
    visibleWidgets,
    scanFaceVisible,
    isMirrorFadingOut,
    dashboardSummaryText
  } = state;

  const deviceStatus = useMemo(
    () => ({
      camera: (phase === "scan" ? "scanning" : "polling") as "scanning" | "polling",
      microphone: "listening" as const,
      network: "connected" as const,
      battery: "92%"
    }),
    [phase]
  );

  const statusText = useMemo(() => t(statusMessage.key, statusMessage.values), [statusMessage, t]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    capturedFaceLabelRef.current = capturedFaceLabel;
  }, [capturedFaceLabel]);

  useEffect(() => {
    capturedFaceDescriptorRef.current = capturedFaceDescriptor;
  }, [capturedFaceDescriptor]);

  const setStatusMessage = useCallback((message: LocalizedMessage) => {
    dispatch({ type: "STATUS_CHANGED", statusMessage: message });
  }, []);

  const setProgress = useCallback((value: number | ((current: number) => number)) => {
    const nextProgress = typeof value === "function" ? value(progressRef.current) : value;
    progressRef.current = nextProgress;
    dispatch({
      type: "REGISTRATION_SCAN_PROGRESS_CHANGED",
      progress: nextProgress
    });
  }, []);

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
        dispatch({
          type: "STATUS_CHANGED",
          statusMessage: { key: "status.hello", values: { name: user.name } }
        });
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
      showWidget: (widget: MirrorWidget) => {
        dispatch({ type: "WIDGET_SHOWN", widget });
      },
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
    capturedFaceDescriptorRef,
    capturedFaceLabelRef,
    dispatch,
    idleVideoRef,
    knownUsers,
    loadDashboardData,
    navigate,
    registrationCompletingRef,
    scanVideoRef
  });
  const { beginLanguageChange, finishLanguageChange } = useLanguageFlow({
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

  useEffect(() => {
    if (phase !== "hello" || !registeredUser) {
      if (helloFallbackTimerRef.current !== null) {
        window.clearTimeout(helloFallbackTimerRef.current);
        helloFallbackTimerRef.current = null;
      }

      lastHelloSpokenForUserRef.current = null;

      return;
    }

    if (lastHelloSpokenForUserRef.current === registeredUser.id) {
      return;
    }

    lastHelloSpokenForUserRef.current = registeredUser.id;
    const language = normalizeLanguage(registeredUser.preferredLanguage);
    const completeHelloPhase = () => {
      if (helloFallbackTimerRef.current !== null) {
        window.clearTimeout(helloFallbackTimerRef.current);
        helloFallbackTimerRef.current = null;
      }

      dispatch({ type: "PHASE_CHANGED", phase: "dashboard" });
    };

    helloFallbackTimerRef.current = window.setTimeout(() => {
      completeHelloPhase();
    }, 7000);

    speakText(getSpeechPrompt("hello", language, { name: registeredUser.name }), language, true, {
      onEnd: completeHelloPhase,
      onError: () => {
        completeHelloPhase();
      }
    });

    return () => {
      if (helloFallbackTimerRef.current !== null) {
        window.clearTimeout(helloFallbackTimerRef.current);
        helloFallbackTimerRef.current = null;
      }
    };
  }, [phase, registeredUser, speakText]);

  useMirrorBootstrap({
    browserFaceService,
    bootstrapActions
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
    hasRegisteredUsers: knownUsers.length > 0,
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
    visibleWidgets,
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
