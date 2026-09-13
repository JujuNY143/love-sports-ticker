import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CONTENT_ROOT } from "../approval/store.js";

export interface OutboxSegment {
  id: string;
  headline: string;
  character: string;
  league: string;
  priority: string;
  sourceUrl: string;
  videoPath: string;
  estimatedSeconds: number;
  renderedAt: string;
}

export interface Manifest {
  segments: OutboxSegment[];
}

const MANIFEST_PATH = path.join(CONTENT_ROOT, "outbox", "manifest.json");

export async function readManifest(): Promise<Manifest> {
  try {
    return JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as Manifest;
  } catch {
    return { segments: [] };
  }
}

/** Appends a newly rendered segment to the outbox manifest that the 24/7 playout consumes. */
export async function appendSegment(segment: OutboxSegment): Promise<void> {
  const manifest = await readManifest();
  manifest.segments.push(segment);
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

export { MANIFEST_PATH };
