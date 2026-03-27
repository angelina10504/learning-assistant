# Agentic Study Planner API Documentation

## Overview

The Agentic Study Planner uses LangChain's ReAct (Reasoning + Acting) pattern to provide adaptive, intelligent learning support. The agent can:

- **Retrieve information** from student notes using semantic search
- **Generate questions** to assess comprehension
- **Track weak areas** for targeted review
- **Suggest next topics** based on learning progress
- **Summarize sessions** with progress metrics

## Architecture

### Components

1. **agents/study_agent.py** - Core agent orchestrator
2. **agents/tools.py** - Tool implementations (retrieve, question, log, suggest, summarize)
3. **routes/agent.py** - FastAPI endpoints
4. **utils/syllabus_parser.py** - Document structure parsing

### Tool Set

The agent has access to these tools:

#### 1. `retrieve_from_notes`
Searches the student's notes using semantic similarity.

**Parameters:**
- `query` (str): Search query
- `top_k` (int, optional): Number of results (default: 3)

**Returns:**
- Formatted text with relevant sections from notes
- Includes page numbers and source information

**Use case:** When the student asks about a topic, the agent retrieves relevant material to provide context-aware answers.

#### 2. `ask_student_question`
Generates a comprehension question on a given topic.

**Parameters:**
- `topic` (str): Topic to create question about
- `difficulty` (str, optional): "easy", "medium", or "hard"

**Returns:**
- A single comprehension question string

**Use case:** The agent asks questions to assess understanding and identify knowledge gaps.

#### 3. `log_weak_topic`
Records topics where the student is struggling.

**Parameters:**
- `topic` (str): Topic the student struggles with
- `reason` (str, optional): Why they're struggling

**Returns:**
- JSON object with weak topic data
- Backend should save this data to update student profile

**Use case:** When the student demonstrates difficulty, the agent logs it for targeted review.

#### 4. `suggest_next_topic`
Recommends the next topic to study.

**Parameters:**
- `completed_topics` (list): Topics already studied
- `weak_topics` (list): Topics needing review

**Returns:**
- Recommendation for next topic with explanation

**Use case:** At session start or when student asks "what should I study next?"

#### 5. `summarize_progress`
Creates a session summary with metrics.

**Parameters:**
- `topics_covered` (list): Topics studied in session
- `time_spent_minutes` (int): Session duration

**Returns:**
- Formatted summary with pace and recommendations

**Use case:** End of session to reflect on learning progress.

## API Endpoints

### POST /agent/chat

Main endpoint for agentic chat interactions.

**Request Body:**
```json
{
  "message": "What should I study next?",
  "collection_name": "default",
  "chat_history": [
    {
      "role": "student",
      "content": "Help me understand photosynthesis"
    },
    {
      "role": "agent",
      "content": "I can help with that..."
    }
  ],
  "student_context": {
    "completed_topics": ["Introduction to Biology", "Cell Structure"],
    "weak_topics": ["Genetics"],
    "session_duration_minutes": 45
  }
}
```

**Request Fields:**
- `message` (str, required): The student's input message
- `collection_name` (str, optional): Which student collection to use (default: "default")
- `chat_history` (array, optional): Previous messages for context
  - `role` (str): "student" or "agent"
  - `content` (str): Message text
- `student_context` (object, optional): Student progress information
  - `completed_topics` (array): Topics already studied
  - `weak_topics` (array): Topics needing review
  - `session_duration_minutes` (int): Session elapsed time

**Response:**
```json
{
  "response": "Based on your progress, I'd recommend studying Cellular Respiration next...",
  "tools_used": [
    {
      "name": "retrieve_from_notes",
      "description": "Called tool: retrieve_from_notes"
    },
    {
      "name": "suggest_next_topic",
      "description": "Called tool: suggest_next_topic"
    }
  ],
  "sources": [
    {
      "page": 5,
      "source": "biology_notes.pdf",
      "content_preview": "Cellular respiration is the process by which cells break down..."
    }
  ],
  "structured_data": [
    {
      "topic": "Genetics",
      "reason": "Student struggled with inheritance patterns",
      "action": "log_weak_topic",
      "requires_backend_save": true
    }
  ]
}
```

