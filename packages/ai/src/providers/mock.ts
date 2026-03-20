import { AssistantMessage, AssistantMessageEventStream, Context, Model, StreamOptions } from "../types.js";

export function streamMock(model: Model, context: Context, options?: StreamOptions): AssistantMessageEventStream {
  const stream = new AssistantMessageEventStream();
  const output: AssistantMessage = {
    role: "assistant", content: [], api: model.api, provider: model.provider, model: model.id,
    usage: { input: 0, output: 0, totalTokens: 0 },
    stopReason: "stop", timestamp: Date.now()
  };

  setTimeout(async () => {
    stream.push({ type: "start", partial: output });
    const text = "Hello! I am your Gairdener agent. How can I help you with your plants today?";
    const words = text.split(" ");
    for (let i = 0; i < words.length; i++) {
      const delta = (i === 0 ? "" : " ") + words[i];
      output.content = [{ type: "text", text: (output.content[0] as any)?.text || "" + delta }];
      stream.push({ type: "text_delta", contentIndex: 0, delta, partial: output });
      await new Promise(r => setTimeout(r, 50));
    }
    stream.push({ type: "done", reason: "stop", message: output });
    stream.end();
  }, 0);

  return stream;
}
