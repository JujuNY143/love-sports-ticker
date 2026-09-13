import { createInterface } from "node:readline";
import { approveDraft, listPending, rejectDraft } from "./store.js";

/**
 * A queue-backed prompt instead of readline/promises' `question()`: with piped/non-TTY
 * stdin (scripted approvals, tests), repeated `question()` calls hang forever once the
 * input stream reaches EOF between calls. Buffering `line` events sidesteps that and works
 * identically for a real interactive terminal.
 */
function makePrompter() {
  const rl = createInterface({ input: process.stdin });
  const buffer: string[] = [];
  const waiters: Array<(line: string) => void> = [];
  rl.on("line", (line) => {
    const waiter = waiters.shift();
    if (waiter) waiter(line);
    else buffer.push(line);
  });

  return {
    ask(promptText: string): Promise<string> {
      process.stdout.write(promptText);
      const next = buffer.shift();
      if (next !== undefined) return Promise.resolve(next);
      return new Promise((resolve) => waiters.push(resolve));
    },
    close(): void {
      rl.close();
    },
  };
}

function printDraft(index: number, total: number, draft: Awaited<ReturnType<typeof listPending>>[number]): void {
  console.log("\n" + "=".repeat(60));
  console.log(`Draft ${index + 1}/${total}  [${draft.priority.toUpperCase()}]  character: ${draft.character}`);
  console.log(`League: ${draft.item.league}    Source: ${draft.item.sourceUrl}`);
  console.log(`Reasons: ${draft.reasons.join("; ")}`);
  console.log("-".repeat(60));
  console.log(draft.script);
  console.log(`(~${draft.estimatedSeconds}s)`);
  console.log("=".repeat(60));
}

async function main(): Promise<void> {
  const pending = await listPending();
  if (pending.length === 0) {
    console.log("No pending drafts to review. Run `npm run draft` first.");
    return;
  }

  const prompter = makePrompter();
  let approved = 0;
  let rejected = 0;

  for (let i = 0; i < pending.length; i++) {
    const draft = pending[i]!;
    printDraft(i, pending.length, draft);
    const answer = (await prompter.ask("Approve, reject, skip, or quit? [a/r/s/q] ")).trim().toLowerCase();

    if (answer === "q" || answer === "quit") break;
    if (answer === "s" || answer === "skip" || answer === "") continue;

    if (answer === "a" || answer === "approve") {
      const note = await prompter.ask("Optional note (enter to skip): ");
      await approveDraft(draft.id, note || undefined);
      approved++;
      console.log(`Approved. It will render on the next \`npm run render\`.`);
    } else if (answer === "r" || answer === "reject") {
      const note = await prompter.ask("Reason for rejecting (enter to skip): ");
      await rejectDraft(draft.id, note || undefined);
      rejected++;
      console.log("Rejected.");
    } else {
      console.log(`Unrecognized input "${answer}", skipping this draft.`);
    }
  }

  prompter.close();
  console.log(`\nReview session done: ${approved} approved, ${rejected} rejected.`);
  console.log("Commit content/{drafts,approved,rejected}/ so the approval trail is auditable in git.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
