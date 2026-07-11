import type { PublicTransportResponseDto, PublicTransportTripDto } from "../contracts/api.js";
import { env } from "../env.js";
import { prisma } from "../lib/prisma.js";

const tripsUrl = "https://gateway.apiportal.ns.nl/reisinformatie-api/api/v3/trips";

type NsLeg = {
  travelType?: string;
  product?: { longCategoryName?: string };
  origin?: { actualDateTime?: string; plannedDateTime?: string };
  destination?: { actualDateTime?: string; plannedDateTime?: string };
};

const dateTime = (value: { actualDateTime?: string; plannedDateTime?: string } | undefined) =>
  value?.actualDateTime ?? value?.plannedDateTime;

const transferMinutes = (leg: NsLeg, nextLeg: NsLeg | undefined) => {
  const arrival = dateTime(leg.destination);
  const departure = dateTime(nextLeg?.origin);
  if (!arrival || !departure) return null;

  const minutes = Math.round((new Date(departure).getTime() - new Date(arrival).getTime()) / 60_000);
  return Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
};

type NsTrip = {
  actualDurationInMinutes?: number;
  plannedDurationInMinutes?: number;
  legs?: NsLeg[];
  actualDepartureTime?: string;
  plannedDepartureTime?: string;
  actualArrivalTime?: string;
  plannedArrivalTime?: string;
};

const toTrip = (trip: NsTrip): PublicTransportTripDto | null => {
  const legs = (trip.legs ?? []).filter(
    (leg) => leg.travelType === "PUBLIC_TRANSIT" && leg.product?.longCategoryName
  );
  const firstLeg = legs[0];
  const lastLeg = legs.at(-1);
  const departureTime = firstLeg?.origin?.actualDateTime ?? firstLeg?.origin?.plannedDateTime ?? trip.actualDepartureTime ?? trip.plannedDepartureTime;
  const arrivalTime = lastLeg?.destination?.actualDateTime ?? lastLeg?.destination?.plannedDateTime ?? trip.actualArrivalTime ?? trip.plannedArrivalTime;
  if (!departureTime || !arrivalTime) return null;

  return {
    departureTime,
    arrivalTime,
    durationInMinutes: trip.actualDurationInMinutes ?? trip.plannedDurationInMinutes ?? 0,
    vehicles: legs.map((leg, index) => ({
      type: leg.product?.longCategoryName ?? "Train",
      transferMinutes: transferMinutes(leg, legs[index + 1])
    }))
  };
};

export const getPublicTransportTrips = async (userId: number): Promise<PublicTransportResponseDto | null> => {
  if (!env.nsApiKey) throw new Error("NS_API_KEY is not configured");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const query = new URLSearchParams({
    fromStation: user.fromStation,
    toStation: user.toStation,
    dateTime: new Date().toISOString(),
    searchForArrival: "false"
  });
  const response = await fetch(`${tripsUrl}?${query}`, {
    headers: { "Ocp-Apim-Subscription-Key": env.nsApiKey }
  });
  if (!response.ok) throw new Error(`NS trips request failed: ${response.status}`);

  const body = (await response.json()) as { trips?: NsTrip[] };
  return {
    fromStation: user.fromStation,
    toStation: user.toStation,
    trips: (body.trips ?? []).map(toTrip).filter((trip): trip is PublicTransportTripDto => trip !== null).slice(0, 3)
  };
};
