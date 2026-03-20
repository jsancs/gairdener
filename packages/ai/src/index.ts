export * from './types.js';
export * from './api-registry.js';
export * from './utils/event-stream.js';
import { registerApiProvider } from './api-registry.js';
import { streamMock } from './providers/mock.js';
import { streamOpenAICompletions } from './providers/openai.js';

registerApiProvider('openai-completions', streamOpenAICompletions);
registerApiProvider('mock', streamMock);
