import "server-only";

import { getOpenAIClient } from "@/lib/ai/client";
import { aiConfig } from "@/lib/ai/config";
import {
  type RetryDecision,
  AIResponseValidationError,
  classifyAIError,
  getRetryDelay,
  shouldRetry,
} from "@/lib/ai/errors";
import type {
  AIRequest,
  AIResponse,
  AIStructuredResponse,
} from "@/lib/ai/types";

export type {
  AIRequest,
  AIResponse,
  AIStructuredResponse,
  AIMessage,
} from "@/lib/ai/types";
export type {
  QualificationResult,
  LeadTemperature,
} from "@/lib/ai/qualification";
export {
  scoreToTemperature,
  validateQualificationResult,
} from "@/lib/ai/qualification";
export { qualifyLead } from "@/lib/ai/lead-qualification";
export { qualifyLeadForOrg } from "@/lib/ai/lead-qualification-service";

function logAIError(
  operation: string,
  error: unknown,
  attempt: number,
  durationMs: number,
): void {
  const aiError = classifyAIError(error);
  const logData = {
    operation,
    errorCode: aiError.code,
    errorName: aiError.name,
    status: aiError.status,
    attempt,
    durationMs,
    model: aiConfig.model,
  };
  console.error("[AI Error]", JSON.stringify(logData));
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateText(request: AIRequest): Promise<AIResponse> {
  const startTime = Date.now();
  const model = request.model ?? aiConfig.model;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= aiConfig.retry.maxRetries; attempt++) {
    try {
      const client = getOpenAIClient();

      const completion = await client.chat.completions.create({
        model,
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
      });

      const content = completion.choices[0]?.message?.content ?? "";

      return {
        content,
        model: completion.model,
        usage: completion.usage
          ? {
              inputTokens: completion.usage.prompt_tokens,
              outputTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : null,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      lastError = err;
      const durationMs = Date.now() - startTime;
      logAIError("generateText", err, attempt, durationMs);

      const decision: RetryDecision = shouldRetry(
        err,
        attempt,
        aiConfig.retry.maxRetries,
      );

      if (!decision.shouldRetry) {
        throw classifyAIError(err);
      }

      const delay = getRetryDelay(
        attempt,
        aiConfig.retry.baseDelayMs,
        aiConfig.retry.maxDelayMs,
        aiConfig.retry.backoffMultiplier,
      );
      await sleep(delay);
    }
  }

  throw classifyAIError(lastError);
}

export async function generateStructuredOutput<T>(
  request: AIRequest,
): Promise<AIStructuredResponse<T>> {
  const startTime = Date.now();
  const model = request.model ?? aiConfig.model;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= aiConfig.retry.maxRetries; attempt++) {
    try {
      const client = getOpenAIClient();

      const messages = request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      if (request.responseSchema) {
        const systemMessage = messages.find((m) => m.role === "system");
        const schemaInstruction = `\n\nRespond only with valid JSON matching this schema. Do not include markdown formatting or explanation:\n${JSON.stringify(request.responseSchema, null, 2)}`;

        if (systemMessage) {
          systemMessage.content += schemaInstruction;
        } else {
          messages.unshift({
            role: "system",
            content: `You are a helpful assistant.${schemaInstruction}`,
          });
        }
      }

      const completion = await client.chat.completions.create({
        model,
        messages,
        temperature: request.temperature ?? 0,
        max_tokens: request.maxTokens,
        response_format: request.responseSchema
          ? { type: "json_object" }
          : undefined,
      });

      const rawContent = completion.choices[0]?.message?.content ?? "";

      let data: T;
      try {
        data = JSON.parse(rawContent) as T;
      } catch {
        throw new AIResponseValidationError(
          "Failed to parse structured response as JSON",
        );
      }

      return {
        data,
        model: completion.model,
        usage: completion.usage
          ? {
              inputTokens: completion.usage.prompt_tokens,
              outputTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : null,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      lastError = err;
      const durationMs = Date.now() - startTime;
      logAIError("generateStructuredOutput", err, attempt, durationMs);

      if (err instanceof AIResponseValidationError) {
        throw err;
      }

      const decision: RetryDecision = shouldRetry(
        err,
        attempt,
        aiConfig.retry.maxRetries,
      );

      if (!decision.shouldRetry) {
        throw classifyAIError(err);
      }

      const delay = getRetryDelay(
        attempt,
        aiConfig.retry.baseDelayMs,
        aiConfig.retry.maxDelayMs,
        aiConfig.retry.backoffMultiplier,
      );
      await sleep(delay);
    }
  }

  throw classifyAIError(lastError);
}
