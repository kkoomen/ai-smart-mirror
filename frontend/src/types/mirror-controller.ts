import type { MutableRefObject, RefObject } from "react";
import type { AgendaResponse } from "./agenda";
import type { User } from "./user";
import type { VoicePhase } from "./voice";
import type { BrowserFaceRecognitionService } from "../services/face-recognition";
import type { LocalizedMessage } from "./i18n";
import type { AppLanguage } from "../i18n/languages";
import type { WeatherData } from "./weather";

export type MirrorController = {
  phase: VoicePhase;
  statusText: string;
  progress: number;
  capturedName: string;
  registeredUser: User | null;
  hasRegisteredUsers: boolean;
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
  speakText: (text: string, language?: AppLanguage) => void;
};

export type MirrorBootstrapOptions = {
  browserFaceService: BrowserFaceRecognitionService;
  setKnownUsers: (users: User[]) => void;
  setRegisteredUser: (user: User | null) => void;
  setCapturedName: (value: string) => void;
  setCapturedFaceLabel: (value: string | null) => void;
  setCapturedFaceDescriptor: (value: string | null) => void;
  setPhase: (phase: VoicePhase) => void;
  setStatusText: (message: LocalizedMessage) => void;
  speakText: (text: string, language?: AppLanguage) => void;
};

export type MirrorFaceDetectionOptions = {
  browserFaceService: BrowserFaceRecognitionService;
  setProgress: (updater: (current: number) => number) => void;
  setScanFaceVisible: (value: boolean) => void;
  setCapturedFaceDescriptor: (value: string | null) => void;
  setRegisteredUser: (user: User | null) => void;
  setPhase: (phase: VoicePhase) => void;
  setStatusText: (message: LocalizedMessage) => void;
  speakText: (text: string, language?: AppLanguage) => void;
  loadDashboardData: (userId: number, location: string) => Promise<void>;
  createUserAndConfirm: (name: string, faceDescriptorOverride?: string | null) => Promise<void>;
  capturedName: string;
  knownUsers: User[];
  phase: VoicePhase;
  scanVideoRef: RefObject<HTMLVideoElement | null>;
  idleVideoRef: RefObject<HTMLVideoElement | null>;
  wakeStartedAtRef: MutableRefObject<number | null>;
  registrationCompletingRef: MutableRefObject<boolean>;
};

export type MirrorVoiceOptions = {
  phase: VoicePhase;
  registeredUser: User | null;
  wakeMirror: () => void;
  sleepMirror: () => void;
  clearDashboardPresenceTimer: () => void;
  startRegistration: () => Promise<void>;
  createUserAndConfirm: (name: string, faceDescriptorOverride?: string | null) => Promise<void>;
  browserFaceService: BrowserFaceRecognitionService;
  navigate: (path: string) => void;
  setPhase: (phase: VoicePhase) => void;
  setStatusText: (message: LocalizedMessage) => void;
  setMirrorFadingOut: (value: boolean) => void;
  setCapturedName: (value: string) => void;
  setCapturedFaceLabel: (value: string | null) => void;
  setCapturedFaceDescriptor: (value: string | null) => void;
  setProgress: (value: number) => void;
  setScanFaceVisible: (value: boolean) => void;
  registrationCompletingRef: MutableRefObject<boolean>;
  capturedName: string;
  hasRegisteredUsers: boolean;
  persistUserLanguage: (language: AppLanguage) => Promise<void>;
  speakText: (text: string, language?: AppLanguage) => void;
};
