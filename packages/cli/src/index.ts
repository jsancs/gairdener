import 'dotenv/config';
import { Model, Message, ImageContent } from 'gairdener-ai';
import { runAgentLoop, addPlantTool, listPlantsTool, recordWateringTool, analyzePlantHealthTool, loadPlantDb } from 'gairdener-agent';
import * as readline from 'node:readline/promises';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const modelId = process.argv[2] || 'gpt-5-nano';
const apiKey = process.env.OPENAI_API_KEY;
const api: any = 'openai-completions';
const mockModel: Model = { id: modelId, api, provider: 'openai', baseUrl: 'none', maxTokens: 4000 };

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const messages: Message[] = [];
  const tools = [addPlantTool, listPlantsTool, recordWateringTool, analyzePlantHealthTool];
  const context = { 
    systemPrompt: 'You are Gairdener, a professional botanist and house plant expert. ' + 
                  'You can manage a plant registry using your tools. Always check the registry with list_plants if you are unsure about the user plants. ' + 
                  'You can analyze photos of plants to identify them or diagnose health issues. ' + 
                  'BE EXTREMELY CONCISE. No conversational filler. Just the facts or tool confirmations.', 
    messages, 
    tools 
  };

  console.log('Gairdener CLI - System Prompt: ' + context.systemPrompt);
  if (!apiKey) {
    console.error('ERROR: OPENAI_API_KEY not found in .env.');
    process.exit(1);
  }

  const db = await loadPlantDb();
  const overdue = Object.values(db.plants).filter(p => {
    const last = new Date(p.lastWatered).getTime();
    const next = last + (p.wateringFrequencyDays * 24 * 60 * 60 * 1000);
    return Date.now() > next;
  });

  if (overdue.length > 0) {
    console.log('NOTICE: ' + overdue.length + ' plants are overdue for watering: ' + overdue.map(p => p.name).join(', '));
  }

  console.log('Using model: ' + modelId);
  console.log('Commands: /exit to quit, /photo <path> to upload a photo');

  while (true) {
    const text = await rl.question('> ');
    if (!text) continue;

    if (text === '/exit') {
      console.log('Goodbye!');
      process.exit(0);
    }

    let userMessages: Message[] = [];

    if (text.startsWith('/photo ')) {
      const photoPath = text.slice(7).trim();
      try {
        const data = await fs.readFile(photoPath);
        const base64 = data.toString('base64');
        const ext = path.extname(photoPath).slice(1);
        const mimeType = 'image/' + (ext === 'jpg' ? 'jpeg' : ext);
        userMessages = [{
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this plant photo:' },
            { type: 'image', data: base64, mimeType }
          ],
          timestamp: Date.now()
        }];
        console.log('Uploading ' + photoPath + '...');
      } catch (err: any) {
        console.error('Error reading photo: ' + err.message);
        continue;
      }
    } else {
      userMessages = [{ role: 'user', content: text, timestamp: Date.now() }];
    }

    context.messages.push(...userMessages);
    const loop = runAgentLoop([], context, mockModel);

    for await (const event of loop) {
      if (event.type === 'message_update') {
        const delta = event.event.type === 'text_delta' ? event.event.delta : '';
        process.stdout.write(delta);
      } else if (event.type === 'agent_end') {
        context.messages.push(...event.messages.filter(m => !userMessages.includes(m)));
        process.stdout.write('\n');
      }
    }
  }
}
main().catch(console.error);
