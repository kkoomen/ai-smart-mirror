import { positiveIntParamSchema } from "./common.js";

export const userIdParamRouteSchema = {
  params: positiveIntParamSchema
} as const;

export const updateUserLanguageRouteSchema = {
  params: positiveIntParamSchema,
  body: {
    type: "object",
    required: ["preferredLanguage"],
    additionalProperties: false,
    properties: {
      preferredLanguage: {
        type: "string",
        enum: ["en", "zh"]
      }
    }
  }
} as const;
