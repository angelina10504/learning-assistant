# 🎓 Personalized Learning Assistant

An AI-powered learning assistant built with MERN stack + LangChain + RAG.

## Tech Stack
- **Frontend:** React + Tailwind CSS
- **Backend:** Node.js + Express + MongoDB
- **GenAI:** Python + FastAPI + LangChain + Chroma

## Features (in progress)
- [ ] PDF upload and ingestion
- [ ] RAG-powered Q&A on study material
- [ ] Adaptive quiz generation
- [ ] Weak topic detection
- [ ] Analytics dashboard
- [ ] LangChain Agent

## Setup Instructions
Coming soon.
```

---

### Step 4 — Create .env.example files

These are placeholder files that show others (and future you) what env variables are needed — without exposing actual values.

**backend/.env.example**
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
GENAI_URL=http://localhost:8000
```

**genai/.env.example**
```
OPENAI_API_KEY=your_openai_api_key
CHROMA_PATH=./vectorstore