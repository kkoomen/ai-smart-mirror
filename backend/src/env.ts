import "dotenv/config";

const parsePort = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  port: parsePort(process.env.PORT, 3001),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173"
};

