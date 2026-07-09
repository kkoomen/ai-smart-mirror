import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { buildAgendaForUser } from "../lib/mock-data.js";
import { getWeatherForLocation } from "../lib/weather.js";

export const listUsers = async () => {
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "asc"
    }
  });

  return {
    users
  };
};

export const getUser = async (id: number) => {
  const user = await prisma.user.findUnique({
    where: { id }
  });

  return user ? { user } : null;
};

export const getUserAgendaToday = async (id: number) => {
  const user = await prisma.user.findUnique({
    where: { id }
  });

  if (!user) {
    return null;
  }

  const events = await prisma.calendarEvent.findMany({
    where: { userId: user.id },
    orderBy: {
      startTime: "asc"
    }
  });

  return {
    userId: user.id,
    date: new Date().toISOString().slice(0, 10),
    events: events.length === 0 ? buildAgendaForUser(user) : events
  };
};

export const getUserWeather = async (id: number) => {
  const user = await prisma.user.findUnique({
    where: { id }
  });

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    weather: await getWeatherForLocation(user.location)
  };
};

export const updateUserLanguage = async (id: number, preferredLanguage: "en" | "zh") => {
  const user = await prisma.user.findUnique({
    where: { id }
  });

  if (!user) {
    return null;
  }

  const updateData: Prisma.UserUpdateInput = {
    preferredLanguage
  };

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: updateData
  });

  return {
    ok: true,
    user: updatedUser
  };
};
