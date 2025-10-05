import os
import sys

from dotenv import load_dotenv

from src.gairdener.agents import gardener

load_dotenv()


def check_config() -> None:
    if not os.getenv("OPENAI_API_KEY"):
        print(
            "OPENAI_API_KEY env var is not set. Please copy .env.example to .env and add your API key."
        )
        sys.exit(1)


def main():
    check_config()

    agent = gardener()
    user_input = input("Your question: ")
    result = agent.run_sync(user_input)
    print(result.output)


if __name__ == "__main__":
    main()
