export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseSchema?: Record<string, unknown>;
}

export interface AIResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | null;
  durationMs: number;
}

export interface AIStructuredResponse<T> {
  data: T;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | null;
  durationMs: number;
}
