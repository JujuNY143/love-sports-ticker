import { fetchAllFeeds } from "../feeds/index.js";
import { classifyNewsItem } from "../newsroom/breakingNews.js";
import { writeDraft } from "../newsroom/scriptWriter.js";
import { saveDraft } from "../approval/store.js";

/**
 * Pipeline stage 1: fetch feeds, classify, write scripts for anything breaking/notable,
 * and drop them in content/drafts/ for human review. Safe to run on a schedule (e.g. every
 * 15-20 min via GitHub Actions) — items are deduped by id upstream in feeds/index.ts, but
 * running this repeatedly will still re-draft the same headline each run since there's no
 * "already drafted" ledger; drafts a human already approved/rejected won't be recreated
 * because their source item won't reappear once the underlying game/story is over, but if
 * you fetch a `headline`-type story across multiple cycles, review/reject once and move on.
 */
async function main(): Promise<void> {
  const items = await fetchAllFeeds();
  console.log(`[draft] fetched ${items.length} feed items`);

  let written = 0;
  for (const item of items) {
    const classified = classifyNewsItem(item);
    if (classified.priority === "skip") continue;
    const draft = writeDraft(classified);
    await saveDraft(draft);
    written++;
    console.log(`[draft] wrote ${draft.id} (${draft.priority}, ${draft.character}): ${item.headline}`);
  }

  console.log(`[draft] done: ${written} draft(s) written to content/drafts/. Run \`npm run review\` next.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
