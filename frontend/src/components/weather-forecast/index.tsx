import { useTranslation } from "react-i18next";

type WeatherForecastProps = {
  location: string;
  summary: string;
  temperature: string;
  rainChance: string | null;
};

export default function WeatherForecast({
  location,
  summary,
  temperature,
  rainChance
}: WeatherForecastProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-2">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.5em] text-white/45">{t("weather.title")}</p>
        <div className="text-sm uppercase tracking-[0.3em] text-white/70">{location}</div>
      </div>

      <div className="space-y-1">
        <div className="text-4xl font-light tracking-[0.08em] sm:text-5xl">{temperature}</div>
        <div className="text-sm uppercase tracking-[0.35em] text-white/60">{summary}</div>
      </div>

      {rainChance != null ? (
        <div className="text-xs uppercase tracking-[0.35em] text-white/55">
          {t("weather.rainChance", { chance: rainChance })}
        </div>
      ) : null}
    </section>
  );
}
