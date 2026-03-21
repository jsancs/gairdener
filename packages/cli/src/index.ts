import 'dotenv/config';
import { Model, Message } from 'gairdener-ai';
import { runAgentLoop, addPlantTool, listPlantsTool, recordWateringTool, analyzePlantHealthTool, loadPlantDb, updatePlantTool, deletePlantTool } from 'gairdener-agent';
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
  const tools = [addPlantTool, listPlantsTool, recordWateringTool, analyzePlantHealthTool, updatePlantTool, deletePlantTool];
  const context = { 
    systemPrompt: 'You are Gairdener, a professional botanist and house plant expert. ' + 
                  'You can manage a plant registry using your tools. Always check the registry with list_plants if you are unsure about the user plants. ' + 
                  'You can analyze photos of plants to identify them or diagnose health issues. ' + 
                  'To save an image permanently, use analyze_plant_health and pass the staged filename seen in the message. ' + 
                  'If you make a mistake (e.g. duplicate a plant), use delete_plant or update_plant to fix it. ' + 
                  'BE EXTREMELY CONCISE.', 
    messages, 
    tools 
  };

  const STAGED_DIR = path.resolve('images/staged');
  await fs.mkdir(STAGED_DIR, { recursive: true });

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
  console.log('Commands: /exit to quit, /photo <path> [description] to analyze an image');

  while (true) {
    const text = await rl.question('> ');
    if (!text) continue;

    if (text === '/exit') {
      console.log('Goodbye!');
      process.exit(0);
    }

    let userMessages: Message[] = [];

    if (text.startsWith('/photo ')) {
      const photoArg = text.slice(7).trim();
      const firstSpace = photoArg.indexOf(' ');
      const photoPath = firstSpace !== -1 ? photoArg.slice(0, firstSpace) : photoArg;
      const description = firstSpace !== -1 ? photoArg.slice(firstSpace).trim() : 'Analyze this plant photo';

      try {
        const data = await fs.readFile(photoPath);
        const base64 = data.toString('base64');
        const ext = path.extname(photoPath).slice(1);
        const mimeType = 'image/' + (ext === 'jpg' ? 'jpeg' : ext);
        
        const fileName = 'staged-' + Date.now() + '.' + ext;
        await fs.writeFile(path.join(STAGED_DIR, fileName), data);

        userMessages = [{
          role: 'user',
          content: [
            { type: 'text', text: description + ' [staged: ' + fileName + ']' },
            { type: 'image', data: base64, mimeType }
          ],
          timestamp: Date.now()
        }];
        console.log('Staged photo as ' + fileName);
      } catch (err: any) {
        console.error('Error: ' + err.message);
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
