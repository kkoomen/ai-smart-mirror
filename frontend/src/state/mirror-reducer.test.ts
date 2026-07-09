import { describe, expect, it } from "vitest";
import { initialMirrorState, mirrorReducer } from "./mirror-reducer";
import type { User } from "../types/user";

const user: User = {
  id: 1,
  name: "John",
  faceLabel: "face_john_123",
  faceDescriptor: "[0.1,0.2]",
  location: "Amsterdam",
  preferredLanguage: "en",
  createdAt: "2026-07-09T00:00:00.000Z"
};

describe("mirrorReducer", () => {
  it("moves from idle to waking when known users exist", () => {
    const state = mirrorReducer(initialMirrorState, {
      type: "WAKE_REQUESTED",
      hasKnownUsers: true
    });

    expect(state.phase).toBe("waking");
    expect(state.statusMessage).toEqual({ key: "status.checkingFace" });
    expect(state.isMirrorFadingOut).toBe(false);
  });

  it("moves from idle to unknown when no users exist", () => {
    const state = mirrorReducer(initialMirrorState, {
      type: "WAKE_REQUESTED",
      hasKnownUsers: false
    });

    expect(state.phase).toBe("unknown");
    expect(state.statusMessage).toEqual({ key: "status.unknownUserDetected" });
  });

  it("resets sensitive dashboard state on sleep", () => {
    const dashboardState = {
      ...initialMirrorState,
      phase: "dashboard" as const,
      registeredUser: user,
      dashboardSummaryText: "Weather is sunny.",
      weather: {
        location: "Amsterdam",
        updatedAt: "2026-07-09T00:00:00.000Z",
        current: {
          temperatureC: 20,
          condition: "Sunny",
          feelsLikeC: 20,
          humidity: 50,
          windKph: 10,
          rainChancePct: 10
        },
        forecast: [],
        note: "Rain chance 10%"
      },
      agenda: [
        {
          id: 1,
          title: "Standup",
          startTime: "2026-07-09T09:00:00.000Z",
          endTime: "2026-07-09T09:30:00.000Z",
          location: null,
          description: null
        }
      ]
    };

    const state = mirrorReducer(dashboardState, {
      type: "SLEEP_REQUESTED"
    });

    expect(state.phase).toBe("idle");
    expect(state.registeredUser).toBeNull();
    expect(state.weather).toBeNull();
    expect(state.agenda).toEqual([]);
    expect(state.dashboardSummaryText).toBe("");
  });

  it("upserts the completed registration user", () => {
    const state = mirrorReducer(
      { ...initialMirrorState, knownUsers: [{ ...user, name: "Old John" }] },
      {
        type: "REGISTRATION_COMPLETED",
        user
      }
    );

    expect(state.phase).toBe("hello");
    expect(state.registeredUser).toEqual(user);
    expect(state.knownUsers).toEqual([user]);
  });
});
