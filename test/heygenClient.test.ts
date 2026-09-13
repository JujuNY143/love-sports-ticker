import { describe, expect, it, vi } from "vitest";
import { HeygenClient } from "../src/heygen/client.js";

function fakeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("HeygenClient", () => {
  it("throws a clear error when no API key is configured", async () => {
    const client = new HeygenClient("", "https://api.heygen.com", vi.fn());
    await expect(client.generateVideo({ script: "hi", avatarId: "a", voiceId: "v" })).rejects.toThrow(
      /HEYGEN_API_KEY is not set/
    );
  });

  it("generateVideo returns the video_id on success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse(200, { data: { video_id: "vid-123" } }));
    const client = new HeygenClient("key", "https://api.heygen.com", fetchImpl);
    const id = await client.generateVideo({ script: "hi", avatarId: "a", voiceId: "v" });
    expect(id).toBe("vid-123");

    const [url, opts] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://api.heygen.com/v2/video/generate");
    const body = JSON.parse((opts as RequestInit).body as string);
    expect(body.video_inputs[0].character.avatar_id).toBe("a");
    expect(body.video_inputs[0].voice.input_text).toBe("hi");
  });

  it("generateVideo throws on HTTP error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse(400, { error: "bad avatar id" }));
    const client = new HeygenClient("key", "https://api.heygen.com", fetchImpl);
    await expect(client.generateVideo({ script: "hi", avatarId: "bad", voiceId: "v" })).rejects.toThrow(
      /HeyGen generateVideo failed/
    );
  });

  it("getStatus maps a completed response", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(fakeResponse(200, { data: { status: "completed", video_url: "https://cdn/x.mp4" } }));
    const client = new HeygenClient("key", "https://api.heygen.com", fetchImpl);
    const status = await client.getStatus("vid-123");
    expect(status).toEqual({ status: "completed", videoUrl: "https://cdn/x.mp4", error: undefined });
  });

  it("pollUntilDone polls until completed", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse(200, { data: { status: "processing" } }))
      .mockResolvedValueOnce(fakeResponse(200, { data: { status: "completed", video_url: "https://cdn/x.mp4" } }));
    const client = new HeygenClient("key", "https://api.heygen.com", fetchImpl);
    const status = await client.pollUntilDone("vid-123", { intervalMs: 1 });
    expect(status.status).toBe("completed");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("pollUntilDone times out gracefully", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse(200, { data: { status: "processing" } }));
    const client = new HeygenClient("key", "https://api.heygen.com", fetchImpl);
    const status = await client.pollUntilDone("vid-123", { intervalMs: 1, timeoutMs: 5 });
    expect(status.status).toBe("failed");
    expect(status.error).toMatch(/Timed out/);
  });
});
