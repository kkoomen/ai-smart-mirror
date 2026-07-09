import { useCallback } from "react";
import type { Dispatch } from "react";
import i18n from "../../i18n";
import { normalizeLanguage } from "../../i18n/languages";
import { generateMirrorDashboardSummary } from "../../api/mirror";
import { getUserAgendaToday } from "../../api/users";
import { getWeather } from "../../api/weather";
import type { DashboardSummaryRequest } from "../../types/api";
import type { MirrorAction } from "../../features/mirror/mirror-reducer";

export const useDashboardData = (dispatch: Dispatch<MirrorAction>) => {
  const loadWeatherForLocation = useCallback(
    async (location: string) => {
      const response = await getWeather(location);

      dispatch({ type: "WEATHER_LOADED", weather: response.weather });
      return response.weather;
    },
    [dispatch]
  );

  const loadDashboardData = useCallback(
    async (userId: number, location: string) => {
      const [weatherResponse, agendaResponse] = await Promise.all([
        loadWeatherForLocation(location),
        getUserAgendaToday(userId)
      ]);

      const summaryResponse = await generateMirrorDashboardSummary({
        weather: weatherResponse,
        appointmentCount: agendaResponse.events.length,
        language: normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
      } satisfies DashboardSummaryRequest);

      dispatch({
        type: "DASHBOARD_DATA_LOADED",
        weather: weatherResponse,
        agenda: agendaResponse.events,
        summary: summaryResponse.summary
      });
    },
    [dispatch, loadWeatherForLocation, i18n.language, i18n.resolvedLanguage]
  );

  return {
    loadDashboardData,
    loadWeatherForLocation
  };
};
