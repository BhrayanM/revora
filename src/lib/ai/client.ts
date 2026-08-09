import "server-only";

import { OpenAI } from "openai";

import { aiConfig } from "@/lib/ai/config";
import { AIConfigurationError } from "@/lib/ai/errors";

let clientInstance: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (clientInstance) {
    return clientInstance;
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new AIConfigurationError(
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
