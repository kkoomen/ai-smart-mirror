export type AppLanguageDto = "en" | "zh";

export type MirrorPhaseDto =
  | "idle"
  | "waking"
  | "hello"
  | "name"
  | "nameConfirm"
  | "scan"
  | "changeLanguage"
  | "dashboard"
  | "unknown";

export type UserDto = {
  id: number;
  name: string;
  faceLabel: string;
  faceDescriptor: string | null;
  location: string;
  fromStation: string;
  toStation: string;
  preferredLanguage: string;
  createdAt: string;
};

export type AgendaEventDto = {
  id?: string | number;
  userId?: number;
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  description: string | null;
};

export type WeatherForecastItemDto = {
  label: string;
  temperatureC: number;
  condition: string;
  rainChancePct: number | null;
};

export type WeatherDto = {
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
  forecast: WeatherForecastItemDto[];
  note: string;
};

export type UsersResponseDto = {
  users: UserDto[];
};

export type UserLanguageMutationRequestDto = {
  preferredLanguage: AppLanguageDto;
};

export type UserMutationResponseDto = {
  ok: boolean;
  user: UserDto;
};

export type UserAgendaTodayResponseDto = {
  userId: number;
  date: string;
  events: AgendaEventDto[];
};

export type WeatherEnvelopeDto = {
  weather: WeatherDto;
};

export type PublicTransportTripDto = {
  departureTime: string;
  arrivalTime: string;
  durationInMinutes: number;
  vehicles: Array<{ type: string; transferMinutes: number | null }>;
};

export type PublicTransportResponseDto = {
  fromStation: string;
  toStation: string;
  trips: PublicTransportTripDto[];
};

export type VoiceIntentDto =
  | "WAKE_MIRROR"
  | "SLEEP_MIRROR"
  | "START_REGISTRATION"
  | "CHANGE_LANGUAGE"
  | "SET_LANGUAGE_EN"
  | "SET_LANGUAGE_ZH"
  | "PROVIDE_NAME"
  | "CONFIRM_YES"
  | "CONFIRM_NO"
  | "SHOW_WIDGET"
  | "GET_WEATHER"
  | "UNKNOWN";

export type WidgetNameDto = "agenda" | "transport";

export type VoiceCommandRequestDto = {
  transcript: string;
  phase: MirrorPhaseDto;
  userId: number | null;
  language?: string;
};

export type VoiceCommandResponseDto = {
  ok: true;
  intent: VoiceIntentDto;
  name: string | null;
  widget: WidgetNameDto | null;
  response: string;
};

export type DashboardSummaryRequestDto = {
  weather: WeatherDto;
  appointmentCount: number;
  language?: string | null;
};

export type DashboardSummaryResponseDto = {
  ok: boolean;
  summary: string;
};

export type RegisterUserRequestDto = {
  name: string;
  faceLabel?: string;
  faceDescriptor?: string;
  location?: string;
  preferredLanguage?: AppLanguageDto;
};
