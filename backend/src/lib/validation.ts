export const isString = (value: unknown): value is string => typeof value === "string";

export const parsePositiveInt = (value: unknown) => {
  const parsed = typeof value === "string" ? Number(value) : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};
