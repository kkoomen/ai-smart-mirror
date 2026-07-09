import { useTranslation } from "react-i18next";

export default function Agenda({ events }) {
  const { t } = useTranslation();

  return (
    <section className="space-y-4">
      <p className="text-xs uppercase tracking-[0.5em] text-white/45">{t("agenda.title")}</p>
      <div className="space-y-3">
        {events.length === 0 ? (
          <p className="text-sm uppercase tracking-[0.22em] text-white/65">{t("agenda.empty")}</p>
        ) : null}
        {events.map((event) => (
          <div
            key={`${event.time}-${event.title}`}
            className="flex items-start justify-between gap-6 border-b border-white/10 pb-3 last:border-b-0 last:pb-0"
          >
            <span className="min-w-16 text-sm uppercase tracking-[0.35em] text-white/60">
              {event.time}
            </span>
            <span className="flex-1 text-right text-sm uppercase tracking-[0.22em] text-white/90">
              {event.title}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
