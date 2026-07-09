import "dotenv/config";

const parsePort = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  port: parsePort(process.env.PORT, 3001),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY ?? "",
  deepSeekApiKey: process.env.DEEPSEEK_API_KEY ?? "",
  deepSeekModel: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
};
