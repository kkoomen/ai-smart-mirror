import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMirrorVoiceHandler, resolveTargetLanguage } from "./use-mirror-voice";

const buildOptions = () => {
  const mirrorActions = {
    fadeOut: vi.fn(),
    openLanguageChange: vi.fn(),
    setStatus: vi.fn(),
    sleep: vi.fn(),
    wake: vi.fn()
  };

  const registrationActions = {
    captureName: vi.fn(),
    rejectName: vi.fn(),
    startScan: vi.fn()
  };

  const languageActions = {
    beginChange: vi.fn()
  };

  const classifyCommand = vi.fn();
  const clearDashboardPresenceTimer = vi.fn();
  const startRegistration = vi.fn(async () => {});
  const createUserAndConfirm = vi.fn(async () => {});
  const speakText = vi.fn();

  return {
    options: {
      phase: "dashboard" as const,
      registeredUser: {
        id: 1,
        name: "John",
        faceLabel: "face_john_123",
        faceDescriptor: "[0.1,0.2]",
        location: "Amsterdam",
        preferredLanguage: "en",
        createdAt: "2026-07-10T00:00:00.000Z"
      },
      mirrorActions,
      registrationActions,
      languageActions,
      clearDashboardPresenceTimer,
      startRegistration,
      createUserAndConfirm,
      capturedName: "",
      hasRegisteredUsers: true,
      speakText,
      currentLanguage: "en" as const,
      classifyCommand
    },
    mirrorActions,
    registrationActions,
    languageActions,
    clearDashboardPresenceTimer,
    startRegistration,
    createUserAndConfirm,
    speakText,
    classifyCommand
  };
};

describe("resolveTargetLanguage", () => {
  it("resolves explicit language intents", () => {
    expect(resolveTargetLanguage("anything", "SET_LANGUAGE_EN")).toBe("en");
    expect(resolveTargetLanguage("anything", "SET_LANGUAGE_ZH")).toBe("zh");
  });

  it("resolves spoken language names", () => {
    expect(resolveTargetLanguage("Mandarin please", "UNKNOWN")).toBe("zh");
    expect(resolveTargetLanguage("英语", "UNKNOWN")).toBe("en");
  });
});

describe("createMirrorVoiceHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens language change from dashboard for registered users", async () => {
    const { options, classifyCommand, mirrorActions, speakText } = buildOptions();
    classifyCommand.mockResolvedValue({
      ok: true,
      intent: "CHANGE_LANGUAGE",
      name: null,
      entities: { name: null, date: null },
      response: "Opening language change."
    });

    const handler = createMirrorVoiceHandler(options);
    await handler("change language");

    expect(mirrorActions.openLanguageChange).toHaveBeenCalledOnce();
    expect(speakText).toHaveBeenCalledOnce();
  });

  it("prompts again for name when name phase gets no valid name", async () => {
    const { options, classifyCommand, mirrorActions, speakText, registrationActions } =
      buildOptions();
    classifyCommand.mockResolvedValue({
      ok: true,
      intent: "UNKNOWN",
      name: null,
      entities: { name: null, date: null },
      response: "I didn't understand that."
    });

    const handler = createMirrorVoiceHandler({
      ...options,
      phase: "name"
    });

    await handler("something unclear");

    expect(mirrorActions.setStatus).toHaveBeenCalledWith({
      key: "status.sayYourName"
    });
    expect(speakText).toHaveBeenCalledOnce();
    expect(registrationActions.captureName).not.toHaveBeenCalled();
  });

  it("starts scanning after positive name confirmation", async () => {
    const { options, classifyCommand, registrationActions, speakText } = buildOptions();
    classifyCommand.mockResolvedValue({
      ok: true,
      intent: "CONFIRM_YES",
      name: null,
      entities: { name: null, date: null },
      response: "Confirmed."
    });

    const handler = createMirrorVoiceHandler({
      ...options,
      phase: "nameConfirm"
    });

    await handler("yes");

    expect(registrationActions.startScan).toHaveBeenCalledOnce();
    expect(speakText).toHaveBeenCalledOnce();
  });

  it("begins language change when spoken language is resolved", async () => {
    const { options, classifyCommand, languageActions } = buildOptions();
    classifyCommand.mockResolvedValue({
      ok: true,
      intent: "UNKNOWN",
      name: null,
      entities: { name: null, date: null },
      response: "I didn't understand that."
    });

    const handler = createMirrorVoiceHandler({
      ...options,
      phase: "changeLanguage"
    });

    await handler("mandarin");

    expect(languageActions.beginChange).toHaveBeenCalledWith("zh");
  });
});
