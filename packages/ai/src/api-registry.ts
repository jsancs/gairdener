import { Api, AssistantMessageEventStream, Context, Model, StreamOptions } from "./types.js";

export type StreamFunction = (model: Model, context: Context, options?: StreamOptions) => AssistantMessageEventStream;

const registry = new Map<string, StreamFunction>();

export function registerApiProvider(api: string, stream: StreamFunction): void { registry.set(api, stream); }
export function getApiProvider(api: string): StreamFunction | undefined { return registry.get(api); }
