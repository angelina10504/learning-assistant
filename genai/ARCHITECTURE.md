# Agentic Study Planner - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FastAPI Application                      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     Router Layer                         │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ /upload/      - PDF ingestion and chunking              │   │
│  │ /chat/        - Conversational RAG (traditional)        │   │
│  │ /agent/chat   - Agentic chat (ReAct pattern)           │   │
│  │ /agent/summary- Session summary generation             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│          ┌────────────────┼────────────────┐                     │
│          ▼                ▼                ▼                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │    Chains    │ │   Agents     │ │   Utils      │             │
│  │              │ │              │ │              │             │
│  │ rag_chain    │ │study_agent   │ │vector_store  │             │
│  │conversational│ │tools         │ │pdf_ingestion │             │
│  │              │ │              │ │syllabus_...  │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│          │                ▼                │                     │
│          │       ┌──────────────────┐     │                     │
│          │       │   LangChain      │     │                     │
│          │       │  Agents Framework│     │                     │
│          │       │                  │     │                     │
│          │       │ - ReAct Pattern  │     │                     │
│          │       │ - Tool Interface │     │                     │
│          │       │ - Agent Executor │     │                     │
│          │       └──────────────────┘     │                     │
│          │                ▼                │                     │
│          └────────────────┼────────────────┘                     │
│                           ▼                                      │
│          ┌─────────────────────────────────┐                    │
│          │         LLM: ChatGroq            │                    │
│          │    llama-3.3-70b-versatile      │                    │
│          └─────────────────────────────────┘                    │
│          ┌─────────────────────────────────┐                    │
│          │  Vector Store: Chroma           │                    │
│          │  Embeddings: HuggingFace        │                    │
│          │  Model: all-MiniLM-L6-v2       │                    │
│          └─────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────────┐
    │ Node.js Backend  │
    │ (Express)        │
    │                  │
    │ - Student DB     │
    │ - Progress Track │
    │ - Session Mgmt   │
    └──────────────────┘
```

## Component Details

### 1. Router Layer (`routes/`)

#### `upload.py` - PDF Management
- **Endpoint**: POST `/upload/`
- **Function**: Receives PDF, chunks, embeds, stores in Chroma
- **Dependencies**: `pdf_ingestion`, `vector_store`

#### `chat.py` - Traditional RAG
- **Endpoint**: POST `/chat/`
- **Function**: Conversational RAG with memory
- **Dependencies**: `conversational_rag`, `vector_store`

#### `agent.py` - Agentic Learning
- **Endpoint**: POST `/agent/chat`, POST `/agent/session_summary`
- **Function**: Intelligent agent-based tutoring
- **Dependencies**: `study_agent`, `vector_store`

### 2. Agents (`agents/`)

#### `study_agent.py` - Agent Orchestrator
```python
create_study_agent(vectorstore) -> AgentExecutor
run_agent_chat(message, vectorstore, history, context) -> (response, tools_used, data)
```

**Responsibilities:**
- Creates ReAct agent with LangChain
- Manages tool registration
- Handles agent execution
- Extracts metadata from responses

**System Prompt Strategy:**
- Positions agent as adaptive study planner
- Emphasizes student-first approach
- Guides tool usage patterns
- Sets tone (supportive, efficient)

#### `tools.py` - Tool Implementations

Five core tools:

1. **retrieve_from_notes**
   - Semantic search over vectorstore
   - Returns k most similar chunks
   - Includes page metadata

2. **ask_student_question**
   - Uses LLM to generate questions
   - Retrieves context from notes
   - Adjustable difficulty

3. **log_weak_topic**
   - Records struggle areas
   - Returns JSON for backend persistence
   - No direct database interaction

4. **suggest_next_topic**
   - Uses LLM to recommend topics
   - Considers prerequisites
   - Intelligently proposes review

5. **summarize_progress**
   - Formats session statistics
   - Calculates pace metrics
   - Motivational messaging

### 3. Utilities (`utils/`)

#### `vector_store.py` - Chroma Management
```python
get_embedding_model() -> HuggingFaceEmbeddings
store_chunks_in_chroma(chunks, collection_name) -> Chroma
load_chroma(collection_name) -> Chroma
```

**Design:**
- Centralized embedding and vectorstore access
- Per-student collections for isolation
- Persistent storage

#### `pdf_ingestion.py` - PDF Processing
```python
clean_text(text) -> str
is_noisy_chunk(text) -> bool
load_and_split_pdf(file_path) -> List[Document]
```

**Features:**
- Text cleaning (removes token artifacts)
- Quality filtering (removes noisy chunks)
- Recursive character splitting
- Page metadata preservation

#### `syllabus_parser.py` - Document Structure Analysis
```python
extract_topics_from_documents(documents) -> Dict
suggest_next_topic(completed, weak, all_topics) -> Topic
build_prerequisite_chain(topics) -> Dict
```

**Capabilities:**
- Extracts topic hierarchy from documents
- Identifies prerequisites
- Estimates learning time
- Guides curriculum progression

### 4. LangChain Integration

#### Agent Pattern
Uses `create_react_agent` from LangChain:

```
Think → Act → Observe → Repeat → Answer
```

**Flow:**
1. Agent receives user message
2. LLM thinks about which tools to use
3. Tools are invoked
4. Results are observed
5. Process repeats until solution found
6. Final answer generated

#### Tool Interface
Tools defined with `@tool` decorator:

```python
@tool
def retrieve_from_notes(query: str, top_k: int = 3) -> str:
    """Retrieve relevant content from student notes"""
    ...
