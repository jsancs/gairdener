from src.gairdener.agents import gardener
from dotenv import load_dotenv

load_dotenv()

def main():
    agent = gardener()

    user_input = input("Your question: ")
    result = agent.run_sync(user_input)
    print(result.output)


if __name__ == "__main__":
    main()
