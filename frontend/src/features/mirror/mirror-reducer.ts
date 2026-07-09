import type { AgendaResponse } from "../../types/agenda";
import type { LocalizedMessage } from "../../types/i18n";
import type { MirrorPhase } from "../../types/mirror-phase";
import type { User } from "../../types/user";
import type { WeatherData } from "../../types/weather";

export type MirrorState = {
  phase: MirrorPhase;
  statusMessage: LocalizedMessage;
  progress: number;
  capturedName: string;
  capturedFaceLabel: string | null;
  capturedFaceDescriptor: string | null;
  registeredUser: User | null;
  knownUsers: User[];
  weather: WeatherData | null;
  agenda: AgendaResponse["events"];
  scanFaceVisible: boolean;
  isMirrorFadingOut: boolean;
  dashboardSummaryText: string;
};

export type MirrorAction =
  | { type: "BOOTSTRAP_SUCCEEDED"; knownUsers: User[] }
  | { type: "BOOTSTRAP_FAILED"; statusMessage: LocalizedMessage }
  | { type: "PHASE_CHANGED"; phase: MirrorPhase }
  | { type: "STATUS_CHANGED"; statusMessage: LocalizedMessage }
  | { type: "WAKE_REQUESTED"; hasKnownUsers: boolean }
  | { type: "SLEEP_REQUESTED" }
  | { type: "REGISTRATION_STARTED" }
  | { type: "REGISTRATION_NAME_CAPTURED"; name: string; faceLabel: string }
  | { type: "REGISTRATION_NAME_REJECTED" }
  | { type: "REGISTRATION_SCAN_STARTED" }
  | { type: "REGISTRATION_SCAN_PROGRESS_CHANGED"; progress: number }
  | { type: "REGISTRATION_SCAN_FACE_VISIBILITY_CHANGED"; visible: boolean }
  | { type: "REGISTRATION_FACE_DESCRIPTOR_CAPTURED"; faceDescriptor: string | null }
  | { type: "REGISTRATION_COMPLETED"; user: User }
  | { type: "KNOWN_USERS_CHANGED"; users: User[] }
  | { type: "REGISTERED_USER_CHANGED"; user: User | null }
  | { type: "CAPTURED_NAME_CHANGED"; name: string }
  | { type: "CAPTURED_FACE_LABEL_CHANGED"; faceLabel: string | null }
  | { type: "CAPTURED_FACE_DESCRIPTOR_CHANGED"; faceDescriptor: string | null }
  | { type: "DASHBOARD_DATA_LOADED"; weather: WeatherData; agenda: AgendaResponse["events"]; summary: string }
  | { type: "WEATHER_LOADED"; weather: WeatherData }
  | { type: "AGENDA_LOADED"; agenda: AgendaResponse["events"] }
  | { type: "DASHBOARD_SUMMARY_CHANGED"; summary: string }
  | { type: "LANGUAGE_CHANGE_STARTED" }
  | { type: "LANGUAGE_CHANGE_COMPLETED" }
  | { type: "MIRROR_FADING_CHANGED"; isFadingOut: boolean }
  | { type: "PRESENCE_LOST" };

export const initialMirrorState: MirrorState = {
  phase: "idle",
  statusMessage: { key: "status.loading" },
  progress: 0,
  capturedName: "",
  capturedFaceLabel: null,
  capturedFaceDescriptor: null,
  registeredUser: null,
  knownUsers: [],
  weather: null,
  agenda: [],
  scanFaceVisible: false,
  isMirrorFadingOut: false,
  dashboardSummaryText: ""
};

const upsertUser = (users: User[], user: User) => {
  const withoutDuplicate = users.filter((currentUser) => currentUser.id !== user.id);
  return [...withoutDuplicate, user];
};

const updateKnownUser = (users: User[], user: User) =>
  users.map((currentUser) => (currentUser.id === user.id ? user : currentUser));

