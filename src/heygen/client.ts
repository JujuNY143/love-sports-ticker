import { env } from "../config/env.js";
import type { GenerateVideoParams, HeygenVideoStatus } from "./types.js";

/**
 * Thin wrapper around HeyGen's Video Generation API (https://docs.heygen.com/reference/create-an-avatar-video-v2).
 * `fetchImpl` is injectable so tests can point this at a fake server instead of mocking global fetch.
 */
export class HeygenClient {
  constructor(
    private readonly apiKey: string = env.heygenApiKey,
    private readonly baseUrl: string = env.heygenApiBase,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  private headers(): Record<string, string> {
    if (!this.apiKey) {
      throw new Error("HEYGEN_API_KEY is not set. Copy .env.example to .env and fill it in before rendering.");
    }
    return { "X-Api-Key": this.apiKey, "Content-Type": "application/json" };
  }

  /** Kicks off a video generation job and returns HeyGen's video_id. */
  async generateVideo({ script, avatarId, voiceId }: GenerateVideoParams): Promise<string> {
    const res = await this.fetchImpl(`${this.baseUrl}/v2/video/generate`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        video_inputs: [
          {
            character: { type: "avatar", avatar_id: avatarId, avatar_style: "normal" },
            voice: { type: "text", input_text: script, voice_id: voiceId },
          },
        ],
        dimension: { width: 1280, height: 720 },
      }),
    });

    const body = (await res.json()) as { data?: { video_id?: string }; error?: unknown };
    if (!res.ok || !body.data?.video_id) {
      throw new Error(`HeyGen generateVideo failed: ${res.status} ${JSON.stringify(body.error ?? body)}`);
    }
    return body.data.video_id;
  }

  /** One-shot status check; callers should poll this with backoff (see pollUntilDone). */
  async getStatus(videoId: string): Promise<HeygenVideoStatus> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`, {
      headers: this.headers(),
    });
    const body = (await res.json()) as {
      data?: { status?: string; video_url?: string; error?: unknown };
      error?: unknown;
    };
    if (!res.ok) throw new Error(`HeyGen getStatus failed: ${res.status} ${JSON.stringify(body.error ?? body)}`);

    const status = (body.data?.status ?? "failed") as HeygenVideoStatus["status"];
    return {
      status,
      videoUrl: body.data?.video_url,
      error: body.data?.error ? JSON.stringify(body.data.error) : undefined,
    };
  }

  /**
   * Polls until the video is completed or failed, or `timeoutMs` elapses.
   * HeyGen renders typically take 1-5 minutes; defaults are tuned for that.
   */
  async pollUntilDone(videoId: string, opts: { intervalMs?: number; timeoutMs?: number } = {}): Promise<HeygenVideoStatus> {
    const intervalMs = opts.intervalMs ?? 10_000;
    const timeoutMs = opts.timeoutMs ?? 10 * 60 * 1000;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const status = await this.getStatus(videoId);
      if (status.status === "completed" || status.status === "failed") return status;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return { status: "failed", error: `Timed out after ${timeoutMs}ms waiting for video ${videoId}` };
  }
}
