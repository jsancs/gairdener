# Gairdener

AI-powered Plant Management Agent built with the pi-mono architecture.

## Features

- Stateful conversations with plant context.
- Domain-specific tools for plant care.
- Local persistence using `plants.json`.
- Native .env support (Node 22+).

## Available Tools

- `add_plant`: Register a new plant with its name, species, location, and watering frequency.
- `list_plants`: List all plants currently in your registry.
- `record_watering`: Update the last-watered timestamp for a specific plant.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root:
   ```bash
   OPENAI_API_KEY=your_key_here
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Run the CLI:
   ```bash
   npm start
   ```
   *Optional: pass a model name as an argument:* `npm start -- gpt-4o`
