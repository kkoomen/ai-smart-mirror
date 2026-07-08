import type { User } from "@prisma/client";

const buildDate = (hours: number, minutes = 0) => {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const buildAgendaForUser = (user: User) => {
  const firstName = user.name.split(" ")[0] ?? user.name;

  return [
    {
      id: `agenda-${user.id}-1`,
      title: "Morning planning",
      startTime: buildDate(8, 30).toISOString(),
      endTime: buildDate(9, 0).toISOString(),
      location: "Mirror desk",
      description: `Review priorities for ${firstName}'s day`
    },
    {
      id: `agenda-${user.id}-2`,
      title: "Deep work block",
      startTime: buildDate(10, 0).toISOString(),
      endTime: buildDate(11, 30).toISOString(),
      location: "Focus mode",
      description: "Work on the highest priority task"
    },
    {
      id: `agenda-${user.id}-3`,
      title: "Evening reset",
      startTime: buildDate(18, 0).toISOString(),
      endTime: buildDate(18, 30).toISOString(),
      location: "Home",
      description: "Wrap up the day and prep for tomorrow"
    }
  ];
};

export const buildWeatherForUser = (user: User) => {
  const firstName = user.name.split(" ")[0] ?? user.name;

  return {
    location: "Amsterdam",
    updatedAt: new Date().toISOString(),
    current: {
      temperatureC: 18,
      condition: "Clear sky",
      feelsLikeC: 19,
      humidity: 58,
      windKph: 11
    },
    forecast: [
      { label: "Now", temperatureC: 18, condition: "Clear" },
      { label: "12:00", temperatureC: 20, condition: "Sunny" },
      { label: "15:00", temperatureC: 21, condition: "Light breeze" }
    ],
    note: `Good mirror weather for ${firstName}.`
  };
};
