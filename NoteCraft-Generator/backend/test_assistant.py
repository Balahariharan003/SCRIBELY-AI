import httpx
import asyncio
import json

BACKEND_URL = "http://localhost:8000"

async def test_assistant():
    async with httpx.AsyncClient(timeout=30.0) as client:
        queries = [
            "What is AI?",
            "Generate a futuristic city",
            "Explain black holes and show me one",
            "What is in this image?"
        ]
        
        for query in queries:
            print(f"\n--- Testing Query: {query} ---")
            try:
                resp = await client.post(
                    f"{BACKEND_URL}/assistant/query",
                    json={"query": query}
                )
                if resp.status_code == 200:
                    print(json.dumps(resp.json(), indent=2))
                else:
                    print(f"Error: {resp.status_code} - {resp.text}")
            except Exception as e:
                print(f"Failed to connect: {e}")

if __name__ == "__main__":
    asyncio.run(test_assistant())
