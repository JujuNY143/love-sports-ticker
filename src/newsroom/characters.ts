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
    id: "coach-ray",
    displayName: "Coach Ray",
    tone: "gruff veteran analyst, no wasted words",
    heygenAvatarId: "REPLACE_WITH_HEYGEN_AVATAR_ID_COACH_RAY",
    heygenVoiceId: "REPLACE_WITH_HEYGEN_VOICE_ID_COACH_RAY",
    signOn: "Coach Ray here with the news that matters.",
    signOff: "Back to you in the booth.",
    handles: (item) => item.kind === "injury" || item.kind === "transaction",
  },
  {
    id: "jules-fastbreak",
    displayName: "Jules Fastbreak",
    tone: "high-energy hype reporter",
    heygenAvatarId: "REPLACE_WITH_HEYGEN_AVATAR_ID_JULES",
    heygenVoiceId: "REPLACE_WITH_HEYGEN_VOICE_ID_JULES",
    signOn: "Jules Fastbreak here, and you will NOT believe what just happened.",
    signOff: "That's the play of the night. Back to you!",
    handles: (item) => item.kind === "close_game",
  },
  {
    id: "digest-dana",
    displayName: "Digest Dana",
    tone: "calm, steady roundup anchor",
    heygenAvatarId: "REPLACE_WITH_HEYGEN_AVATAR_ID_DANA",
    heygenVoiceId: "REPLACE_WITH_HEYGEN_VOICE_ID_DANA",
    signOn: "Here's what's happening around the league.",
    signOff: "We'll keep you posted.",
    handles: () => true, // fallback for final_score / headline items
  },
];

/** First character whose `handles` predicate matches; characters list order encodes priority. */
export function pickCharacter(item: NewsItem): Character {
  const match = characters.find((c) => c.handles(item));
  // The last character's handles() is `() => true`, so this is unreachable, but keep TS happy
  // and fail loudly instead of silently picking undefined if that invariant ever changes.
  if (!match) throw new Error(`No character configured to handle item kind "${item.kind}"`);
  return match;
}
