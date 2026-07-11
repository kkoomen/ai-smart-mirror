import { useEffect, useState } from "react";
import { getPublicTransportTrips } from "../../api/public-transport";
import type { PublicTransportResponse } from "../../types/public-transport";

const TrainIcon = ({ label }: { label: string }) => (
  <svg aria-hidden="true" width="32" height="24" viewBox="0 0 800 600" fill="none">
    <g stroke="#666" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round">
      {label === "IC" ? (
        <>
          <path d="M150 145H300C390 145 470 175 540 235L620 305C650 330 665 365 655 410L640 470C632 500 610 515 575 515H150" />
          <path d="M150 245C275 245 390 220 470 170M150 390C270 390 385 355 470 315C520 290 575 285 635 295M435 205L490 330M150 565H650" />
        </>
      ) : (
        <>
          <path d="M160 150H480C545 150 590 185 625 240L665 315C685 355 690 395 680 440C670 490 640 515 595 515H160" />
          <path d="M160 250H625M215 390H675M500 250V390" />
        </>
      )}
    </g>
  </svg>
);

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));

const formatDuration = (minutes: number) =>
  `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;

export default function PublicTransport({ userId }: { userId: number | null }) {
  const [data, setData] = useState<PublicTransportResponse | null>(null);

  useEffect(() => {
    if (!userId) return;
    void getPublicTransportTrips(userId).then(setData).catch(() => setData(null));
  }, [userId]);

  if (!data) return null;

  return (
    <section className="w-[20rem] space-y-3">
      <p className="text-xs uppercase tracking-[0.3em] text-white/45">
        {data.fromStation}<br/>
        {data.toStation}
      </p>
      <div className="space-y-2">
        {data.trips.map((trip) => (
          <div key={`${trip.departureTime}-${trip.arrivalTime}`} className="rounded-md border border-white/35 p-3">
            <div className="flex items-baseline gap-3 text-sm text-white/90">
              <span>{formatTime(trip.departureTime)}</span>
              <span className="text-white/80">-</span>
              <span>{formatTime(trip.arrivalTime)}</span>
              <span className="ml-auto text-white/60">{formatDuration(trip.durationInMinutes)}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-stretch gap-2 text-white/60">
              {trip.vehicles.map((vehicle, index) => (
                <span key={`${vehicle.type}-${index}`} className="flex items-stretch gap-2">
                  <span className="flex items-center rounded bg-white/10 px-2 py-[0.2rem] text-white/60">
                    <span className="-translate-y-px"><TrainIcon label={vehicle.type === "Intercity" ? "IC" : "SPR"} /></span>
                    <span className="ml-1 text-xs font-semibold">{vehicle.type === "Intercity" ? "IC" : "SPR"}</span>
                  </span>
                  {vehicle.transferMinutes !== null ? (
                    <span className="flex items-center rounded bg-white/10 px-2 py-[0.2rem] text-center text-xs leading-tight text-white/80">
                      {vehicle.transferMinutes} min
                    </span>
                  ) : null}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
