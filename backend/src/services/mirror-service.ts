import { Prisma } from "@prisma/client";
import type {
  ConfirmFaceRequestDto,
  DashboardSummaryRequestDto,
  RegisterUserRequestDto
} from "../contracts/api.js";
import { prisma } from "../lib/prisma.js";
import { generateDashboardSummary } from "../lib/dashboard-summary.js";
import { deriveMirrorMode, getMirrorState, updateMirrorState } from "../lib/mirror-state.js";
import { buildAgendaForUser } from "../lib/mock-data.js";

export type RegisterUserInput = RegisterUserRequestDto;
export type ConfirmFaceInput = ConfirmFaceRequestDto;
export type DashboardSummaryInput = DashboardSummaryRequestDto;

const toFaceLabel = (name: string, faceLabel?: string) =>
  faceLabel && faceLabel.trim().length > 0
    ? faceLabel.trim()
    : `face_${name.toLowerCase().replace(/\s+/g, "_")}`;

const getUserById = (id: number) => prisma.user.findUnique({ where: { id } });

export const getMirrorStateSnapshot = async () => {
  const [state, userCount, activeUser] = await Promise.all([
    getMirrorState(),
    prisma.user.count(),
    prisma.mirrorState.findFirst({
      include: {
        activeUser: true
      }
    })
  ]);

  const mode = deriveMirrorMode({
    userCount,
    state
  });

  return {
    mode,
    registrationComplete: state.registrationComplete,
    userCount,
    activeUser: activeUser?.activeUser ?? null
  };
};

export const startMirrorRegistration = async () => {
  const state = await updateMirrorState({
    activeUserId: null,
    registrationComplete: false
  });

  return {
    ok: true,
    state
  };
};

export const registerMirrorUser = async (input: RegisterUserInput) => {
  const name = input.name.trim();
  const faceLabel = toFaceLabel(name, input.faceLabel);
  const faceDescriptor = input.faceDescriptor?.trim() || null;
  const location = input.location?.trim() || "Amsterdam";
  const preferredLanguage = input.preferredLanguage === "zh" ? "zh" : "en";

  const userData: Prisma.UserCreateInput = {
    name,
    faceLabel,
    faceDescriptor,
    location,
    preferredLanguage
  };

  const user = await prisma.user.create({
    data: userData
  });

  const agendaSeed = buildAgendaForUser(user);

  await prisma.calendarEvent.createMany({
    data: agendaSeed.map((event) => ({
      userId: user.id,
      title: event.title,
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      location: event.location,
      description: event.description
    }))
  });

  const state = await updateMirrorState({
    activeUserId: user.id,
    registrationComplete: true
  });

  return {
    ok: true,
    user,
    state,
    mode: "recognized" as const
  };
};

export const confirmMirrorFace = async (input: ConfirmFaceInput) => {
  let user = input.userId ? await getUserById(input.userId) : null;

  if (!user && input.faceLabel) {
    user = await prisma.user.findUnique({
      where: { faceLabel: input.faceLabel.trim() }
    });
  }

  if (!user) {
    return null;
  }

  const state = await updateMirrorState({
    activeUserId: user.id,
    registrationComplete: true
  });

  return {
    ok: true,
    user,
    state,
    mode: "recognized"
  };
};

export const buildMirrorDashboardSummary = async (input: DashboardSummaryInput) => {
  const summary = await generateDashboardSummary({
    weather: {
      location: input.weather.location ?? "Amsterdam",
      current: {
        temperatureC: input.weather.current?.temperatureC ?? 0,
        condition: input.weather.current?.condition ?? "Unknown",
        rainChancePct: input.weather.current?.rainChancePct ?? null
      },
      forecast: Array.isArray(input.weather.forecast)
        ? input.weather.forecast.map((item) => ({
            temperatureC: item.temperatureC ?? 0,
            condition: item.condition ?? "Unknown",
            rainChancePct: item.rainChancePct ?? null
          }))
        : []
    },
    appointmentCount: input.appointmentCount,
    language: input.language ?? null
  });

  return {
    ok: true,
    ...summary
  };
};
