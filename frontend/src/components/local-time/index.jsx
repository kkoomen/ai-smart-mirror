import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeLanguage } from "../../i18n/languages";

const formatTime = (date, locale) =>
  new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);

const formatDate = (date, locale) =>
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
    <section className="space-y-2">
      <p className="text-xs uppercase tracking-[0.5em] text-white/45">{t("time.title")}</p>
      <div className="space-y-1">
        <div className="text-4xl font-light tracking-[0.16em] sm:text-5xl">
          {formatTime(now, locale)}
        </div>
        <div className="text-sm uppercase tracking-[0.35em] text-white/60">
          {formatDate(now, locale)}
        </div>
      </div>
    </section>
  );
}
