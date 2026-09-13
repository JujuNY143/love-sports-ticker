import { describe, expect, it } from "vitest";
import { classifyNewsItem } from "../src/newsroom/breakingNews.js";
import type { NewsItem } from "../src/newsroom/types.js";

function item(overrides: Partial<NewsItem>): NewsItem {
  return {
    id: "test-1",
    league: "basketball/nba",
    headline: "A routine headline",
    summary: "",
    publishedAt: new Date().toISOString(),
    sourceUrl: "https://example.com",
    kind: "headline",
    ...overrides,
  };
}

describe("classifyNewsItem", () => {
  it("flags injuries as breaking", () => {
    const result = classifyNewsItem(item({ kind: "injury", headline: "Star player hurt" }));
    expect(result.priority).toBe("breaking");
  });

  it("flags transactions as breaking", () => {
    const result = classifyNewsItem(item({ kind: "transaction", headline: "Team trades veteran" }));
    expect(result.priority).toBe("breaking");
  });

  it("flags close games as notable", () => {
    const result = classifyNewsItem(item({ kind: "close_game", headline: "Team A beats Team B 100-99" }));
    expect(result.priority).toBe("notable");
    expect(result.reasons.join(" ")).toMatch(/3 points or fewer/);
  });

  it("flags a keyword-laden headline as breaking even without a special kind", () => {
    const result = classifyNewsItem(item({ headline: "Coach fired after disastrous season" }));
    expect(result.priority).toBe("breaking");
  });

  it("flags rumor headlines as notable", () => {
    const result = classifyNewsItem(item({ headline: "Rumors swirl about a possible coaching change" }));
    expect(result.priority).toBe("notable");
  });

  it("skips routine final scores and generic headlines", () => {
    const result = classifyNewsItem(item({ kind: "final_score", headline: "Team A 110, Team B 90" }));
    expect(result.priority).toBe("skip");
  });
});
