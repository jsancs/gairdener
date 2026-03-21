import { AgentTool } from '../types.js';
import { loadPlantDb, savePlantDb } from '../persistence/plant-db.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

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

export const manageRegistryTool: AgentTool = {
  name: 'manage_registry',
  description: 'Add, update, or delete plants in the registry.',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['add', 'update', 'delete'], description: 'The action to perform.' },
      plantId: { type: 'string', description: 'ID of the plant (required for update/delete).' },
      name: { type: 'string', description: 'Display name (required for add).' },
      species: { type: 'string', description: 'Botanical species.' },
      location: { type: 'string', description: 'Where the plant is located.' },
      wateringFrequencyDays: { type: 'number', description: 'Frequency in days.' }
    },
    required: ['action']
  },
  execute: async (id, { action, plantId, name, species, location, wateringFrequencyDays }) => {
    const db = await loadPlantDb();
    if (action === 'add') {
      if (!name || !species) throw new Error('name and species are required to add a plant.');
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (db.plants[id]) throw new Error('Plant already exists: ' + id);
      db.plants[id] = { id, name, species, location: location || 'unknown', lastWatered: new Date().toISOString(), wateringFrequencyDays: wateringFrequencyDays || 7, healthHistory: [] };
      await savePlantDb(db);
      return { content: [{ type: 'text', text: 'Added ' + name + ' (ID: ' + id + ')' }] };
    }
    if (!plantId || !db.plants[plantId]) throw new Error('Valid plantId is required.');
    if (action === 'delete') {
      delete db.plants[plantId];
      await savePlantDb(db);
      return { content: [{ type: 'text', text: 'Deleted ' + plantId }] };
    }
    if (action === 'update') {
      const p = db.plants[plantId];
      if (name) p.name = name;
      if (species) p.species = species;
      if (location) p.location = location;
      if (wateringFrequencyDays !== undefined) p.wateringFrequencyDays = wateringFrequencyDays;
      await savePlantDb(db);
      return { content: [{ type: 'text', text: 'Updated ' + plantId }] };
    }
    throw new Error('Unknown action.');
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
  description: 'Log health observation. To save the staged photo, pass the staged filename.',
  parameters: {
    type: 'object',
    properties: {
      plantId: { type: 'string' },
      status: { type: 'string', enum: ['healthy', 'warning', 'sick'] },
      observation: { type: 'string' },
      imagePath: { type: 'string' }
    },
    required: ['plantId', 'status', 'observation']
  },
  execute: async (id, { plantId, status, observation, imagePath }) => {
    const db = await loadPlantDb();
    if (!db.plants[plantId]) throw new Error('Plant not found');
    let finalRelativePath = imagePath;
    if (imagePath) {
      const STAGED_DIR = path.resolve('images/staged');
      const PLANT_DIR = path.resolve('images', plantId);
      const stagedFile = path.join(STAGED_DIR, imagePath);
      try {
        await fs.access(stagedFile);
        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = dateStr + '-' + Date.now() + path.extname(imagePath);
        await fs.mkdir(PLANT_DIR, { recursive: true });
        await fs.rename(stagedFile, path.join(PLANT_DIR, fileName));
        finalRelativePath = path.join(plantId, fileName);
      } catch {}
    }
    db.plants[plantId].healthHistory.push({ date: new Date().toISOString(), status, observation, imagePath: finalRelativePath });
    await savePlantDb(db);
    return { content: [{ type: 'text', text: 'Updated health for ' + db.plants[plantId].name }] };
  }
};
