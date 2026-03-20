export * from './types.js';
export * from './api-registry.js';
export * from './utils/event-stream.js';
import { registerApiProvider } from './api-registry.js';
import { streamOpenAICompletions } from './providers/openai.js';

registerApiProvider('openai-completions', streamOpenAICompletions);
