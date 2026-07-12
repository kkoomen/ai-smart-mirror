import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeLanguage } from "../../i18n/languages";
import styles from "./styles.module.css";

const formatTime = (date: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);

const formatDate = (date: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(date);

export default function LocalTime() {
  const [now, setNow] = useState(() => new Date());
  const { i18n, t } = useTranslation();
  const locale = useMemo(() => {
    const language = normalizeLanguage(i18n.language);
    return language === "zh" ? "zh-CN" : "en-GB";
  }, [i18n.language]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return (
    <section className={styles.root}>
      <p className={styles.title}>{t("time.title")}</p>
      <div className={styles.content}>
        <div className={styles.time}>{formatTime(now, locale)}</div>
        <div className={styles.date}>{formatDate(now, locale)}</div>
      </div>
    </section>
  );
}
