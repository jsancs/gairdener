import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Load .env from current working directory (usually root)
dotenv.config();
console.log('API Key loaded:', !!process.env.OPENAI_API_KEY);

import express from 'express';
import cors from 'cors';
import { Model, Message, getApiProvider } from 'gairdener-ai';
import { 
  runAgentLoop, 
  manageRegistryTool, 
  listPlantsTool, 
  recordWateringTool, 
  analyzePlantHealthTool, 
  loadPlantDb 
} from 'gairdener-agent';

// Ensure the provider is registered
import 'gairdener-ai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files relative to the package root
app.use(express.static(path.join(pkgRoot, 'public')));
app.use(express.static(path.join(pkgRoot, 'dist/client')));
app.use(express.static(path.join(pkgRoot))); // To serve index.html if it's in the root of the package

const modelId = 'gpt-5-nano';
const api: any = 'openai-completions';
const mockModel: Model = { id: modelId, api, provider: 'openai', baseUrl: 'none', maxTokens: 4000 };

const tools = [manageRegistryTool, listPlantsTool, recordWateringTool, analyzePlantHealthTool];
const systemPrompt = 'You are Gairdener, a professional botanist and house plant expert. ' + 
                    'You can manage a plant registry using your tools. Always check the registry with list_plants if you are unsure about the user plants. ' + 
                    'You can analyze photos of plants to identify them or diagnose health issues. ' + 
                    'BE EXTREMELY CONCISE.';

app.get('/api/plants', async (req, res) => {
  try {
    const db = await loadPlantDb();
    res.json(Object.values(db.plants));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  console.log('Chat request received with', messages?.length, 'messages');
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages' });
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is missing');
    return res.status(500).json({ error: 'API key missing' });
  }

  const context = { systemPrompt, messages, tools };
  
  // Set up SSE for streaming response
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const loop = runAgentLoop([], context, mockModel);
    for await (const event of loop) {
      console.log('Sending event:', event.type);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
    console.log('Loop finished successfully');
    res.end();
  } catch (error: any) {
    console.error('Error in agent loop:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
