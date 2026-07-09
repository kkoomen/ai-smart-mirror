export const positiveIntParamSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: {
    id: {
      type: "string",
      pattern: "^[1-9][0-9]*$"
    }
  }
} as const;
