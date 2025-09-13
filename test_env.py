import os
from dotenv import load_dotenv

# Load variables from the .env file
load_dotenv()

# Check for the specific key
api_key = os.getenv("NOMIC_API_KEY")

if api_key:
    print("✅ Success! The NOMIC_API_KEY was loaded correctly.")
    print(f"   (First 4 characters of your key: {api_key[:4]}...)")
else:
    print("❌ Failure! The script could NOT find the NOMIC_API_KEY.")