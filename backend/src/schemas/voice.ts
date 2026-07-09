export const voiceCommandRouteSchema = {
  body: {
    type: "object",
    required: ["transcript"],
    additionalProperties: false,
    properties: {
      transcript: { type: "string", minLength: 1 },
      phase: {
        type: "string",
        enum: [
          "idle",
          "waking",
          "hello",
          "name",
          "nameConfirm",
          "scan",
          "changeLanguage",
          "dashboard",
          "unknown"
        ]
      },
      userId: {
        anyOf: [{ type: "integer", minimum: 1 }, { type: "null" }]
      },
      language: { type: "string" }
    }
  }
} as const;
