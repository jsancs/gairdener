import OpenAI from 'openai';
import { AssistantMessage, AssistantMessageEventStream, Context, Model, StreamOptions, ToolCall } from '../types.js';

export function streamOpenAICompletions(model: Model, context: Context, options?: StreamOptions): AssistantMessageEventStream {
  const stream = new AssistantMessageEventStream();
  const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable');
  const client = new OpenAI({ apiKey, baseURL: model.baseUrl !== 'none' ? model.baseUrl : undefined });

  (async () => {
    const output: AssistantMessage = {
      role: 'assistant', content: [], api: model.api, provider: model.provider, model: model.id,
      usage: { input: 0, output: 0, totalTokens: 0 }, stopReason: 'stop', timestamp: Date.now()
    };
    try {
      const messages: any[] = [];
      if (context.systemPrompt) messages.push({ role: 'developer', content: context.systemPrompt });
      for (const msg of context.messages) {
        if (msg.role === 'user') {
          if (typeof msg.content === 'string') {
            messages.push({ role: 'user', content: msg.content });
          } else {
            const content = msg.content.map(c => {
              if (c.type === 'text') return { type: 'text', text: c.text };
              if (c.type === 'image') return { type: 'image_url', image_url: { url: 'data:' + c.mimeType + ';base64,' + c.data } };
              return null;
            }).filter(Boolean);
            messages.push({ role: 'user', content });
          }
        } else if (msg.role === 'assistant') {
          const text = msg.content.filter(c => c.type === 'text').map(c => (c as any).text).join('');
          const toolCalls = msg.content.filter(c => c.type === 'toolCall').map(c => ({
            id: (c as any).id, type: 'function', function: { name: (c as any).name, arguments: JSON.stringify((c as any).arguments) }
          }));
          messages.push({ role: 'assistant', content: text || null, tool_calls: toolCalls.length > 0 ? toolCalls : undefined });
        } else if (msg.role === 'toolResult') {
          const textResult = msg.content.filter(c => c.type === 'text').map(c => (c as any).text).join('\n');
          messages.push({ role: 'tool', tool_call_id: msg.toolCallId, content: textResult || '(no content)' });
        }
      }
      const tools = context.tools?.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));
      const openaiStream = await client.chat.completions.create({
        model: model.id, messages, tools: tools && tools.length > 0 ? tools : undefined, stream: true, stream_options: { include_usage: true }
      } as any);
      stream.push({ type: 'start', partial: output });

      for await (const chunk of (openaiStream as any)) {
        const choice = chunk.choices[0];
        if (choice?.delta?.content) {
          if (output.content.length === 0) output.content.push({ type: 'text', text: '' });
          (output.content[0] as any).text += choice.delta.content;
          stream.push({ type: 'text_delta', contentIndex: 0, delta: choice.delta.content, partial: output });
        }
        if (choice?.delta?.tool_calls) {
          for (const tc of choice.delta.tool_calls) {
            let currentTC = output.content.find(c => c.type === 'toolCall' && (c as any).index === tc.index) as any;
            if (!currentTC) {
              currentTC = { type: 'toolCall', id: tc.id, name: tc.function.name, arguments: '', index: tc.index };
              output.content.push(currentTC);
            }
            if (tc.function.arguments) currentTC.arguments += tc.function.arguments;
          }
        }
        if (chunk.usage) output.usage = { input: chunk.usage.prompt_tokens, output: chunk.usage.completion_tokens, totalTokens: chunk.usage.total_tokens };
      }
      for (const c of output.content) if (c.type === 'toolCall') { (c as any).arguments = JSON.parse((c as any).arguments); delete (c as any).index; }
      stream.push({ type: 'done', reason: 'stop', message: output });
      stream.end();
    } catch (error: any) {
      output.stopReason = 'error'; output.errorMessage = error.message;
      stream.push({ type: 'error', reason: 'error', error: output }); stream.end();
    }
  })();
  return stream;
}
