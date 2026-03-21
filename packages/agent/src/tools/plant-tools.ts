import { AgentTool } from '../types.js';
import { loadPlantDb, savePlantDb, Plant, HealthEntry } from '../persistence/plant-db.js';

export const listPlantsTool: AgentTool = {
  name: 'list_plants',
  description: 'List all registered plants in the household.',
  parameters: { type: 'object', properties: {} },
  execute: async () => {
    const db = await loadPlantDb();
    const plants = Object.values(db.plants);
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
      name: { type: 'string', description: 'Name of the plant (e.g., "Monty")' },
      species: { type: 'string', description: 'Species of the plant' },
      location: { type: 'string', description: 'Location of the plant (e.g., "Living Room")' },
      wateringFrequencyDays: { type: 'number', description: 'How often to water in days' }
    },
    required: ['name', 'species']
  },
  execute: async (id, { name, species, location, wateringFrequencyDays }) => {
    const db = await loadPlantDb();
    const plantId = name.toLowerCase().replace(/\s+/g, '-');
    const newPlant: Plant = {
      id: plantId,
      name,
      species,
      location: location || 'unknown',
      lastWatered: new Date().toISOString(),
      wateringFrequencyDays: wateringFrequencyDays || 7,
      healthHistory: []
    };
    db.plants[plantId] = newPlant;
    await savePlantDb(db);
    return { content: [{ type: 'text', text: 'Successfully added ' + name + '.' }] };
  }
};

export const recordWateringTool: AgentTool = {
  name: 'record_watering',
  description: 'Mark a plant as watered.',
  parameters: {
    type: 'object',
    properties: { plantId: { type: 'string', description: 'The ID of the plant' } },
    required: ['plantId']
  },
  execute: async (id, { plantId }) => {
    const db = await loadPlantDb();
    if (!db.plants[plantId]) throw new Error('Plant not found: ' + plantId);
    db.plants[plantId].lastWatered = new Date().toISOString();
    await savePlantDb(db);
    return { content: [{ type: 'text', text: 'Recorded watering for ' + db.plants[plantId].name + '.' }] };
  }
};

export const analyzePlantHealthTool: AgentTool = {
  name: 'analyze_plant_health',
  description: 'Log a health observation for a plant.',
  parameters: {
    type: 'object',
    properties: {
      plantId: { type: 'string' },
      status: { type: 'string', enum: ['healthy', 'warning', 'sick'] },
      observation: { type: 'string' }
    },
    required: ['plantId', 'status', 'observation']
  },
  execute: async (id, { plantId, status, observation }) => {
    const db = await loadPlantDb();
    if (!db.plants[plantId]) throw new Error('Plant not found: ' + plantId);
    const entry: HealthEntry = { date: new Date().toISOString(), status, observation };
    db.plants[plantId].healthHistory.push(entry);
    await savePlantDb(db);
    return { content: [{ type: 'text', text: 'Logged health status for ' + db.plants[plantId].name + ': ' + status }] };
  }
};
