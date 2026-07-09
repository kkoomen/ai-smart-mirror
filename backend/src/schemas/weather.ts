export const weatherQueryRouteSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      location: { type: "string" }
    }
  }
} as const;