**Response Fields:**
- `response` (str): Agent's response to the student
- `tools_used` (array): Tools the agent invoked
- `sources` (array): Retrieved source materials used
- `structured_data` (array): Data for backend to persist (weak topics, etc.)

**Status Codes:**
- `200`: Successful response
- `400`: Invalid request (empty message, etc.)
- `404`: Collection not found
- `500`: Server error

### POST /agent/session_summary

Generate a summary for a completed study session.

**Request Query Parameters:**
- `collection_name` (str, optional): Student collection (default: "default")
- `topics_covered` (array, optional): Topics studied
- `session_duration_minutes` (int, optional): Session length in minutes

**Example:**
```
POST /agent/session_summary?collection_name=student_123&session_duration_minutes=60&topics_covered=Photosynthesis&topics_covered=Cellular+Respiration
```

**Response:**
```json
{
  "summary": "📚 SESSION SUMMARY\n==================\nTopics Covered: 2\n  • Photosynthesis\n  • Cellular Respiration\n\nTime Spent: 60 minutes\nPace Score: 0.33 topics per 10 minutes\n\nGreat progress! Keep up the consistent learning habit.",
  "topics_count": 2,
  "duration_minutes": 60
}
```

### GET /agent/health

Health check for the agent service.

**Response:**
```json
{
  "status": "ok",
  "service": "Agent Study Planner",
  "message": "Agent service is running"
}
```

## Usage Examples

### Example 1: Basic Question Answering

**Request:**
```json
{
  "message": "Can you explain photosynthesis?",
  "collection_name": "biology_101"
}
```

**Flow:**
1. Agent receives the question
2. Calls `retrieve_from_notes` to find relevant material
3. Formulates answer based on student's notes
4. Returns response with sources

**Response:**
```json
{
  "response": "Based on your notes, photosynthesis is the process by which plants convert...",
  "tools_used": [{"name": "retrieve_from_notes"}],
  "sources": [...]
}
```

### Example 2: Learning Path Recommendation

**Request:**
```json
{
  "message": "What should I study next?",
  "student_context": {
    "completed_topics": ["Introduction", "Cell Structure", "Photosynthesis"],
    "weak_topics": ["Mitosis"]
  }
}
```

**Flow:**
1. Agent receives request with progress context
2. Calls `suggest_next_topic` with completed/weak topics
3. Recommends next topic, possibly suggesting review of weak area
4. Returns explanation

**Response:**
```json
{
  "response": "I recommend reviewing Mitosis first since you found it challenging...",
  "tools_used": [{"name": "suggest_next_topic"}],
  "structured_data": []
}
```

### Example 3: Comprehension Check

**Request:**
```json
{
  "message": "Can you test my understanding of DNA replication?",
  "student_context": {
    "completed_topics": ["DNA Structure", "DNA Replication"]
  }
}
```

**Flow:**
1. Agent receives comprehension check request
2. Calls `ask_student_question` to generate a test question
3. Presents question to student
4. Waits for follow-up with student's answer

**Response:**
```json
{
  "response": "Great! Here's a question to test your understanding:\n\nWhat are the main steps of DNA replication and why is semi-conservative replication important?",
  "tools_used": [{"name": "ask_student_question"}]
}
```

### Example 4: Tracking Learning Gaps

**Request:**
```json
{
  "message": "I'm really confused about meiosis. I don't understand how it differs from mitosis.",
  "student_context": {
    "completed_topics": ["Mitosis"],
    "weak_topics": []
  }
}
```

**Flow:**
1. Agent detects confusion about meiosis
2. Calls `retrieve_from_notes` for meiosis explanation
3. Detects potential learning gap
4. Calls `log_weak_topic` to record issue
5. Provides explanation and offers to ask comprehension questions

**Response:**
```json
{
  "response": "I see you're struggling with meiosis. Let me clarify...",
  "tools_used": [
    {"name": "retrieve_from_notes"},
    {"name": "log_weak_topic"},
    {"name": "ask_student_question"}
  ],
  "structured_data": [
    {
      "topic": "Meiosis",
      "reason": "Student confused about differences from mitosis",
      "action": "log_weak_topic",
      "requires_backend_save": true
    }
  ]
}
```

