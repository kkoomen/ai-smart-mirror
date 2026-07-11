import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { publicTransportRoutes } from "./public-transport.js";
import { getPublicTransportTrips } from "../services/public-transport-service.js";

vi.mock("../services/public-transport-service.js", () => ({
  getPublicTransportTrips: vi.fn()
}));

describe("publicTransportRoutes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns NS trips for the requested user", async () => {
    vi.mocked(getPublicTransportTrips).mockResolvedValue({
      fromStation: "Hoogkarspel",
      toStation: "Alkmaar",
      trips: []
    });
    const app = Fastify();
    await app.register(publicTransportRoutes);

    const response = await app.inject({
      method: "GET",
      url: "/api/transport/ns?userId=1"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      fromStation: "Hoogkarspel",
      toStation: "Alkmaar",
      trips: []
    });
    expect(getPublicTransportTrips).toHaveBeenCalledWith(1);
    await app.close();
  });

  it("rejects a missing or invalid user id", async () => {
    const app = Fastify();
    await app.register(publicTransportRoutes);

    const response = await app.inject({ method: "GET", url: "/api/transport/ns?userId=0" });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ ok: false, error: "invalid user id" });
    expect(getPublicTransportTrips).not.toHaveBeenCalled();
    await app.close();
  });

  it("returns 404 when the user does not exist", async () => {
    vi.mocked(getPublicTransportTrips).mockResolvedValue(null);
    const app = Fastify();
    await app.register(publicTransportRoutes);

    const response = await app.inject({ method: "GET", url: "/api/transport/ns?userId=999" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ ok: false, error: "user not found" });
    await app.close();
  });
});