export const mirrorReducer = (state: MirrorState, action: MirrorAction): MirrorState => {
  switch (action.type) {
    case "BOOTSTRAP_SUCCEEDED":
      return {
        ...state,
        knownUsers: action.knownUsers
      };
    case "BOOTSTRAP_FAILED":
      return {
        ...state,
        phase: "idle",
        statusMessage: action.statusMessage
      };
    case "PHASE_CHANGED":
      return {
        ...state,
        phase: action.phase
      };
    case "STATUS_CHANGED":
      return {
        ...state,
        statusMessage: action.statusMessage
      };
    case "WAKE_REQUESTED":
      return {
        ...state,
        isMirrorFadingOut: false,
        phase: action.hasKnownUsers ? "waking" : "unknown",
        statusMessage: action.hasKnownUsers
          ? { key: "status.checkingFace" }
          : { key: "status.unknownUserDetected" }
      };
    case "SLEEP_REQUESTED":
      return {
        ...state,
        phase: "idle",
        statusMessage: { key: "status.sayHeyMirrorToWake" },
        dashboardSummaryText: "",
        isMirrorFadingOut: false,
        registeredUser: null,
        weather: null,
        agenda: []
      };
    case "REGISTRATION_STARTED":
      return {
        ...state,
        phase: "name",
        statusMessage: { key: "status.sayYourName" },
        capturedName: "",
        capturedFaceLabel: null,
        capturedFaceDescriptor: null,
        progress: 0,
        scanFaceVisible: false
      };
    case "REGISTRATION_NAME_CAPTURED":
      return {
        ...state,
        capturedName: action.name,
        capturedFaceLabel: action.faceLabel,
        phase: "nameConfirm",
        statusMessage: { key: "status.sayYesOrNo" }
      };
    case "REGISTRATION_NAME_REJECTED":
      return {
        ...state,
        capturedName: "",
        capturedFaceLabel: null,
        capturedFaceDescriptor: null,
        phase: "name",
        statusMessage: { key: "status.sayYourName" }
      };
    case "REGISTRATION_SCAN_STARTED":
      return {
        ...state,
        capturedFaceDescriptor: null,
        progress: 0,
        scanFaceVisible: false,
        phase: "scan",
        statusMessage: { key: "status.lookAtMirror" }
      };
    case "REGISTRATION_SCAN_PROGRESS_CHANGED":
      return {
        ...state,
        progress: action.progress
      };
    case "REGISTRATION_SCAN_FACE_VISIBILITY_CHANGED":
      return {
        ...state,
        scanFaceVisible: action.visible
      };
    case "REGISTRATION_FACE_DESCRIPTOR_CAPTURED":
      return {
        ...state,
        capturedFaceDescriptor: action.faceDescriptor
      };
    case "REGISTRATION_COMPLETED":
      return {
        ...state,
        knownUsers: upsertUser(state.knownUsers, action.user),
        registeredUser: action.user,
        capturedFaceLabel: action.user.faceLabel,
        capturedFaceDescriptor: action.user.faceDescriptor,
        phase: "hello",
        statusMessage: { key: "status.hello", values: { name: action.user.name } }
      };
    case "KNOWN_USERS_CHANGED":
      return {
        ...state,
        knownUsers: action.users
      };
    case "REGISTERED_USER_CHANGED":
      return {
        ...state,
        registeredUser: action.user
      };
    case "CAPTURED_NAME_CHANGED":
      return {
        ...state,
        capturedName: action.name
      };
    case "CAPTURED_FACE_LABEL_CHANGED":
      return {
        ...state,
        capturedFaceLabel: action.faceLabel
      };
    case "CAPTURED_FACE_DESCRIPTOR_CHANGED":
      return {
        ...state,
        capturedFaceDescriptor: action.faceDescriptor
      };
    case "DASHBOARD_DATA_LOADED":
      return {
        ...state,
        weather: action.weather,
        agenda: action.agenda,
        dashboardSummaryText: action.summary
      };
    case "WEATHER_LOADED":
      return {
        ...state,
        weather: action.weather
      };
    case "AGENDA_LOADED":
      return {
        ...state,
        agenda: action.agenda
      };
    case "DASHBOARD_SUMMARY_CHANGED":
      return {
        ...state,
        dashboardSummaryText: action.summary
      };
    case "LANGUAGE_CHANGE_STARTED":
      return {
        ...state,
        isMirrorFadingOut: true
      };
    case "LANGUAGE_CHANGE_COMPLETED":
      return {
        ...state,
        phase: "dashboard",
        statusMessage: { key: "status.languageChanged" },
        isMirrorFadingOut: false
      };
    case "MIRROR_FADING_CHANGED":
      return {
        ...state,
        isMirrorFadingOut: action.isFadingOut
      };
    case "PRESENCE_LOST":
      return {
        ...state,
        isMirrorFadingOut: true
      };
    default:
      return state;
  }
};

export const buildKnownUsersWithUpdatedUser = updateKnownUser;
