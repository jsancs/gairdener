import { AgentTool } from '../types.js';
import { loadPlantDb, savePlantDb, Plant, HealthEntry } from '../persistence/plant-db.js';

export const listPlantsTool: AgentTool = {
  name: 'list_plants',
  description: 'List all registered plants and their recent health history.',
  parameters: { type: 'object', properties: {} },
  execute: async () => {
    const db = await loadPlantDb();
    const plants = Object.values(db.plants).map(p => ({
       ...p,
       healthHistory: p.healthHistory.slice(-5)
    }));
    if (plants.length === 0) return { content: [{ type: 'text', text: 'No plants found in the registry.' }] };
    return { content: [{ type: 'text', text: JSON.stringify(plants, null, 2) }] };
  }
};

export const addPlantTool: AgentTool = {
  name: 'add_plant',
  description: 'Add a new plant to the registry.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      species: { type: 'string' },
      location: { type: 'string' },
      wateringFrequencyDays: { type: 'number' }
    },
    required: ['name', 'species']
  },
  execute: async (id, { name, species, location, wateringFrequencyDays }) => {
    const db = await loadPlantDb();
    const plantId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    db.plants[plantId] = {
      id: plantId, name, species, location: location || 'unknown',
      lastWatered: new Date().toISOString(),
      wateringFrequencyDays: wateringFrequencyDays || 7,
      healthHistory: []
    };
    await savePlantDb(db);
    return { content: [{ type: 'text', text: 'Added ' + name + ' (ID: ' + plantId + ')' }] };
  }
};

export const recordWateringTool: AgentTool = {
  name: 'record_watering',
  description: 'Mark a plant as watered.',
  parameters: {
    type: 'object',
    properties: { plantId: { type: 'string' } },
    required: ['plantId']
  },
  execute: async (id, { plantId }) => {
    const db = await loadPlantDb();
    if (!db.plants[plantId]) throw new Error('Plant not found');
    db.plants[plantId].lastWatered = new Date().toISOString();
    await savePlantDb(db);
    return { content: [{ type: 'text', text: 'Watered ' + db.plants[plantId].name }] };
  }
};

export const analyzePlantHealthTool: AgentTool = {
  name: 'analyze_plant_health',
  description: 'Log health observation. Status: healthy, warning, sick.',
  parameters: {
    type: 'object',
    properties: {
      plantId: { type: 'string' },
      status: { type: 'string', enum: ['healthy', 'warning', 'sick'] },
      observation: { type: 'string' },
      imagePath: { type: 'string', description: 'The filename of the uploaded photo if applicable.' }
    },
    required: ['plantId', 'status', 'observation']
  },
  execute: async (id, { plantId, status, observation, imagePath }) => {
    const db = await loadPlantDb();
    if (!db.plants[plantId]) throw new Error('Plant not found');
    db.plants[plantId].healthHistory.push({ date: new Date().toISOString(), status, observation, imagePath });
    await savePlantDb(db);
    return { content: [{ type: 'text', text: 'Updated health for ' + db.plants[plantId].name }] };
  }
};
