import "dotenv/config";

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

export const env = {
  heygenApiKey: process.env.HEYGEN_API_KEY ?? "",
  heygenApiBase: process.env.HEYGEN_API_BASE ?? "https://api.heygen.com",
  sportsLeagues: (process.env.SPORTS_LEAGUES ?? "football/nfl,basketball/nba,baseball/mlb,hockey/nhl")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  useSampleFeed: bool(process.env.USE_SAMPLE_FEED, false),
};
