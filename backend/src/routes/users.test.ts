import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usersRoutes } from "./users.js";
import { getUserAgendaToday, listUsers, updateUserLanguage } from "../services/users-service.js";

vi.mock("../services/users-service.js", () => ({
  getUserAgendaToday: vi.fn(),
  listUsers: vi.fn(),
  updateUserLanguage: vi.fn()
}));

describe("usersRoutes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists users", async () => {
    vi.mocked(listUsers).mockResolvedValue({
      users: [
        {
          id: 1,
          name: "John",
          faceLabel: "face_john_123",
          faceDescriptor: "[0.1,0.2]",
          location: "Amsterdam",
          fromStation: "Hoogkarspel",
          toStation: "Alkmaar",
          preferredLanguage: "en",
          createdAt: new Date("2026-07-10T00:00:00.000Z")
        }
      ]
    });

    const app = Fastify();
    await app.register(usersRoutes);

    const response = await app.inject({
      method: "GET",
      url: "/api/users"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      users: [{ name: "John" }]
    });

    await app.close();
  });

  it("rejects invalid agenda user ids", async () => {
    const app = Fastify();
    await app.register(usersRoutes);

    const response = await app.inject({
      method: "GET",
      url: "/api/users/0/agenda/today"
    });

    expect(response.statusCode).toBe(400);
    expect(getUserAgendaToday).not.toHaveBeenCalled();

    await app.close();
  });

  it("returns 404 when agenda user is missing", async () => {
    vi.mocked(getUserAgendaToday).mockResolvedValue(null);

    const app = Fastify();
    await app.register(usersRoutes);

    const response = await app.inject({
      method: "GET",
      url: "/api/users/99/agenda/today"
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      ok: false,
      error: "user not found"
    });

    await app.close();
  });

  it("rejects invalid language payloads", async () => {
    const app = Fastify();
    await app.register(usersRoutes);

    const response = await app.inject({
      method: "POST",
      url: "/api/users/1/language",
      payload: {
        preferredLanguage: "fr"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(updateUserLanguage).not.toHaveBeenCalled();

    await app.close();
  });

  it("updates the user language", async () => {
    vi.mocked(updateUserLanguage).mockResolvedValue({
      ok: true,
      user: {
        id: 1,
        name: "John",
        faceLabel: "face_john_123",
        faceDescriptor: "[0.1,0.2]",
        location: "Amsterdam",
        fromStation: "Hoogkarspel",
        toStation: "Alkmaar",
        preferredLanguage: "zh",
        createdAt: new Date("2026-07-10T00:00:00.000Z")
      }
    });

    const app = Fastify();
    await app.register(usersRoutes);

    const response = await app.inject({
      method: "POST",
      url: "/api/users/1/language",
      payload: {
        preferredLanguage: "zh"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(updateUserLanguage).toHaveBeenCalledWith(1, "zh");

    await app.close();
  });
});
