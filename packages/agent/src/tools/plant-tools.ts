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
    if (db.plants[plantId]) throw new Error('Plant with ID ' + plantId + ' already exists.');
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

export const updatePlantTool: AgentTool = {
  name: 'update_plant',
  description: 'Update metadata for an existing plant.',
  parameters: {
    type: 'object',
    properties: {
      plantId: { type: 'string' },
      name: { type: 'string' },
      species: { type: 'string' },
      location: { type: 'string' },
      wateringFrequencyDays: { type: 'number' }
    },
    required: ['plantId']
  },
  execute: async (id, { plantId, name, species, location, wateringFrequencyDays }) => {
    const db = await loadPlantDb();
    if (!db.plants[plantId]) throw new Error('Plant not found');
    const p = db.plants[plantId];
    if (name) p.name = name;
    if (species) p.species = species;
    if (location) p.location = location;
    if (wateringFrequencyDays !== undefined) p.wateringFrequencyDays = wateringFrequencyDays;
    await savePlantDb(db);
    return { content: [{ type: 'text', text: 'Updated ' + p.name }] };
  }
};

export const deletePlantTool: AgentTool = {
  name: 'delete_plant',
  description: 'Remove a plant and its history from the registry.',
  parameters: {
    type: 'object',
    properties: { plantId: { type: 'string' } },
    required: ['plantId']
  },
  execute: async (id, { plantId }) => {
    const db = await loadPlantDb();
    if (!db.plants[plantId]) throw new Error('Plant not found');
    delete db.plants[plantId];
    await savePlantDb(db);
    return { content: [{ type: 'text', text: 'Deleted plant ' + plantId }] };
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
      } catch {
        // If not in staged, maybe it is in another plant folder? 
        // For now, if we can't find it in staged, we just store the path as is.
      }
    }

    db.plants[plantId].healthHistory.push({
      date: new Date().toISOString(),
      status,
      observation,
      imagePath: finalRelativePath
    });
    
    await savePlantDb(db);
    return { content: [{ type: 'text', text: 'Updated health for ' + db.plants[plantId].name }] };
  }
};
