const languageSchema = {
  type: "string",
  enum: ["en", "zh"]
} as const;

const weatherSchema = {
  type: "object",
  required: ["current"],
  additionalProperties: true,
  properties: {
    location: { type: "string" },
    current: {
      type: "object",
      required: ["temperatureC", "condition"],
      additionalProperties: true,
      properties: {
        temperatureC: { type: "number" },
        condition: { type: "string" },
        rainChancePct: {
          anyOf: [{ type: "number" }, { type: "null" }]
        }
      }
    },
    forecast: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
        properties: {
          temperatureC: { type: "number" },
          condition: { type: "string" },
          rainChancePct: {
            anyOf: [{ type: "number" }, { type: "null" }]
          }
        }
      }
    }
  }
} as const;

export const registerUserRouteSchema = {
  body: {
    type: "object",
    required: ["name"],
    additionalProperties: false,
    properties: {
      name: { type: "string", minLength: 2 },
      faceLabel: { type: "string", minLength: 1 },
      faceDescriptor: { type: "string", minLength: 1 },
      location: { type: "string", minLength: 1 },
      preferredLanguage: languageSchema
    }
  }
} as const;

export const dashboardSummaryRouteSchema = {
  body: {
    type: "object",
    required: ["weather", "appointmentCount"],
    additionalProperties: false,
    properties: {
      weather: weatherSchema,
      appointmentCount: { type: "number", minimum: 0 },
      language: {
        anyOf: [languageSchema, { type: "null" }]
      }
    }
  }
} as const;
