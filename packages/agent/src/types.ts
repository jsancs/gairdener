import { AssistantMessage, AssistantMessageEvent, Message, Model, Tool, ToolResultMessage } from "gairdener-ai";

export interface AgentTool extends Tool {
  execute: (id: string, params: any, signal?: AbortSignal) => Promise<{ content: any[], details?: any }>;
}

export interface AgentContext {
  systemPrompt: string;
  messages: Message[];
  tools?: AgentTool[];
}

export type AgentEvent =
  | { type: "agent_start" }
  | { type: "agent_end"; messages: Message[] }
  | { type: "message_start"; message: Message }
  | { type: "message_update"; message: Message; event: AssistantMessageEvent }
  | { type: "message_end"; message: Message };
