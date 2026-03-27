# Agentic Study Planner - Quick Start Guide

## Installation

All dependencies are already installed in the virtual environment. If you need to add packages:

```bash
cd /sessions/adoring-sweet-edison/mnt/learning-assistant/genai
source venv/bin/activate
pip install langchain-core langchain-groq langchain-chroma --break-system-packages
```

## Starting the Server

```bash
cd /sessions/adoring-sweet-edison/mnt/learning-assistant/genai
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Server will be available at `http://localhost:8000`

## Quick API Tests

### 1. Health Check

```bash
curl http://localhost:8000/health
```

### 2. Agent Chat

```bash
curl -X POST http://localhost:8000/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the main topics in my notes?",
    "collection_name": "default"
  }'
```

### 3. Agent Chat with Context

```bash
curl -X POST http://localhost:8000/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I want to review what I learned today. Can you summarize?",
    "collection_name": "default",
    "student_context": {
      "completed_topics": ["Introduction", "Cell Structure"],
      "weak_topics": ["Photosynthesis"],
      "session_duration_minutes": 45
    }
  }'
```

### 4. Session Summary

```bash
curl -X POST "http://localhost:8000/agent/session_summary?collection_name=default&session_duration_minutes=60&topics_covered=Photosynthesis&topics_covered=Cellular+Respiration"
```

## Key Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/upload/` | Upload PDF and ingest into vectorstore |
| POST | `/chat/` | Traditional conversational RAG |
| POST | `/agent/chat` | **Agentic chat with tools** |
| POST | `/agent/session_summary` | **Generate session summary** |
| GET | `/agent/health` | Health check |

## Common Use Cases

### Use Case 1: Student Asks a Question

**Frontend:**
```javascript
const response = await fetch('http://localhost:8000/agent/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Explain photosynthesis",
    collection_name: "student_123"
  })
});
const data = await response.json();
console.log(data.response); // Agent's explanation
```

**What happens:**
1. Agent receives question
2. Retrieves relevant material from student's notes
3. Formulates answer based on student's materials
4. Returns response with sources

### Use Case 2: Check Student Understanding

**Frontend:**
```javascript
const response = await fetch('http://localhost:8000/agent/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Can you test my understanding of mitosis?",
    collection_name: "student_123"
  })
});
```

**What happens:**
1. Agent generates comprehension question
2. Student answers
3. Agent evaluates and provides feedback

### Use Case 3: Get Personalized Learning Recommendation

**Frontend:**
```javascript
const response = await fetch('http://localhost:8000/agent/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "What should I study next?",
    collection_name: "student_123",
    student_context: {
      completed_topics: ["Cell Structure", "Photosynthesis"],
      weak_topics: ["Meiosis"],
      session_duration_minutes: 30
    }
  })
});
```

**What happens:**
1. Agent considers completed topics and weak areas
2. Recommends next logical topic
3. May suggest reviewing weak area first
4. Returns recommendation with rationale

### Use Case 4: Track Learning Gaps

**Frontend:**
```javascript
const response = await fetch('http://localhost:8000/agent/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "I don't understand the difference between mitosis and meiosis",
    collection_name: "student_123"
  })
});

// Save weak topic if identified
if (response.structured_data && response.structured_data.length > 0) {
  const entry = response.structured_data[0];
  if (entry.action === 'log_weak_topic') {
    await fetch('/api/students/weak-topics', {
      method: 'POST',
      body: JSON.stringify({
        topic: entry.topic,
        reason: entry.reason
      })
    });
  }
}
```

## Response Structure

All agent responses follow this structure:

```json
{
  "response": "Human-readable answer from the agent",
  "tools_used": [
    { "name": "retrieve_from_notes", "description": "..." },
    { "name": "ask_student_question", "description": "..." }
  ],
  "sources": [
    {
      "page": 5,
      "source": "notes.pdf",
      "content_preview": "..."
    }
  ],
  "structured_data": [
    {
      "topic": "Meiosis",
      "reason": "Student confused",
      "action": "log_weak_topic",
      "requires_backend_save": true
    }
  ]
}
```

## Debugging

### View Agent Reasoning

Edit `agents/study_agent.py` and change:
```python
verbose=False  # Change to True
```

This will print the agent's thinking process:
```
Thought: I need to retrieve relevant material
Action: retrieve_from_notes
Action Input: {"query": "photosynthesis"}
Observation: Retrieved 3 sections...
```

### Test with Integration Test

```bash
cd /sessions/adoring-sweet-edison/mnt/learning-assistant/genai
python test_agent_integration.py
```

This verifies:
- Vectorstore connectivity
- Agent creation
- Tool loading
- Sample query execution

### Check Logs

The agent will output to console:
```
🧪 Testing Agentic Study Planner Integration

1. Loading vectorstore...
   ✓ Vectorstore loaded
2. Creating study agent...
   ✓ Agent created with tools
3. Testing agent with sample query...
```

## Common Issues

### Issue: "Collection not found"

**Cause**: Student collection doesn't exist

**Solution**: Upload a PDF first using `/upload/` endpoint

```bash
curl -X POST -F "file=@document.pdf" \
  -F "collection_name=default" \
  http://localhost:8000/upload/
```

### Issue: Agent not using tools

**Cause**: Agent decided tools weren't needed

**Normal**: This is okay - agent is reasoning autonomously

**Debug**: Enable `verbose=True` to see agent's thinking

### Issue: Slow responses

**Cause**: Large vectorstore or slow LLM API

**Solutions**:
1. Increase `top_k` in retrieval (fewer results = faster)
2. Use smaller documents
3. Check GROQ API status
4. Reduce `max_iterations` in AgentExecutor

## File Organization

```
genai/
├── main.py                 # FastAPI app entry point
├── agents/
│   ├── __init__.py
│   ├── study_agent.py     # Agent orchestrator
│   └── tools.py           # Tool implementations
├── routes/
│   ├── upload.py          # PDF upload endpoint
│   ├── chat.py            # Traditional RAG endpoint
│   └── agent.py           # Agent chat endpoints
├── chains/
│   ├── rag_chain.py       # Simple RAG
│   └── conversational_rag.py  # Conversational RAG
├── utils/
│   ├── pdf_ingestion.py   # PDF loading/chunking
│   ├── vector_store.py    # Chroma management
│   └── syllabus_parser.py # Topic structure
├── vectorstore/           # Persistent Chroma data
├── AGENT_API.md          # Full API documentation
├── ARCHITECTURE.md        # System design
└── QUICKSTART.md         # This file
```

## Next Steps

1. **Integrate with Frontend**: Update React app to call `/agent/chat`
2. **Add Progress Tracking**: Save weak topics to database
3. **Customize Teaching Style**: Modify system prompt in `study_agent.py`
4. **Add More Tools**: Extend `agents/tools.py` with new capabilities
5. **Monitor Performance**: Track response times and tool usage

## Support

For issues or questions:
1. Check ARCHITECTURE.md for design details
2. Check AGENT_API.md for API reference
3. Enable `verbose=True` in agent for debugging
4. Run `test_agent_integration.py` to verify setup
