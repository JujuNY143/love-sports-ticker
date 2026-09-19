import type { NewsItem } from "./types.js";

export interface Character {
  id: string;
  displayName: string;
  tone: string;
  /**
   * HeyGen avatar + voice IDs (from your HeyGen account's Avatars/Voices library).
   * These are placeholders — set the real IDs before running render.ts, either here
   * or via env overrides in src/heygen/client.ts.
   */
  heygenAvatarId: string;
  heygenVoiceId: string;
  signOn: string;
  signOff: string;
  handles: (item: NewsItem) => boolean;
}

export const characters: Character[] = [
  {
    id: "coach-bobby",
    displayName: "Coach Bobby",
    tone: "veteran analyst, measured and experienced",
    heygenAvatarId: "REPLACE_WITH_HEYGEN_AVATAR_ID_COACH_BOBBY",
    heygenVoiceId: "REPLACE_WITH_HEYGEN_VOICE_ID_COACH_BOBBY",
    signOn: "Coach Bobby here, let's break it down.",
    signOff: "That's how I see it. Back to you.",
    handles: (item) => item.kind === "injury" || item.kind === "transaction",
  },
  {
    id: "gigi",
    displayName: "GiGi",
    tone: "high-energy hype reporter",
    heygenAvatarId: "REPLACE_WITH_HEYGEN_AVATAR_ID_GIGI",
    heygenVoiceId: "REPLACE_WITH_HEYGEN_VOICE_ID_GIGI",
    signOn: "It's your girl GiGi, and I've got the tea on this one.",
    signOff: "That's the play. See you next time!",
    handles: (item) => item.kind === "close_game",
  },
  {
    id: "josh",
    displayName: "Josh",
    tone: "calm, steady roundup anchor",
    heygenAvatarId: "REPLACE_WITH_HEYGEN_AVATAR_ID_JOSH",
    heygenVoiceId: "REPLACE_WITH_HEYGEN_VOICE_ID_JOSH",
    signOn: "Josh here with what you need to know.",
    signOff: "That's the rundown. Back to you.",
    handles: () => true, // fallback for final_score / headline items
  },
];

/**
 * Big Money Lou (betting-angle host) exists in the n8n build's Characters sheet,
 * chosen manually per row there. He's not wired into this file's auto-pick-by-news-kind
 * logic below since none of NewsItem's `kind` values map to a betting angle - add one
 * (e.g. a "line_movement" kind) if this pipeline should route to him automatically.
 */

/** First character whose `handles` predicate matches; characters list order encodes priority. */
export function pickCharacter(item: NewsItem): Character {
  const match = characters.find((c) => c.handles(item));
  // The last character's handles() is `() => true`, so this is unreachable, but keep TS happy
  // and fail loudly instead of silently picking undefined if that invariant ever changes.
  if (!match) throw new Error(`No character configured to handle item kind "${item.kind}"`);
  return match;
}
