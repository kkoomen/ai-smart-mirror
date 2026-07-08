export const isWakePhrase = (value: string) =>
  value.includes("hey mirror") || value.includes("hello mirror");

export const isSleepPhrase = (value: string) =>
  value.includes("bye mirror") || value.includes("goodbye mirror");
