import i18n from "../i18n";

const normalize = (value: string) => value.trim().toLowerCase();

const getPhrases = (
  key: "wake" | "sleep" | "startRegistration" | "yes" | "no" | "umbrella"
) => {
  const phrases = i18n.t(`voice.phrases.${key}`, { returnObjects: true });

  if (!Array.isArray(phrases)) {
    return [];
  }

  return phrases
    .filter((phrase): phrase is string => typeof phrase === "string")
    .map((phrase) => normalize(phrase));
};

const includesPhrase = (value: string, phrases: string[]) => {
  const text = normalize(value);
  return phrases.some((phrase) => text.includes(phrase));
};

export const isWakePhrase = (value: string) => includesPhrase(value, getPhrases("wake"));

export const isSleepPhrase = (value: string) => includesPhrase(value, getPhrases("sleep"));

export const isStartRegistrationPhrase = (value: string) =>
  includesPhrase(value, getPhrases("startRegistration"));

export const isUmbrellaPhrase = (value: string) => includesPhrase(value, getPhrases("umbrella"));
