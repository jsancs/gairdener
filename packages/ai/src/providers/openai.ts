import OpenAI from 'openai';
import { AssistantMessage, AssistantMessageEventStream, Context, Model, StreamOptions } from '../types.js';

export function streamOpenAICompletions(model: Model, context: Context, options?: StreamOptions): AssistantMessageEventStream {
  const stream = new AssistantMessageEventStream();
  const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable');
  }

  const client = new OpenAI({ apiKey, baseURL: model.baseUrl !== 'none' ? model.baseUrl : undefined });

  (async () => {
    const output: AssistantMessage = {
      role: 'assistant', content: [], api: model.api, provider: model.provider, model: model.id,
      usage: { input: 0, output: 0, totalTokens: 0 },
      stopReason: 'stop', timestamp: Date.now()
    };

    try {
      const messages: any[] = [];
      if (context.systemPrompt) messages.push({ role: 'developer', content: context.systemPrompt });
      for (const msg of context.messages) {
        if (msg.role === 'user') messages.push({ role: 'user', content: msg.content });
        else if (msg.role === 'assistant') {
          const text = msg.content.filter(c => c.type === 'text').map(c => (c as any).text).join('');
          messages.push({ role: 'assistant', content: text });
        }
      }

      const openaiStream = await client.chat.completions.create({
        model: model.id,
        messages: messages as any,
        stream: true,
        stream_options: { include_usage: true }
      });

      stream.push({ type: 'start', partial: output });

      for await (const chunk of (openaiStream as any)) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          if (output.content.length === 0) output.content.push({ type: 'text', text: '' });
          (output.content[0] as any).text += delta;
          stream.push({ type: 'text_delta', contentIndex: 0, delta, partial: output });
        }
        if (chunk.usage) {
          output.usage = {
            input: chunk.usage.prompt_tokens,
            output: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens
          };
        }
      }

      stream.push({ type: 'done', reason: 'stop', message: output });
      stream.end();
    } catch (error: any) {
      output.stopReason = 'error';
      output.errorMessage = error.message;
      stream.push({ type: 'error', reason: 'error', error: output });
      stream.end();
    }
  })();

  return stream;
}
