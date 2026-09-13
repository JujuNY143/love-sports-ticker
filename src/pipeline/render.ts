import { writeFile } from "node:fs/promises";
import path from "node:path";
import { CONTENT_ROOT, listApproved, markRendered } from "../approval/store.js";
import { characters } from "../newsroom/characters.js";
import { HeygenClient } from "../heygen/client.js";
import { appendSegment } from "./manifest.js";

/**
 * Pipeline stage 3: for every human-approved draft, call HeyGen to render the avatar video,
 * download it, and append it to the outbox manifest that the 24/7 stream's playout reads from.
 * Run manually (`npm run render`) or via the workflow_dispatch GitHub Action so avatar-render
 * credits are only spent on things a person actually approved.
 */
async function main(): Promise<void> {
  const approved = await listApproved();
  if (approved.length === 0) {
    console.log("[render] nothing approved to render. Run `npm run review` first.");
    return;
  }

  const client = new HeygenClient();

  for (const draft of approved) {
    const character = characters.find((c) => c.id === draft.character);
    if (!character) {
      console.error(`[render] unknown character "${draft.character}" for draft ${draft.id}, skipping`);
      continue;
    }
    if (character.heygenAvatarId.startsWith("REPLACE_WITH_")) {
      console.error(
        `[render] character "${character.id}" still has a placeholder HeyGen avatar/voice ID — ` +
          `set real IDs in src/newsroom/characters.ts before rendering. Skipping ${draft.id}.`
      );
      continue;
    }

    console.log(`[render] generating video for ${draft.id} (${character.displayName})...`);
    try {
      const videoId = await client.generateVideo({
        script: draft.script,
        avatarId: character.heygenAvatarId,
        voiceId: character.heygenVoiceId,
      });

      const status = await client.pollUntilDone(videoId);
      if (status.status !== "completed" || !status.videoUrl) {
        console.error(`[render] video ${videoId} for draft ${draft.id} did not complete: ${status.error ?? status.status}`);
        continue;
      }

      const videoRes = await fetch(status.videoUrl);
      if (!videoRes.ok) throw new Error(`Failed to download rendered video: ${videoRes.status}`);
      const bytes = Buffer.from(await videoRes.arrayBuffer());
      const relativeVideoPath = path.join("rendered", `${draft.id}.mp4`);
      await writeFile(path.join(CONTENT_ROOT, relativeVideoPath), bytes);

      const renderedAt = new Date().toISOString();
      await markRendered(draft.id, { heygenVideoId: videoId, videoUrl: status.videoUrl, renderedAt });
      await appendSegment({
        id: draft.id,
        headline: draft.item.headline,
        character: character.id,
        league: draft.item.league,
        priority: draft.priority,
        sourceUrl: draft.item.sourceUrl,
        videoPath: relativeVideoPath,
        estimatedSeconds: draft.estimatedSeconds,
        renderedAt,
      });

      console.log(`[render] done: ${relativeVideoPath}`);
    } catch (err) {
      console.error(`[render] failed for draft ${draft.id}:`, err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
