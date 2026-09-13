import type { Character } from "./characters.js";
import type { NewsItem } from "./types.js";

/**
 * Template-based (not LLM-based) script generation: deterministic, free, and reviewable —
 * the same headline always produces the same script, which makes manual approval and
 * regression testing meaningful.
 */
export function buildScript(item: NewsItem, character: Character): string {
  const lines: string[] = [character.signOn];

  switch (item.kind) {
    case "close_game": {
      const s = item.score;
      lines.push(
        s
          ? `${s.away.name} ${s.away.points}, ${s.home.name} ${s.home.points} — final. ${item.headline}.`
          : `${item.headline}.`
      );
      if (item.summary) lines.push(item.summary);
      break;
    }
    case "injury": {
      lines.push(item.headline + ".");
      if (item.summary) lines.push(item.summary);
      lines.push("We'll bring you updates on the timeline as they come in.");
      break;
    }
    case "transaction": {
      lines.push(item.headline + ".");
      if (item.summary) lines.push(item.summary);
      break;
    }
    case "final_score": {
      const s = item.score;
      lines.push(
        s
          ? `Final: ${s.away.name} ${s.away.points}, ${s.home.name} ${s.home.points}.`
          : `${item.headline}.`
      );
      break;
    }
    case "headline":
    default: {
      lines.push(item.headline + ".");
      if (item.summary) lines.push(item.summary);
      break;
    }
  }

  lines.push(character.signOff);
  return lines.join(" ");
}

/** ~150 spoken words per minute, rounded up, with a 3s floor for very short lines. */
export function estimateSeconds(script: string): number {
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.ceil((words / 150) * 60));
}
