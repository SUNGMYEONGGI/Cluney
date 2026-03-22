import { google } from "@ai-sdk/google";

export function getChatModel() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY in .env.local");
  }

  const modelId = process.env.GOOGLE_MODEL ?? "gemini-2.5-pro";
  return google(modelId);
}