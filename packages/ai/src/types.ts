export type Api = "openai-completions" | "mock";
export type Provider = "openai" | "anthropic" | "google";
export type ThinkingLevel = "minimal" | "low" | "medium" | "high" | "xhigh";

export interface StreamOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  apiKey?: string;
}

export interface SimpleStreamOptions extends StreamOptions {
  reasoning?: ThinkingLevel;
}

export interface TextContent { type: "text"; text: string; }
export interface ThinkingContent { type: "thinking"; thinking: string; }
export interface ImageContent { type: "image"; data: string; mimeType: string; }
export interface ToolCall { type: "toolCall"; id: string; name: string; arguments: any; }

export interface Usage {
  input: number; output: number; totalTokens: number;
}

export type StopReason = "stop" | "length" | "toolUse" | "error" | "aborted";

export interface UserMessage {
  role: "user";
  content: string | (TextContent | ImageContent)[];
  timestamp: number;
}

export interface AssistantMessage {
  role: "assistant";
  content: (TextContent | ThinkingContent | ToolCall)[];
  api: Api;
  provider: Provider;
  model: string;
  usage: Usage;
  stopReason: StopReason;
  errorMessage?: string;
  timestamp: number;
}

export interface ToolResultMessage {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: (TextContent | ImageContent)[];
  isError: boolean;
  timestamp: number;
}

export type Message = UserMessage | AssistantMessage | ToolResultMessage;

export interface Tool {
  name: string;
  description: string;
  parameters: any;
}

export interface Context {
  systemPrompt?: string;
  messages: Message[];
  tools?: Tool[];
}

export type AssistantMessageEvent =
  | { type: "start"; partial: AssistantMessage }
  | { type: "text_delta"; contentIndex: number; delta: string; partial: AssistantMessage }
  | { type: "toolcall_end"; contentIndex: number; toolCall: ToolCall; partial: AssistantMessage }
  | { type: "done"; reason: StopReason; message: AssistantMessage }
  | { type: "error"; reason: StopReason; error: AssistantMessage };

export interface Model {
  id: string;
  api: Api;
  provider: Provider;
  baseUrl: string;
  maxTokens: number;
}

export { AssistantMessageEventStream } from "./utils/event-stream.js";
