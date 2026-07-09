import { beforeEach, describe, expect, it, vi } from "vitest";

const { classifyIntentMock } = vi.hoisted(() => ({
  classifyIntentMock: vi.fn()
}));

vi.mock("../ai/ai-client.js", () => ({
  classifyIntent: classifyIntentMock
}));

import { inferVoiceCommand, parseClassifierResponse } from "./intent.js";

describe("parseClassifierResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses a plain intent", () => {
    expect(parseClassifierResponse("WAKE_MIRROR", "en")).toMatchObject({
      intent: "WAKE_MIRROR",
      entities: {
        name: null,
        date: null
      }
    });
  });

  it("parses a provided name entity", () => {
    expect(parseClassifierResponse("PROVIDE_NAME|John", "en")).toMatchObject({
      intent: "PROVIDE_NAME",
      entities: {
        name: "John",
        date: null
      },
      response: "Captured name John."
    });
  });

  it("parses fenced classifier output", () => {
    expect(parseClassifierResponse("```text\nGET_WEATHER\n```", "en")).toMatchObject({
      intent: "GET_WEATHER",
      entities: {
        name: null,
        date: null
      },
      response: "Showing weather."
    });
  });

  it("uses localized responses for chinese output", () => {
    expect(parseClassifierResponse("SET_LANGUAGE_ZH", "zh")).toMatchObject({
      intent: "SET_LANGUAGE_ZH",
      response: "切换到普通话。"
    });
  });

  it("ignores empty provided name values", () => {
    expect(parseClassifierResponse("PROVIDE_NAME|   ", "en")).toMatchObject({
      intent: "PROVIDE_NAME",
      entities: {
        name: null,
        date: null
      },
      response: "Name captured."
    });
  });

  it("rejects unsupported classifier output", () => {
    expect(parseClassifierResponse("HELLO", "en")).toBeNull();
  });

  it("falls back to UNKNOWN when classifier returns empty content", async () => {
    classifyIntentMock.mockResolvedValue("");

    await expect(
      inferVoiceCommand({
        transcript: "hello mirror",
        phase: "idle",
        language: "en"
      })
    ).resolves.toMatchObject({
      intent: "UNKNOWN",
      response: "I didn't understand that."
    });
  });

  it("falls back to localized UNKNOWN when classifier throws", async () => {
    classifyIntentMock.mockRejectedValue(new Error("network failed"));

    await expect(
      inferVoiceCommand({
        transcript: "你好",
        phase: "dashboard",
        language: "zh"
      })
    ).resolves.toMatchObject({
      intent: "UNKNOWN",
      response: "我没听懂。"
    });
  });
});
