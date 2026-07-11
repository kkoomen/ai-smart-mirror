import { describe, expect, it } from "vitest";
import { initialMirrorState, mirrorReducer } from "./mirror-reducer";
import type { User } from "../types/user";

const user: User = {
  id: 1,
  name: "John",
  faceLabel: "face_john_123",
  faceDescriptor: "[0.1,0.2]",
  location: "Amsterdam",
  fromStation: "Hoogkarspel",
  toStation: "Alkmaar",
  preferredLanguage: "en",
  createdAt: "2026-07-09T00:00:00.000Z"
};

describe("mirrorReducer", () => {
  it("shows agenda by default", () => {
    expect(initialMirrorState.visibleWidgets).toEqual(["agenda"]);
  });

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
    expect(state.visibleWidgets).toEqual(["agenda"]);
    expect(state.dashboardSummaryText).toBe("");
  });

  it("replaces the visible widget and ignores duplicates", () => {
    const withTransport = mirrorReducer(initialMirrorState, {
      type: "WIDGET_SHOWN",
      widget: "transport"
    });
    const duplicate = mirrorReducer(withTransport, {
      type: "WIDGET_SHOWN",
      widget: "transport"
    });

    expect(withTransport.visibleWidgets).toEqual(["transport"]);
    expect(duplicate.visibleWidgets).toEqual(["transport"]);
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

  it("resets registration capture state when registration starts", () => {
    const state = mirrorReducer(
      {
        ...initialMirrorState,
        capturedName: "John",
        capturedFaceLabel: "face_john_123",
        capturedFaceDescriptor: "[0.1,0.2]",
        progress: 77,
        scanFaceVisible: true
      },
      {
        type: "REGISTRATION_STARTED"
      }
    );

    expect(state.phase).toBe("name");
    expect(state.capturedName).toBe("");
    expect(state.capturedFaceLabel).toBeNull();
    expect(state.capturedFaceDescriptor).toBeNull();
    expect(state.progress).toBe(0);
    expect(state.scanFaceVisible).toBe(false);
  });

  it("moves into name confirmation when name is captured", () => {
    const state = mirrorReducer(initialMirrorState, {
      type: "REGISTRATION_NAME_CAPTURED",
      name: "John",
      faceLabel: "face_john_123"
    });

    expect(state.phase).toBe("nameConfirm");
    expect(state.capturedName).toBe("John");
    expect(state.capturedFaceLabel).toBe("face_john_123");
    expect(state.statusMessage).toEqual({ key: "status.sayYesOrNo" });
  });

  it("only toggles fade state when presence is lost", () => {
    const state = mirrorReducer(
      {
        ...initialMirrorState,
        phase: "dashboard",
        registeredUser: user,
        isMirrorFadingOut: false
      },
      {
        type: "PRESENCE_LOST"
      }
    );

    expect(state.phase).toBe("dashboard");
    expect(state.registeredUser).toEqual(user);
    expect(state.isMirrorFadingOut).toBe(true);
  });

  it("completes language change by returning to dashboard and clearing fade", () => {
    const state = mirrorReducer(
      {
        ...initialMirrorState,
        phase: "changeLanguage",
        isMirrorFadingOut: true
      },
      {
        type: "LANGUAGE_CHANGE_COMPLETED"
      }
    );

    expect(state.phase).toBe("dashboard");
    expect(state.isMirrorFadingOut).toBe(false);
    expect(state.statusMessage).toEqual({ key: "status.languageChanged" });
  });
});
