import { useTranslation } from "react-i18next";
import styles from "./styles.module.css";

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
    <section className={styles.root}>
      <div className={styles.group}>
        <p className={styles.title}>{t("weather.title")}</p>
        <div className={styles.location}>{location}</div>
      </div>

      <div className={styles.group}>
        <div className={styles.temperature}>{temperature}</div>
        <div className={styles.summary}>{summary}</div>
      </div>

      {rainChance != null ? <div className={styles.rain}>{t("weather.rainChance", { chance: rainChance })}</div> : null}
    </section>
  );
}
