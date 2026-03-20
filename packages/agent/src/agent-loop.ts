import { AssistantMessage, AssistantMessageEvent, Context, getApiProvider, Message, Model } from 'gairdener-ai';
import { AgentContext, AgentEvent } from './types.js';

export async function* runAgentLoop(messages: Message[], context: AgentContext, model: Model): AsyncGenerator<AgentEvent> {
  yield { type: 'agent_start' };
  const currentMessages = [...context.messages, ...messages];
  const streamFn = getApiProvider(model.api);
  if (!streamFn) throw new Error('No provider for ' + model.api);

  const stream = streamFn(model, { systemPrompt: context.systemPrompt, messages: currentMessages, tools: context.tools }, {});
  for await (const event of stream) {
    if (event.type === 'start') yield { type: 'message_start', message: event.partial };
    else if (event.type === 'text_delta') yield { type: 'message_update', message: event.partial, event };
    else if (event.type === 'done') {
      yield { type: 'message_end', message: event.message };
      currentMessages.push(event.message);
    }
    else if (event.type === 'error') {
      yield { type: 'message_end', message: event.error };
      currentMessages.push(event.error);
    }
  }
  yield { type: 'agent_end', messages: currentMessages };
}
