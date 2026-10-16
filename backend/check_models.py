import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    print("❌ ERROR: GROQ_API_KEY is not set in .env")
else:
    client = Groq(api_key=api_key)
    try:
        models = client.models.list()
        print("✅ Available Models for your API Key:")
        for m in models.data:
            print(f" - {m.id}")
    except Exception as e:
        print(f"❌ Failed to fetch models: {e}")
