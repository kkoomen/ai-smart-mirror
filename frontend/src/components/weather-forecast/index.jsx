export default function WeatherForecast({ location, summary, temperature, high, low, forecast }) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.5em] text-white/45">weather</p>
        <div className="text-sm uppercase tracking-[0.3em] text-white/70">{location}</div>
      </div>

      <div className="flex items-end gap-5">
        <div className="text-5xl font-light tracking-[0.08em] sm:text-6xl">
          {temperature}
        </div>
        <div className="pb-1 text-sm uppercase tracking-[0.35em] text-white/60">
          {summary}
        </div>
      </div>

      <div className="flex gap-6 text-sm uppercase tracking-[0.3em] text-white/65">
        <span>H {high}</span>
        <span>L {low}</span>
      </div>

      <div className="grid gap-2">
        {forecast.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between border-b border-white/10 pb-2 text-sm uppercase tracking-[0.25em] last:border-b-0 last:pb-0"
          >
            <span className="text-white/55">{item.label}</span>
            <span>{item.temp}</span>
            <span className="text-white/50">{item.note}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
