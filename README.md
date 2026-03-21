# Gairdener

AI-powered Plant Management Agent built with the pi-mono architecture.

## Features

- **Smart Vision**: Analyze photos to identify species and diagnose health issues.
- **Organized Storage**: Photos are automatically staged and then moved to plant-specific subfolders (`images/<plant-id>/`).
- **Stateful Memory**: Tracks watering schedules and health history in `plants.json`.
- **Management Tools**: Tools to add, update, or delete plants to keep your registry accurate.
- **Proactive Care**: Automatic watering reminders when starting the CLI.

## Available Tools

- `add_plant`: Register a new plant with name, species, and location.
- `list_plants`: List all plants and their recent health logs.
- `record_watering`: Update the last-watered timestamp.
- `analyze_plant_health`: Log a health observation (and permanently save a staged photo).
- `update_plant`: Modify metadata for an existing plant.
- `delete_plant`: Remove a plant and its history from the registry.

## CLI Commands

- `/photo <path> [description]`: Stage an image for the agent to analyze.
- `/exit`: Close the agent.

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**: Create a `.env` file in the root:
   ```bash
   OPENAI_API_KEY=your_key_here
   ```

3. **Build**:
   ```bash
   npm run build
   ```

4. **Run**:
   ```bash
   npm start
   ```
   *Optional: specify a model:* `npm start -- gpt-4o`
