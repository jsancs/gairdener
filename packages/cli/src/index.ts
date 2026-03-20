import 'dotenv/config';
import { Model, Message } from 'gairdener-ai';
import { runAgentLoop, addPlantTool, listPlantsTool, recordWateringTool } from 'gairdener-agent';
import * as readline from 'node:readline/promises';

const modelId = process.argv[2] || 'gpt-5-nano';
const apiKey = process.env.OPENAI_API_KEY;
const api: any = 'openai-completions';
const mockModel: Model = { id: modelId, api, provider: 'openai', baseUrl: 'none', maxTokens: 4000 };

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const messages: Message[] = [];
  const tools = [addPlantTool, listPlantsTool, recordWateringTool];
  const context = { 
    systemPrompt: 'You are Gairdener, a professional botanist and house plant expert. ' + 
                  'You can manage a plant registry using your tools. Always check the registry with list_plants if you are unsure about the user plants.', 
    messages, 
    tools 
  };

  console.log('Gairdener CLI - System Prompt: ' + context.systemPrompt);
  if (!apiKey) {
    console.error('ERROR: OPENAI_API_KEY not found in .env.');
    process.exit(1);
  }
  console.log('Using model: ' + modelId);
  console.log('Type your message below (Ctrl+C to exit):');

  while (true) {
    const text = await rl.question('> ');
    if (!text) continue;

    const userMsg: Message = { role: 'user', content: text, timestamp: Date.now() };
    context.messages.push(userMsg);

    const loop = runAgentLoop([], context, mockModel);

    for await (const event of loop) {
      if (event.type === 'message_update') {
        const delta = event.event.type === 'text_delta' ? event.event.delta : '';
        process.stdout.write(delta);
      } else if (event.type === 'agent_end') {
        context.messages.push(...event.messages.filter(m => m !== userMsg));
        process.stdout.write('\n');
      }
    }
  }
}
main().catch(console.error);
