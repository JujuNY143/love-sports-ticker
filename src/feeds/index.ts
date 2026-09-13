import { env } from "../config/env.js";
import type { NewsItem } from "../newsroom/types.js";
import { fetchLeagueFeed } from "./espn.js";
import { sampleFeed } from "./sampleFixtures.js";

/** Fetches the combined feed across all configured leagues, deduped by id. */
export async function fetchAllFeeds(): Promise<NewsItem[]> {
  if (env.useSampleFeed) return sampleFeed;

  const results = await Promise.all(env.sportsLeagues.map((league) => fetchLeagueFeed(league)));
  const byId = new Map<string, NewsItem>();
  for (const item of results.flat()) byId.set(item.id, item);
  return [...byId.values()];
}
