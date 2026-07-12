import { useEffect, useState } from "react";
import { getPublicTransportTrips } from "../../api/public-transport";
import { PUBLIC_TRANSPORT_TRIP_COUNT } from "../../constants";
import type { PublicTransportResponse } from "../../types/public-transport";
import styles from "./styles.module.css";

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

const SkeletonBar = ({ className }: { className: string }) => (
  <span className={[styles.skeleton, className].join(" ")} />
);

const PublicTransportSkeleton = () => (
  <section className={styles.root} aria-busy="true" aria-label="Loading public transport">
    <div className={styles.skeletonTitle}>
      <SkeletonBar className={styles.skeletonStationLong} />
      <SkeletonBar className={styles.skeletonStationShort} />
    </div>
    <div className={styles.trips}>
      {Array.from({ length: PUBLIC_TRANSPORT_TRIP_COUNT }).map((_, index) => (
        <div key={index} className={styles.trip}>
          <div className={styles.times}>
            <SkeletonBar className={styles.skeletonTime} />
            <SkeletonBar className={styles.skeletonDash} />
            <SkeletonBar className={styles.skeletonTime} />
            <SkeletonBar className={styles.skeletonDuration} />
          </div>
          <div className={styles.skeletonVehicles}>
            <SkeletonBar className={styles.skeletonVehicleShort} />
            <SkeletonBar className={styles.skeletonTransfer} />
            <SkeletonBar className={styles.skeletonVehicleLong} />
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default function PublicTransport({ userId }: { userId: number | null }) {
  const [data, setData] = useState<PublicTransportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let isActive = true;
    setIsLoading(true);
    setData(null);

    void getPublicTransportTrips(userId)
      .then((response) => {
        if (isActive) {
          setData(response);
        }
      })
      .catch(() => {
        if (isActive) {
          setData(null);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [userId]);

  if (isLoading) return <PublicTransportSkeleton />;
  if (!data) return null;

  return (
    <section className={styles.root}>
      <p className={styles.route}>
        {data.fromStation}<br/>
        {data.toStation}
      </p>
      <div className={styles.trips}>
        {data.trips.map((trip) => (
          <div key={`${trip.departureTime}-${trip.arrivalTime}`} className={styles.trip}>
            <div className={styles.times}>
              <span>{formatTime(trip.departureTime)}</span>
              <span className={styles.separator}>-</span>
              <span>{formatTime(trip.arrivalTime)}</span>
              <span className={styles.duration}>{formatDuration(trip.durationInMinutes)}</span>
            </div>
            <div className={styles.vehicles}>
              {trip.vehicles.map((vehicle, index) => (
                <span key={`${vehicle.type}-${index}`} className={styles.vehicleGroup}>
                  <span className={styles.vehicle}>
                    <span className={styles.icon}><TrainIcon label={vehicle.type === "Intercity" ? "IC" : "SPR"} /></span>
                    <span className={styles.vehicleLabel}>{vehicle.type === "Intercity" ? "IC" : "SPR"}</span>
                  </span>
                  {vehicle.transferMinutes !== null ? (
                    <span className={styles.transfer}>
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
