export interface GenerateVideoParams {
  script: string;
  avatarId: string;
  voiceId: string;
}

export interface HeygenVideoStatus {
  status: "processing" | "completed" | "failed" | "waiting" | "pending";
  videoUrl?: string;
  error?: string;
}
