from pydantic_ai import Agent

from ..prompts import GARDENER_SYSTEM_PROMPT


def gardener() -> Agent:
    agent = Agent(
        model="gpt-4.1-mini",
        instructions=GARDENER_SYSTEM_PROMPT,
        instrument=False,
        output_type=str,
    )
    return agent
