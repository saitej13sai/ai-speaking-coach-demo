# ai-speaking-coach-demo# AI Speaking Coach (Demo)

## Run locally / in Codespaces

1) Create `.env` from `.env.example` and set your OpenAI key:

OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5-mini

2) Install + run:

pip install -r app/requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

3) Open the forwarded port (8000) in Codespaces.
