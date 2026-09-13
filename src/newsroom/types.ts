/** A normalized item pulled from a sports feed, before any newsroom judgement is applied. */
export interface NewsItem {
  id: string;
  league: string;
  headline: string;
  summary: string;
  /** ISO 8601 timestamp of when the underlying event/story happened or was published. */
  publishedAt: string;
  /** Feed-specific link back to the source, kept for sourcing/citation purposes. */
  sourceUrl: string;
  kind: "final_score" | "close_game" | "headline" | "injury" | "transaction";
  teams?: string[];
  score?: { home: { name: string; points: number }; away: { name: string; points: number } };
}

export type Priority = "breaking" | "notable" | "skip";

export interface BreakingNewsResult {
  item: NewsItem;
  priority: Priority;
  reasons: string[];
}

export interface ScriptDraft {
  /** Stable id, also used as the filename stem under content/{drafts,approved,rejected,rendered}. */
  id: string;
  createdAt: string;
  item: NewsItem;
  priority: Priority;
  reasons: string[];
  character: string;
  script: string;
  /** Rough estimate so segment length can be planned for the 24h schedule. */
  estimatedSeconds: number;
  status: "pending" | "approved" | "rejected" | "rendered";
  /** Filled in once a human reviews it via `npm run review`. */
  reviewedAt?: string;
  reviewNote?: string;
  /** Filled in once render.ts calls HeyGen successfully. */
  render?: {
    heygenVideoId: string;
    videoUrl: string;
    renderedAt: string;
  };
}
