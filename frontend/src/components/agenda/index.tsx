import { useTranslation } from "react-i18next";
import styles from "./styles.module.css";

type AgendaEvent = {
  time: string;
  title: string;
};

type AgendaProps = {
  events: AgendaEvent[];
};

export default function Agenda({ events }: AgendaProps) {
  const { t } = useTranslation();

  return (
    <section className={styles.root}>
      <p className={styles.title}>{t("agenda.title")}</p>
      <div className={styles.events}>
        {events.length === 0 ? (
          <p className={styles.empty}>{t("agenda.empty")}</p>
        ) : null}
        {events.map((event) => (
          <div key={`${event.time}-${event.title}`} className={styles.event}>
            <span className={styles.time}>{event.time}</span>
            <span className={styles.eventTitle}>{event.title}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
