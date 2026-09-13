import type { BreakingNewsResult, NewsItem, Priority } from "./types.js";

const BREAKING_KEYWORDS = [
  "fired",
  "hired",
  "signs",
  "signed",
  "trade",
  "traded",
  "suspended",
  "suspension",
  "retires",
  "retirement",
  "injury",
  "injured",
  "torn",
  "out for the season",
  "carted off",
  "arrested",
  "record",
  "walk-off",
  "buzzer-beater",
  "upset",
];

const NOTABLE_KEYWORDS = ["rumor", "rumors", "questionable", "day-to-day", "returns", "debut"];

function matchedKeywords(haystack: string, keywords: string[]): string[] {
  return keywords.filter((kw) => haystack.includes(kw));
}

/**
 * Scores a single feed item for newsroom priority. Pure function, no I/O, easy to unit test
 * and to retune as the channel's editorial voice evolves.
 */
export function classifyNewsItem(item: NewsItem): BreakingNewsResult {
  const haystack = `${item.headline} ${item.summary}`.toLowerCase();
  const breakingHits = matchedKeywords(haystack, BREAKING_KEYWORDS);
  const notableHits = matchedKeywords(haystack, NOTABLE_KEYWORDS);

  const reasons: string[] = [];
  let priority: Priority;

  if (item.kind === "injury" || item.kind === "transaction") {
    reasons.push(`feed tagged this as ${item.kind}`);
    priority = "breaking";
  } else if (breakingHits.length > 0) {
    priority = "breaking";
  } else if (item.kind === "close_game") {
    reasons.push("final score decided by 3 points or fewer");
    priority = "notable";
  } else if (notableHits.length > 0) {
    priority = "notable";
  } else {
    priority = "skip";
  }

  for (const kw of [...breakingHits, ...notableHits]) reasons.push(`headline/summary contains "${kw}"`);
  if (reasons.length === 0) reasons.push(priority === "skip" ? "routine item, no editorial signal" : "flagged");

  return { item, priority, reasons };
}

export function classifyFeed(items: NewsItem[]): BreakingNewsResult[] {
  return items.map(classifyNewsItem);
}
