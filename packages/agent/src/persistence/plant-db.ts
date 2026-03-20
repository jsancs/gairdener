import fs from 'node:fs/promises';
import path from 'node:path';

export interface HealthEntry {
  date: string;
  status: 'healthy' | 'warning' | 'sick';
  observation: string;
  imagePath?: string;
}

export interface Plant {
  id: string;
  name: string;
  species: string;
  location: string;
  lastWatered: string;
  wateringFrequencyDays: number;
  healthHistory: HealthEntry[];
}

export interface PlantDb {
  plants: Record<string, Plant>;
}

const DB_PATH = path.resolve('plants.json');

export async function loadPlantDb(): Promise<PlantDb> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { plants: {} };
  }
}

export async function savePlantDb(db: PlantDb): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}
