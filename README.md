# Gairdener

AI-powered Plant Management Agent built with the pi-mono architecture.

## Features

- **Smart Vision**: Analyze photos to identify species and diagnose health issues.
- **Organized Storage**: Photos are moved to plant-specific subfolders (`images/<plant-id>/`).
- **Stateful Memory**: Tracks watering schedules and health history in `plants.json`.
- **Management Tools**: Consolidated registry management for accuracy.
- **Proactive Care**: Automatic watering reminders when starting the CLI.

## Available Tools

- `manage_registry`: Add, update, or delete plants using a single tool.
- `list_plants`: List all plants and their recent health logs.
- `record_watering`: Update the last-watered timestamp.
- `analyze_plant_health`: Log a health observation (and permanently save a staged photo).

## CLI Commands

- `/photo <path> [description]`: Stage an image for the agent to analyze.
- `/exit`: Close the agent.

## Setup

1. **Install dependencies**: `npm install`
2. **Configure environment**: Create a `.env` with `OPENAI_API_KEY`
3. **Build**: `npm run build`
4. **Run**: `npm start`
