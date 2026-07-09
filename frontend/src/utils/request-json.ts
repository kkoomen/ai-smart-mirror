import { apiBase } from "../constants";
import i18n from "../i18n";

export const requestJson = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": i18n.resolvedLanguage ?? i18n.language,
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
};
