import type { NewsItem } from "../newsroom/types.js";

const ESPN_SITE_BASE = "https://site.api.espn.com/apis/site/v2/sports";

interface EspnCompetitor {
  homeAway: "home" | "away";
  score?: string;
  team: { displayName: string };
}

interface EspnStatus {
  type: { state: string; completed: boolean };
}

interface EspnCompetition {
  competitors: EspnCompetitor[];
}

interface EspnEvent {
  id: string;
  name: string;
  date: string;
  status: EspnStatus;
  competitions: EspnCompetition[];
}

interface EspnScoreboardResponse {
  events?: EspnEvent[];
}

interface EspnNewsArticle {
  headline: string;
  description?: string;
  published: string;
  links?: { web?: { href?: string } };
}

interface EspnNewsResponse {
  articles?: EspnNewsArticle[];
}

/** Fetches live/final scoreboard data for one ESPN league slug (e.g. "basketball/nba"). */
export async function fetchEspnScoreboard(league: string): Promise<NewsItem[]> {
  const url = `${ESPN_SITE_BASE}/${league}/scoreboard`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN scoreboard fetch failed for ${league}: ${res.status} ${res.statusText}`);
  const data = (await res.json()) as EspnScoreboardResponse;

  const items: NewsItem[] = [];
  for (const event of data.events ?? []) {
    const competition = event.competitions?.[0];
    if (!competition) continue;
    const home = competition.competitors.find((c) => c.homeAway === "home");
    const away = competition.competitors.find((c) => c.homeAway === "away");
    if (!home || !away) continue;

    const isFinal = event.status.type.completed;
    const homePts = Number(home.score ?? NaN);
    const awayPts = Number(away.score ?? NaN);
    const margin = Number.isFinite(homePts) && Number.isFinite(awayPts) ? Math.abs(homePts - awayPts) : undefined;

    if (!isFinal) continue; // only report on completed games; in-progress states are the ticker's job, not the newsroom's.

    items.push({
      id: `espn-${league}-${event.id}`,
      league,
      headline: `${event.name} — Final`,
      summary: `${away.team.displayName} ${away.score ?? "?"}, ${home.team.displayName} ${home.score ?? "?"}.`,
      publishedAt: event.date,
      sourceUrl: `https://www.espn.com/${league}/game/_/gameId/${event.id}`,
      kind: margin !== undefined && margin <= 3 ? "close_game" : "final_score",
      teams: [home.team.displayName, away.team.displayName],
      score:
        Number.isFinite(homePts) && Number.isFinite(awayPts)
          ? {
              home: { name: home.team.displayName, points: homePts },
              away: { name: away.team.displayName, points: awayPts },
            }
          : undefined,
    });
  }
  return items;
}

/** Fetches general news headlines for one ESPN league slug. */
export async function fetchEspnNews(league: string): Promise<NewsItem[]> {
  const url = `${ESPN_SITE_BASE}/${league}/news`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN news fetch failed for ${league}: ${res.status} ${res.statusText}`);
  const data = (await res.json()) as EspnNewsResponse;

  return (data.articles ?? []).map((article, idx) => ({
    id: `espn-news-${league}-${idx}-${Buffer.from(article.headline).toString("base64url").slice(0, 16)}`,
    league,
    headline: article.headline,
    summary: article.description ?? "",
    publishedAt: article.published,
    sourceUrl: article.links?.web?.href ?? `https://www.espn.com/${league}/`,
    kind: "headline",
  }));
}

/** Fetches and merges scoreboard + news items for one league. Never throws — logs and returns []. */
export async function fetchLeagueFeed(league: string): Promise<NewsItem[]> {
  const [scores, news] = await Promise.allSettled([fetchEspnScoreboard(league), fetchEspnNews(league)]);
  const items: NewsItem[] = [];
  if (scores.status === "fulfilled") items.push(...scores.value);
  else console.error(`[feeds] scoreboard error for ${league}:`, scores.reason);
  if (news.status === "fulfilled") items.push(...news.value);
  else console.error(`[feeds] news error for ${league}:`, news.reason);
  return items;
}