## Integration with Express Backend

### Saving Weak Topics

When the agent logs weak topics, it returns structured data in the response:

```python
# From agent response
structured_data = [
    {
        "topic": "Meiosis",
        "reason": "Student confused about differences from mitosis",
        "action": "log_weak_topic",
        "requires_backend_save": true
    }
]
```

**Backend should:**
1. Check `requires_backend_save` flag
2. If true, update the student's weak_topics list
3. Store for use in future study session recommendations

### Multi-Turn Conversations

The agent maintains context across turns:

```javascript
// Frontend JavaScript
const chatHistory = [];

async function sendMessage(userMessage) {
  const response = await fetch('/agent/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: userMessage,
      chat_history: chatHistory,
      student_context: {
        completed_topics: student.completedTopics,
        weak_topics: student.weakTopics
      }
    })
  });

  const data = await response.json();

  // Add to history
  chatHistory.push({ role: 'student', content: userMessage });
  chatHistory.push({ role: 'agent', content: data.response });

  // Save weak topics if returned
  if (data.structured_data.length > 0) {
    await saveWeakTopics(data.structured_data);
  }

  return data;
}
```

## Agent Behavior

### Reasoning Pattern (ReAct)

The agent follows this pattern:

1. **Thought**: Analyzes the student's message and decides what tools to use
2. **Action**: Calls the appropriate tool(s)
3. **Observation**: Processes tool results
4. **Repeat**: May use multiple tools in sequence
5. **Answer**: Formulates final response

Example reasoning trace:

```
Student: "I'm stuck on the difference between prokaryotes and eukaryotes"

Agent Thought: The student is confused about prokaryotes vs eukaryotes.
I should retrieve their notes on this topic to see what they've learned,
then possibly ask a clarifying question to pinpoint the confusion.

Agent Action: retrieve_from_notes("prokaryotes eukaryotes differences")

Observation: Retrieved 3 sections from notes covering cell structure,
organelles, and evolutionary history.

Agent Thought: Good, I have context. Now I should ask a targeted
question to see what specific aspect they're struggling with.

Agent Action: ask_student_question("prokaryotes vs eukaryotes", "medium")

Observation: Generated question about why eukaryotes have mitochondria
but prokaryotes don't.

Agent Answer: "I can see you're working with prokaryotes and eukaryotes.
Based on your notes... [formulates response]"
```

## Error Handling

### Collection Not Found

```json
{
  "detail": "Collection 'unknown_collection' not found. Please upload study materials first."
}
```

**Resolution:** Ensure student collection exists by uploading documents first.

### Empty Message

```json
{
  "detail": "Message cannot be empty"
}
```

**Resolution:** Send a non-empty message.

### Tool Execution Failure

The agent gracefully handles tool failures:

```json
{
  "response": "I encountered an issue retrieving your notes, but I can help you understand...",
  "tools_used": [],
  "structured_data": []
}
```

## Performance Considerations

1. **Vector Search**: First tool call usually retrieves from notes (semantic search)
2. **LLM Calls**: Agent makes 1-3 LLM calls per turn depending on reasoning
3. **Timeout**: Max 10 iterations per turn to prevent infinite loops
4. **Latency**: Expect 2-5 seconds per response (depending on note size and LLM load)

## Customization

### Adjusting System Prompt

Edit the system prompt in `study_agent.py`'s `create_study_agent()` function to change:
- Teaching style
- Tool usage strategy
- Response format
- Learning focus areas

### Adding New Tools

To add a new tool:

1. Define the tool function in `agents/tools.py` with `@tool` decorator
2. Add to tools list in `create_study_agent()`
3. Update system prompt if needed

Example:
```python
@tool
def custom_tool(param: str) -> str:
    """Tool description"""
    return f"Result for {param}"
```

## Testing

Run the integration test:
```bash
cd /sessions/adoring-sweet-edison/mnt/learning-assistant/genai
python test_agent_integration.py
```

This verifies:
- Agent creation
- Tool loading
- Sample query execution
- Response formatting
