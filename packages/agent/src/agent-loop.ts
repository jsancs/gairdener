import { AssistantMessage, AssistantMessageEvent, Context, getApiProvider, Message, Model, ToolResultMessage } from 'gairdener-ai';
import { AgentContext, AgentEvent } from './types.js';

export async function* runAgentLoop(messages: Message[], context: AgentContext, model: Model): AsyncGenerator<AgentEvent> {
  const currentMessages = [...context.messages, ...messages];
  const streamFn = getApiProvider(model.api);
  if (!streamFn) throw new Error('No provider for ' + model.api);

  const stream = streamFn(model, { systemPrompt: context.systemPrompt, messages: currentMessages, tools: context.tools }, {});
  let assistantMessage: AssistantMessage | null = null;

  for await (const event of (stream as any)) {
    if (event.type === 'start') yield { type: 'message_start', message: event.partial };
    else if (event.type === 'text_delta') yield { type: 'message_update', message: event.partial, event };
    else if (event.type === 'done') {
      assistantMessage = event.message;
      yield { type: 'message_end', message: event.message };
      currentMessages.push(event.message);
    } else if (event.type === 'error') {
      yield { type: 'message_end', message: event.error };
      currentMessages.push(event.error);
      yield { type: 'agent_end', messages: currentMessages.slice(context.messages.length) };
      return;
    }
  }

  if (assistantMessage && assistantMessage.content.some((c: any) => c.type === 'toolCall')) {
    const toolCalls = assistantMessage.content.filter((c: any) => c.type === 'toolCall');
    const toolResults: Message[] = [];

    for (const toolCall of (toolCalls as any[])) {
      const tool = context.tools?.find(t => t.name === toolCall.name);
      if (tool) {
        try {
          const result = await tool.execute(toolCall.id, toolCall.arguments);
          toolResults.push({
            role: 'toolResult', toolCallId: toolCall.id, toolName: toolCall.name,
            content: result.content, isError: false, timestamp: Date.now()
          });
        } catch (error: any) {
          toolResults.push({
            role: 'toolResult', toolCallId: toolCall.id, toolName: toolCall.name,
            content: [{ type: 'text', text: error.message }], isError: true, timestamp: Date.now()
          });
        }
      }
    }

    if (toolResults.length > 0) {
      const loop = runAgentLoop(toolResults, { ...context, messages: currentMessages }, model);
      for await (const nextEvent of loop) {
        if (nextEvent.type !== 'agent_start' && nextEvent.type !== 'agent_end') {
          yield nextEvent;
        } else if (nextEvent.type === 'agent_end') {
          currentMessages.push(...nextEvent.messages);
        }
      }
    }
  }

  yield { type: 'agent_end', messages: currentMessages.slice(context.messages.length) };
}
