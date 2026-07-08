import { useEffect, useState } from "react";

const formatTime = (date) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);

const formatDate = (date) =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(date);

export default function LocalTime() {
  const [now, setNow] = useState(() => new Date());

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
      <p className="text-xs uppercase tracking-[0.5em] text-white/45">local time</p>
      <div className="space-y-1">
        <div className="text-4xl font-light tracking-[0.16em] sm:text-5xl">
          {formatTime(now)}
        </div>
        <div className="text-sm uppercase tracking-[0.35em] text-white/60">
          {formatDate(now)}
        </div>
      </div>
    </section>
  );
}
