const lowered = (value: string) => value.trim().toLowerCase();

export const inferIntent = (transcript: string) => {
  const text = lowered(transcript);

  if (text.includes("start") && text.includes("registration")) {
    return "start_registration";
  }

  if (text.includes("confirm") || text.includes("yes") || text.includes("okay")) {
    return "confirm_face";
  }

  if (text.includes("register") || text.includes("name")) {
    return "register_user";
  }

  if (text.includes("weather")) {
    return "weather_query";
  }

  if (text.includes("agenda") || text.includes("schedule")) {
    return "agenda_query";
  }

  return "general";
};
