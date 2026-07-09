import type { MutableRefObject, RefObject } from "react";
import type { AgendaResponse } from "./agenda";
import type { User } from "./user";
import type { MirrorPhase } from "./mirror-phase";
import type { BrowserFaceRecognitionService } from "../services/face-recognition";
import type { LocalizedMessage } from "./i18n";
import type { AppLanguage } from "../i18n/languages";
import type { WeatherData } from "./weather";
import type { SpeakTextOptions } from "../utils/speech";

export type MirrorController = {
  phase: MirrorPhase;
  statusText: string;
  progress: number;
  capturedName: string;
  registeredUser: User | null;
  hasRegisteredUsers: boolean;
  weather: WeatherData | null;
  agenda: AgendaResponse["events"];
  scanFaceVisible: boolean;
  isMirrorFadingOut: boolean;
  dashboardSummaryText: string;
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
  beginLanguageChange: (language: AppLanguage) => void;
  finishLanguageChange: () => Promise<void>;
  startRegistration: () => Promise<void>;
  handleVoiceCommand: (spokenText: string) => Promise<void>;
  setMirrorFadingOut: (value: boolean) => void;
  browserFaceService: BrowserFaceRecognitionService;
  speakText: (
    text: string,
    language?: AppLanguage,
    interrupt?: boolean,
    options?: SpeakTextOptions
  ) => void;
};

export type MirrorBootstrapActions = {
  enterIdle: () => void;
  failBootstrap: () => void;
  loadKnownUsers: (users: User[]) => void;
  restoreRegistrationUser: (user: User) => void;
};

export type MirrorBootstrapOptions = {
  browserFaceService: BrowserFaceRecognitionService;
  bootstrapActions: MirrorBootstrapActions;
  speakText: (
    text: string,
    language?: AppLanguage,
    interrupt?: boolean,
    options?: SpeakTextOptions
  ) => void;
};

export type FaceDetectionActions = {
  captureFaceDescriptor: (value: string | null) => void;
  completeWake: (user: User) => void;
  markUnknownUser: () => void;
  resetToScan: () => void;
  setScanFaceVisible: (value: boolean) => void;
  setStatus: (message: LocalizedMessage) => void;
  updateScanProgress: (updater: (current: number) => number) => void;
};

export type MirrorFaceDetectionOptions = {
  browserFaceService: BrowserFaceRecognitionService;
  faceDetectionActions: FaceDetectionActions;
  speakText: (text: string, language?: AppLanguage) => void;
  loadDashboardData: (userId: number, location: string) => Promise<void>;
  createUserAndConfirm: (name: string, faceDescriptorOverride?: string | null) => Promise<void>;
  capturedName: string;
  knownUsers: User[];
  phase: MirrorPhase;
  scanVideoRef: RefObject<HTMLVideoElement | null>;
  idleVideoRef: RefObject<HTMLVideoElement | null>;
  wakeStartedAtRef: MutableRefObject<number | null>;
  registrationCompletingRef: MutableRefObject<boolean>;
};

export type MirrorVoiceActions = {
  fadeOut: () => void;
  openLanguageChange: () => void;
  setStatus: (message: LocalizedMessage) => void;
  sleep: () => void;
  wake: () => void;
};

export type RegistrationVoiceActions = {
  captureName: (name: string) => void;
  rejectName: () => void;
  startScan: () => void;
};

export type LanguageVoiceActions = {
  beginChange: (language: AppLanguage) => void;
};

export type MirrorVoiceOptions = {
  phase: MirrorPhase;
  registeredUser: User | null;
  mirrorActions: MirrorVoiceActions;
  registrationActions: RegistrationVoiceActions;
  languageActions: LanguageVoiceActions;
  clearDashboardPresenceTimer: () => void;
  startRegistration: () => Promise<void>;
  hasRegisteredUsers: boolean;
  speakText: (
    text: string,
    language?: AppLanguage,
    interrupt?: boolean,
    options?: SpeakTextOptions
  ) => void;
};
