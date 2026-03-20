import { Message, Model } from "gairdener-ai";
import { AgentContext, AgentEvent, AgentTool } from "./types.js";

export class Agent {
  private context: AgentContext;
  constructor(initial: { systemPrompt: string; model: Model; tools?: AgentTool[] }) {
    this.context = { systemPrompt: initial.systemPrompt, messages: [], tools: initial.tools };
  }
  async prompt(text: string, onEvent: (e: AgentEvent) => void) {
    const userMsg: Message = { role: "user", content: text, timestamp: Date.now() };
    this.context.messages.push(userMsg);
    // Implementation of loop call would go here
  }
}
