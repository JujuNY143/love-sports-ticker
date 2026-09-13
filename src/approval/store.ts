import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ScriptDraft } from "../newsroom/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_ROOT = path.resolve(__dirname, "../../content");

export type Stage = "drafts" | "approved" | "rejected" | "rendered";

function dirFor(stage: Stage): string {
  return path.join(CONTENT_ROOT, stage);
}

function fileFor(stage: Stage, id: string): string {
  return path.join(dirFor(stage), `${id}.json`);
}

async function ensureDirs(): Promise<void> {
  await Promise.all((["drafts", "approved", "rejected", "rendered"] as Stage[]).map((s) => mkdir(dirFor(s), { recursive: true })));
}

/** Writes a brand-new draft into content/drafts/<id>.json. */
export async function saveDraft(draft: ScriptDraft): Promise<void> {
  await ensureDirs();
  await writeFile(fileFor("drafts", draft.id), JSON.stringify(draft, null, 2) + "\n", "utf8");
}

async function listStage(stage: Stage): Promise<ScriptDraft[]> {
  await ensureDirs();
  const files = (await readdir(dirFor(stage))).filter((f) => f.endsWith(".json"));
  const drafts = await Promise.all(
    files.map(async (f) => JSON.parse(await readFile(path.join(dirFor(stage), f), "utf8")) as ScriptDraft)
  );
  return drafts.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export const listPending = () => listStage("drafts");
export const listApproved = () => listStage("approved");
export const listRejected = () => listStage("rejected");
export const listRendered = () => listStage("rendered");

async function move(id: string, from: Stage, to: Stage, mutate: (d: ScriptDraft) => ScriptDraft): Promise<ScriptDraft> {
  await ensureDirs();
  const raw = await readFile(fileFor(from, id), "utf8");
  const updated = mutate(JSON.parse(raw) as ScriptDraft);
  await writeFile(fileFor(to, id), JSON.stringify(updated, null, 2) + "\n", "utf8");
  await unlink(fileFor(from, id));
  return updated;
}

/** Approves a pending draft: moves content/drafts/<id>.json -> content/approved/<id>.json. */
export async function approveDraft(id: string, note?: string): Promise<ScriptDraft> {
  return move(id, "drafts", "approved", (d) => ({
    ...d,
    status: "approved",
    reviewedAt: new Date().toISOString(),
    reviewNote: note,
  }));
}

/** Rejects a pending draft: moves content/drafts/<id>.json -> content/rejected/<id>.json. */
export async function rejectDraft(id: string, note?: string): Promise<ScriptDraft> {
  return move(id, "drafts", "rejected", (d) => ({
    ...d,
    status: "rejected",
    reviewedAt: new Date().toISOString(),
    reviewNote: note,
  }));
}

/** Marks an approved draft as rendered and moves it to content/rendered/<id>.json. */
export async function markRendered(
  id: string,
  render: NonNullable<ScriptDraft["render"]>
): Promise<ScriptDraft> {
  return move(id, "approved", "rendered", (d) => ({ ...d, status: "rendered", render }));
}

export { CONTENT_ROOT };
