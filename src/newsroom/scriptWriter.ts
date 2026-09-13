import { randomUUID } from "node:crypto";
import { pickCharacter } from "./characters.js";
import { buildScript, estimateSeconds } from "./templates.js";
import type { BreakingNewsResult, ScriptDraft } from "./types.js";

/** Turns a classified feed item into a full draft segment, ready to drop in the approval queue. */
export function writeDraft(result: BreakingNewsResult): ScriptDraft {
  const character = pickCharacter(result.item);
  const script = buildScript(result.item, character);

  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    item: result.item,
    priority: result.priority,
    reasons: result.reasons,
    character: character.id,
    script,
    estimatedSeconds: estimateSeconds(script),
    status: "pending",
  };
}
