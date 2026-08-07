import "server-only";

import { OpenAI } from "openai";

import { aiConfig } from "@/lib/ai/config";

let clientInstance: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (clientInstance) {
    return clientInstance;
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. AI features are unavailable.",
    );
  }

  clientInstance = new OpenAI({
    apiKey,
    timeout: aiConfig.timeoutMs,
    maxRetries: 0,
  });

  return clientInstance;
}