```

Benefits:
- Clean separation of concerns
- Automatic tool documentation
- Type hints for validation
- Easy to add/remove tools

### 5. Data Flow

#### Document Upload Flow
```
Client PDF
    ↓
routes/upload.py
    ↓
pdf_ingestion.py (clean & chunk)
    ↓
vector_store.py (embed)
    ↓
Chroma (persistent storage)
    ↓
✓ Ready for RAG/Agent queries
```

#### Agent Chat Flow
```
Student Message
    ↓
routes/agent.py
    ↓
study_agent.py (creates executor)
    ↓
LLM thinks about tools
    ↓
Tools invoked:
  - retrieve_from_notes
  - ask_student_question
  - log_weak_topic
  - suggest_next_topic
  - summarize_progress
    ↓
LLM formulates final response
    ↓
Response + metadata
    ↓
Express Backend (saves weak topics, tracks progress)
```

## Key Design Decisions

### 1. Per-Student Collections
Each student has a separate Chroma collection:
- **Benefit**: Data isolation, privacy
- **Scalability**: Supports multiple students
- **Query**: Specify `collection_name` in requests

### 2. Tool-Based Agent Architecture
Uses LangChain's tool interface:
- **Benefit**: Modular, extensible
- **Clarity**: Each tool has single responsibility
- **Debugging**: Easy to trace tool usage

### 3. Structured Data Extraction
Agent responses include structured data:
```python
{
    "response": "Human-readable text",
    "tools_used": ["list", "of", "tools"],
    "structured_data": [{"action": "log_weak_topic", ...}]
}
```
- **Benefit**: Backend can parse and persist weak topics
- **Separation**: Logic stays in Python, persistence in Node

### 4. Graceful Tool Failures
Agent handles tool exceptions:
- Tools wrapped in try-except
- Failures don't crash agent
- User gets helpful error context
- Agent can recover with alternative approach

### 5. Vector Search First
Retrieval happens early in agent chain:
- **Benefit**: Context-aware responses
- **Efficiency**: One retrieval often sufficient
- **Quality**: Grounds responses in student materials

## Integration Points

### With Express Backend

#### 1. Weak Topic Tracking
**Python sends:**
```json
{
  "topic": "Meiosis",
  "reason": "Student confused",
  "action": "log_weak_topic",
  "requires_backend_save": true
}
```

**Node.js should:**
```javascript
if (data.structured_data) {
  for (let entry of data.structured_data) {
    if (entry.action === 'log_weak_topic') {
      await addWeakTopic(studentId, entry.topic);
    }
  }
}
```

#### 2. Session Progress
**Frontend tracks:**
- Topics covered in session
- Session duration
- Questions answered correctly

**At session end:**
```javascript
const summary = await fetch('/agent/session_summary', {
  method: 'POST',
  body: JSON.stringify({
    collection_name: studentId,
    topics_covered: topics,
    session_duration_minutes: duration
  })
});
```

#### 3. Student Context
**Pass to agent each turn:**
```json
{
  "completed_topics": ["Topic A", "Topic B"],
  "weak_topics": ["Topic C"],
  "session_duration_minutes": 30
}
```

## Scalability Considerations

### Current Design Handles:
- Multiple students (per-collection isolation)
- Long documents (recursive chunking)
- Multi-turn conversations (memory tracking)
- Tool failures (graceful degradation)

### Future Optimizations:
1. **Caching**: LLM response caching for common questions
2. **Batch Processing**: Handle multiple questions simultaneously
3. **Tool Parallelization**: Run multiple tools in parallel
4. **Distributed Vectorstore**: Scale Chroma across servers
5. **Agent Specialization**: Different agents for different subjects

## Monitoring and Debugging

### Agent Execution Tracing
Set `verbose=True` in `create_study_agent()`:

```python
executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True  # Prints reasoning steps
)
```

Output shows:
```
> Entering new AgentExecutor chain...
Thought: I need to retrieve the student's notes on photosynthesis
Action: retrieve_from_notes
Action Input: {"query": "photosynthesis"}
Observation: Retrieved 3 sections...
Thought: Now I have context, I can formulate an answer
Final Answer: Based on your notes...
> Finished AgentExecutor chain.
```

### Logging
Add logging to track:
- Tool invocations
- Vectorstore queries
- LLM response times
- Error patterns

### Metrics to Track
- Average response time per tool
- Tool usage frequency
- Agent max iteration hits
- Weak topic detection rate
- Student progression metrics

## Security Considerations

1. **Collection Isolation**: Students can only access their own collection
2. **Input Validation**: All user inputs validated
3. **Rate Limiting**: (Recommended in Express backend)
4. **API Key**: GROQ_API_KEY kept in .env, never exposed
5. **Error Messages**: Generic messages in production, detailed in logs
