import { Prisma } from "@prisma/client";
import type { DashboardSummaryRequestDto, RegisterUserRequestDto } from "../contracts/api.js";
import { prisma } from "../lib/prisma.js";
import { generateDashboardSummary } from "../lib/dashboard-summary.js";
import { buildAgendaForUser } from "../lib/mock-data.js";

export type RegisterUserInput = RegisterUserRequestDto;
export type DashboardSummaryInput = DashboardSummaryRequestDto;

const toFaceLabel = (name: string, faceLabel?: string) =>
  faceLabel && faceLabel.trim().length > 0
    ? faceLabel.trim()
    : `face_${name.toLowerCase().replace(/\s+/g, "_")}`;

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

  return {
    ok: true,
    user
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
