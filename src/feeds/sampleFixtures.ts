import type { NewsItem } from "../newsroom/types.js";

/**
 * Local fixtures so the pipeline can be developed/tested/CI'd without hitting ESPN.
 * Enabled via USE_SAMPLE_FEED=1.
 */
export const sampleFeed: NewsItem[] = [
  {
    id: "sample-final-1",
    league: "basketball/nba",
    headline: "Wolves stun Nuggets 121-118 on buzzer-beater",
    summary: "Anthony Edwards hit a step-back three at the buzzer to complete a 14-point fourth-quarter comeback.",
    publishedAt: new Date().toISOString(),
    sourceUrl: "https://www.espn.com/nba/game/_/gameId/sample-final-1",
    kind: "close_game",
    teams: ["Timberwolves", "Nuggets"],
    score: { home: { name: "Nuggets", points: 118 }, away: { name: "Timberwolves", points: 121 } },
  },
  {
    id: "sample-injury-1",
    league: "football/nfl",
    headline: "Star QB carted off, ruled out with apparent ankle injury",
    summary: "The team says further evaluation is needed; backup is expected to start next week.",
    publishedAt: new Date().toISOString(),
    sourceUrl: "https://www.espn.com/nfl/story/_/id/sample-injury-1",
    kind: "injury",
    teams: ["Sample FC"],
  },
  {
    id: "sample-transaction-1",
    league: "baseball/mlb",
    headline: "Team trades All-Star closer ahead of deadline",
    summary: "A three-team deal sends the reliever to a division rival in exchange for two top-100 prospects.",
    publishedAt: new Date().toISOString(),
    sourceUrl: "https://www.espn.com/mlb/story/_/id/sample-transaction-1",
    kind: "transaction",
    teams: ["Sample Sox", "Sample Nine"],
  },
  {
    id: "sample-headline-1",
    league: "hockey/nhl",
    headline: "Weekly power rankings: who's rising and falling",
    summary: "A routine roundup with no urgent news.",
    publishedAt: new Date().toISOString(),
    sourceUrl: "https://www.espn.com/nhl/story/_/id/sample-headline-1",
    kind: "headline",
  },
];
