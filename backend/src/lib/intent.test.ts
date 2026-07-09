import { describe, expect, it } from "vitest";
import { parseClassifierResponse } from "./intent.js";

describe("parseClassifierResponse", () => {
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

  it("rejects unsupported classifier output", () => {
    expect(parseClassifierResponse("HELLO", "en")).toBeNull();
  });
});
