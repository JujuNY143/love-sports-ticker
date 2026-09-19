import { describe, expect, it } from "vitest";
import { writeDraft } from "../src/newsroom/scriptWriter.js";
import type { NewsItem } from "../src/newsroom/types.js";

const closeGame: NewsItem = {
  id: "g1",
  league: "basketball/nba",
  headline: "Wolves stun Nuggets 121-118",
  summary: "A buzzer-beater capped the comeback.",
  publishedAt: new Date().toISOString(),
  sourceUrl: "https://example.com/g1",
  kind: "close_game",
  score: { home: { name: "Nuggets", points: 118 }, away: { name: "Timberwolves", points: 121 } },
};

const injury: NewsItem = {
  id: "i1",
  league: "football/nfl",
  headline: "Star QB ruled out with ankle injury",
  summary: "Backup expected to start next week.",
  publishedAt: new Date().toISOString(),
  sourceUrl: "https://example.com/i1",
  kind: "injury",
};

describe("writeDraft", () => {
  it("picks GiGi for close games and includes the score", () => {
    const draft = writeDraft({ item: closeGame, priority: "notable", reasons: ["test"] });
    expect(draft.character).toBe("gigi");
    expect(draft.script).toContain("Timberwolves 121");
    expect(draft.script).toContain("Nuggets 118");
    expect(draft.status).toBe("pending");
    expect(draft.estimatedSeconds).toBeGreaterThan(0);
  });

  it("picks Coach Bobby for injuries", () => {
    const draft = writeDraft({ item: injury, priority: "breaking", reasons: ["test"] });
    expect(draft.character).toBe("coach-bobby");
    expect(draft.script).toContain(injury.headline);
  });

  it("produces a stable id per call and preserves reasons/priority", () => {
    const draft = writeDraft({ item: injury, priority: "breaking", reasons: ["feed tagged this as injury"] });
    expect(draft.priority).toBe("breaking");
    expect(draft.reasons).toEqual(["feed tagged this as injury"]);
    expect(draft.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
