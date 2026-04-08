"""
Agent-based chat routes for the Agentic Study Planner.

This module provides the /agent/chat endpoint that uses intelligent agents
to provide adaptive, personalized learning experiences.
"""

import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from agents.study_agent import run_agent_chat
from utils.vector_store import load_chroma

router = APIRouter()


# Request/Response models
class StudentContext(BaseModel):
    """Student's learning progress context."""
    completed_topics: List[str] = []
    weak_topics: List[str] = []
    session_duration_minutes: int = 0


class AgentChatMessage(BaseModel):
    """A message in the chat history."""
    role: str  # "student" or "agent"
    content: str


class AgentChatRequest(BaseModel):
    """Request body for agent chat endpoint."""
    message: str
    collection_name: str = "default"
    chat_history: Optional[List[AgentChatMessage]] = None
    student_context: Optional[StudentContext] = None


class ToolCall(BaseModel):
    """Represents a tool invoked by the agent."""
    name: str
    description: str


class AgentChatResponse(BaseModel):
    """Response from agent chat."""
    response: str
    tools_used: List[ToolCall]
    sources: List[Dict[str, Any]] = []
    structured_data: List[Dict[str, Any]] = []


class PreAssessmentRequest(BaseModel):
    """Request body for pre-assessment questions."""
    collection_name: str


class PreAssessmentQuestion(BaseModel):
    id: int
    topic: str
    question: str
    options: List[str]
    correct: str
    difficulty: str


class PreAssessmentResponse(BaseModel):
    questions: List[PreAssessmentQuestion]


@router.post("/", response_model=AgentChatResponse)
async def agent_chat(request: AgentChatRequest):
    """
    Chat with the study planner agent.

    The agent uses ReAct pattern to reason about the student's learning needs
    and take appropriate actions (retrieve notes, ask questions, log weak areas, etc).

    Args:
        request: AgentChatRequest with message, collection, history, and context

    Returns:
        AgentChatResponse with agent's response and metadata
    """
    try:
        # Validate request
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")

        # Load the student's vectorstore
        try:
            vectorstore = load_chroma(collection_name=request.collection_name)
        except Exception as e:
            raise HTTPException(
                status_code=404,
                detail=f"Collection '{request.collection_name}' not found. Please upload study materials first."
            )

        # Prepare chat history
        chat_history = []
        if request.chat_history:
            chat_history = [
                {"role": msg.role, "content": msg.content}
                for msg in request.chat_history
            ]

        # Prepare student context
        student_context = {}
        if request.student_context:
            student_context = {
                "completed_topics": request.student_context.completed_topics,
                "weak_topics": request.student_context.weak_topics,
                "session_duration_minutes": request.student_context.session_duration_minutes
            }

        # Run the agent (async)
        agent_response, tools_used, structured_data = await run_agent_chat(
            user_message=request.message,
            vectorstore=vectorstore,
            chat_history=chat_history,
            student_context=student_context
        )

        # Format tools used
        formatted_tools = [
            ToolCall(name=tool, description=f"Called tool: {tool}")
            for tool in tools_used
        ]

        # Retrieve sources if the agent queried the vectorstore
        sources = []
        if "retrieve_from_notes" in tools_used or not tools_used:
            try:
                retriever = vectorstore.as_retriever(search_kwargs={"k": 2})
                source_docs = retriever.invoke(request.message)
                sources = [
                    {
                        "page": doc.metadata.get("page", "?"),
                        "source": doc.metadata.get("source", "?"),
                        "content_preview": doc.page_content[:150]
                    }
                    for doc in source_docs
                ]
            except Exception as e:
                # Silently fail source retrieval
                sources = []

        return AgentChatResponse(
            response=agent_response,
            tools_used=formatted_tools,
            sources=sources,
            structured_data=structured_data
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error in agent chat: {str(e)}"
        )


@router.post("/session_summary")
async def session_summary(
    collection_name: str = "default",
    topics_covered: Optional[List[str]] = None,
    session_duration_minutes: int = 0
):
    """
    Generate a summary of a completed study session.

    Args:
        collection_name: The student's collection
        topics_covered: Topics covered in the session
        session_duration_minutes: Duration of the session

    Returns:
        Session summary with key metrics
    """
    try:
        from agents.tools import summarize_progress

        if not topics_covered:
            topics_covered = []

        summary = summarize_progress.invoke({
            "topics_covered": topics_covered,
            "time_spent_minutes": session_duration_minutes
        })

        return {
            "summary": summary,
            "topics_count": len(topics_covered),
            "duration_minutes": session_duration_minutes
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating summary: {str(e)}"
        )


class AssessmentAnswer(BaseModel):
    topic: str
    correct: bool
    skipped: bool


class GeneratePlanRequest(BaseModel):
    """Request body for study plan generation."""
    collection_name: str
    milestone_topic: Optional[str] = None
    milestone_deadline: Optional[str] = None  # ISO date string
    assessment_results: Optional[List[AssessmentAnswer]] = None


class PlanTopic(BaseModel):
    name: str
    subtopics: List[str] = []
    estimatedMinutes: int = 30
    difficulty: str = "intermediate"
    status: str = "locked"
    order: int = 0
    pageRange: List[int] = []
    priority: str = "medium"
    priorKnowledge: str = "none"


class GeneratePlanResponse(BaseModel):
    title: str
    topics: List[PlanTopic]
    totalEstimatedHours: float


@router.post("/pre-assessment-questions", response_model=PreAssessmentResponse)
async def pre_assessment_questions(request: PreAssessmentRequest):
    """
    Generate diagnostic questions from course materials.
    """
    try:
        from utils.vector_store import load_chroma
        from langchain_groq import ChatGroq
        import os
        import json
        import re

        try:
            vectorstore = load_chroma(collection_name=request.collection_name)
        except Exception:
            raise HTTPException(
                status_code=404,
                detail=f"Study material has not been prepared yet. Please ask your teacher to vectorize materials first."
            )

        # Retrieve all chunks for broad coverage
        collection_docs = vectorstore.get(include=["documents"])
        if not collection_docs or not collection_docs.get("documents"):
            raise HTTPException(status_code=400, detail="No study materials found.")

        all_texts = collection_docs["documents"]
        # Get up to 20 sampled chunks
        step = max(1, len(all_texts) // 20)
        sampled_texts = [all_texts[i] for i in range(0, len(all_texts), step)][:20]
        context = "\n\n".join(sampled_texts)[:8000]

        llm = ChatGroq(
            model="llama-3.1-8b-instant",
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=0.4
        )

        prompt = f"""Based on the following course material, generate exactly 5 diagnostic questions to assess a student's prior knowledge.
The questions should cover different key topics from the material.
For each question provide 4 MCQ options with one correct answer (A, B, C, or D), and tag which topic it tests.

Content:
{context}

Return ONLY valid JSON in this format:
{{
  "questions": [
    {{
      "id": 1,
      "topic": "Topic Name",
      "question": "Question text?",
      "options": ["A. Choice 1", "B. Choice 2", "C. Choice 3", "D. Choice 4"],
      "correct": "A",
      "difficulty": "basic"
    }}
  ]
}}"""

        response = llm.invoke(prompt)
        text = response.content.strip()

        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r'\{.*\}', text, re.DOTALL)
            if match:
                data = json.loads(match.group())
            else:
                raise Exception("Failed to parse LLM response")

        return PreAssessmentResponse(questions=data.get("questions", []))

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-plan", response_model=GeneratePlanResponse)
async def generate_plan(request: GeneratePlanRequest):
    """
    Generate a personalized study plan by analyzing vectorized PDFs.

    Uses the syllabus parser to extract topics from the Chroma collection,
    then organizes them into an ordered study plan with time estimates.
    If a milestone is provided, prioritizes relevant topics.
    """
    try:
        from utils.vector_store import load_chroma
        from langchain_groq import ChatGroq
        from langchain_core.prompts import PromptTemplate
        import os
        import json
        import re

        def get_llm():
            return ChatGroq(
                model="llama-3.1-8b-instant",
                api_key=os.getenv("GROQ_API_KEY"),
                temperature=0.3
            )

        # Load documents from the vectorstore
        try:
            vectorstore = load_chroma(collection_name=request.collection_name)
        except Exception as e:
            raise HTTPException(
                status_code=404,
                detail=f"Collection '{request.collection_name}' not found. Please upload and vectorize materials first."
            )

        # Get all chunks from the Chroma collection
        collection_docs = vectorstore.get(include=["documents", "metadatas"])

        if not collection_docs or not collection_docs.get("documents"):
            raise HTTPException(
                status_code=400,
                detail="No documents found in this collection. Please upload materials first."
            )

        # Prepare assessment context if provided
        assessment_context = ""
        if request.assessment_results:
            assessment_context = "\nPrior knowledge assessment results:\n"
            for res in request.assessment_results:
                status = "already knows" if res.correct else "needs work"
                if res.skipped: status = "uncertain"
                assessment_context += f"- {res.topic}: Student {status}\n"
            
            assessment_context += """
When generating topics:
- If 'already knows': mark low priority, reduce hours, set priorKnowledge='strong'
- If 'needs work': mark high priority, increase hours, set priorKnowledge='none'
- If 'uncertain': mark medium priority, standard hours, set priorKnowledge='partial'
"""

        # Concatenate chunk texts
        all_texts = collection_docs["documents"]
        concatenated_text = "\n\n".join(all_texts)[:6000]

        # Use LLM directly to extract topics
        llm = get_llm()
        extract_prompt = f"""Analyze this educational content and extract the main topics for a study plan.
{assessment_context}

Content:
{concatenated_text}

Return ONLY valid JSON:
{{
    "topics": [
        {{
            "name": "Topic Name",
            "subtopics": ["sub1", "sub2"],
            "estimatedMinutes": 30,
            "difficulty": "intermediate",
            "order": 1,
            "priority": "high|medium|low",
            "priorKnowledge": "none|partial|strong",
            "pageRange": [1, 5]
        }}
    ],
    "totalEstimatedHours": 2.5,
    "title": "Study Plan: [Subject]"
}}

Note: pageRange MUST be a list of exactly two INTEGERS representing start and end pages. If unknown, use [].
"""

        llm_response = llm.invoke(extract_prompt)
        response_text = llm_response.content.strip()
        print(f"LLM plan response: {response_text[:500]}")

        # Parse JSON — try direct parse, then regex fallback
        plan_data = None
        try:
            plan_data = json.loads(response_text)
        except json.JSONDecodeError:
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                try:
                    plan_data = json.loads(json_match.group())
                except json.JSONDecodeError:
                    plan_data = None

        # If LLM/JSON parsing failed entirely, build a sensible default
        if not plan_data or not plan_data.get("topics"):
            plan_data = {
                "title": "Study Plan",
                "totalEstimatedHours": 2.0,
                "topics": [
                    {"name": "Introduction & Overview", "subtopics": ["Key concepts", "Terminology"], "estimatedMinutes": 30, "difficulty": "beginner", "order": 1, "pageRange": []},
                    {"name": "Core Concepts", "subtopics": ["Fundamentals", "Principles"], "estimatedMinutes": 45, "difficulty": "intermediate", "order": 2, "pageRange": []},
                    {"name": "Advanced Topics", "subtopics": ["Applications", "Case studies"], "estimatedMinutes": 45, "difficulty": "advanced", "order": 3, "pageRange": []},
                ]
            }

        raw_topics = plan_data.get("topics", [])
        estimated_hours = plan_data.get("totalEstimatedHours", 0)
        title = plan_data.get("title", "Study Plan")

        # If milestone provided, use LLM to prioritize and organize topics
        if request.milestone_topic:
            llm = get_llm()
            topics_json = json.dumps(raw_topics, indent=2)

            deadline_context = ""
            if request.milestone_deadline:
                deadline_context = f"\nThe milestone deadline is: {request.milestone_deadline}. Distribute study time to finish before this date."

            prompt = PromptTemplate(
                template="""You are a study planner. Given these extracted topics from course materials and a milestone to prepare for, create an optimized study plan.

Milestone to prepare for: {milestone_topic}{deadline_context}

Available topics from materials:
{topics_json}

Create a focused study plan that:
1. Prioritizes topics most relevant to the milestone "{milestone_topic}"
2. Orders topics by prerequisite dependencies
3. Assigns realistic time estimates in minutes (15-90 min per topic)
4. Sets difficulty levels (beginner/intermediate/advanced)

Return ONLY valid JSON in this format:
{{
    "title": "Study Plan: [milestone topic]",
    "topics": [
        {{
            "name": "Topic Name",
            "subtopics": ["subtopic1", "subtopic2"],
            "estimatedMinutes": 30,
            "difficulty": "intermediate",
            "order": 1,
            "pageRange": [1, 5]
        }}
    ],
    "totalEstimatedHours": number
}}""",
                input_variables=["milestone_topic", "deadline_context", "topics_json"]
            )

            response = llm.invoke(prompt.format(
                milestone_topic=request.milestone_topic,
                deadline_context=deadline_context,
                topics_json=topics_json[:3000]
            ))

            response_text = response.content.strip()
            try:
                plan_data = json.loads(response_text)
            except json.JSONDecodeError:
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    plan_data = json.loads(json_match.group())
                else:
                    plan_data = None

            if plan_data and plan_data.get("topics"):
                raw_topics = plan_data["topics"]
                estimated_hours = plan_data.get("totalEstimatedHours", estimated_hours)
                title = plan_data.get("title", f"Study Plan: {request.milestone_topic}")
            else:
                title = f"Study Plan: {request.milestone_topic}"

        # Build final topics list
        plan_topics = []
        total_minutes = 0
        for i, topic in enumerate(raw_topics):
            est_min = topic.get("estimatedMinutes") or topic.get("estimated_minutes") or 30
            raw_page_range = topic.get("pageRange") or topic.get("page_range") or []
            
            # Sanitize pageRange (ensure only integers)
            sanitized_page_range = []
            if isinstance(raw_page_range, list):
                for p in raw_page_range:
                    try:
                        sanitized_page_range.append(int(float(p)))
                    except (ValueError, TypeError):
                        continue
            
            topic_name = topic.get("name", f"Topic {i+1}")
            
            # Re-verify and enforce strict priority assignments based on assessment results
            priority = "medium"
            prior_knowledge = "partial"
            
            if request.assessment_results:
                topic_name_lower = topic_name.lower()
                matched_res = None
                for res in request.assessment_results:
                    res_topic_lower = res.topic.lower()
                    if topic_name_lower in res_topic_lower or res_topic_lower in topic_name_lower:
                        matched_res = res
                        break
                
                if matched_res:
                    if matched_res.correct:
                        priority = "low"
                        prior_knowledge = "strong"
                    elif matched_res.skipped:
                        priority = "medium"
                        prior_knowledge = "partial"
                    else:
                        priority = "high"
                        prior_knowledge = "none"

            plan_topics.append(PlanTopic(
                name=topic_name,
                subtopics=topic.get("subtopics", []),
                estimatedMinutes=est_min,
                difficulty=topic.get("difficulty", "intermediate"),
                status="current" if i == 0 else "locked",
                order=i + 1,
                priority=priority,
                priorKnowledge=prior_knowledge,
                pageRange=sanitized_page_range
            ))
            total_minutes += est_min

        total_hours = round(total_minutes / 60, 1) if total_minutes > 0 else estimated_hours

        return GeneratePlanResponse(
            title=title,
            topics=plan_topics,
            totalEstimatedHours=total_hours
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating study plan: {str(e)}"
        )


class FinalQuizRequest(BaseModel):
    classId: str
    topicName: str
    studentId: str
    difficulty: Optional[str] = "intermediate"

@router.post("/final-quiz")
async def generate_final_quiz(request: FinalQuizRequest):
    """
    Generate a 5-question multiple choice final assessment for a topic.
    """
    print(f"[final-quiz] received classId={request.classId} topicName={request.topicName} difficulty={request.difficulty}")
    try:
        from utils.vector_store import load_chroma
        from langchain_groq import ChatGroq
        import os
        import json
        import re
        import uuid

        collection_name = f"class_{request.classId}"
        print(f"[final-quiz] loading collection: {collection_name}")
        try:
            vectorstore = load_chroma(collection_name=collection_name)
        except Exception as ce:
            print(f"[final-quiz] ChromaDB load failed: {ce}")
            raise HTTPException(
                status_code=404,
                detail={"error": "course_not_vectorized", "message": "Your teacher hasn't prepared the study material yet."}
            )

        # Query vectorstore to retrieve up to 12 chunks for the topic
        retriever = vectorstore.as_retriever(search_kwargs={"k": 12})
        source_docs = retriever.invoke(request.topicName)
        
        if not source_docs:
            raise HTTPException(status_code=400, detail="No relevant study materials found for this topic.")
            
        context = "\n\n".join([doc.page_content for doc in source_docs])[:10000]

        llm = ChatGroq(
            model="llama-3.1-8b-instant",
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=0.3
        )

        
        if request.difficulty == 'basic':
            difficulty_instructions = """Generate questions that test recall and basic understanding.
Questions should ask: definitions, identification, simple facts.
Example style: "What is the purpose of X?" "Which of these is an example of X?"
All 5 questions should be answerable by someone who just read about the topic."""
        elif request.difficulty == 'advanced':
            difficulty_instructions = """Generate questions that test analysis and evaluation.
Questions should ask: trade-offs, design decisions, failure scenarios.
Example style: "In what scenario would X be preferred over Y and why?"
"What is the limitation of X in a distributed system?"
Questions should be challenging even for someone who studied the topic well.
Avoid questions that can be answered from a single sentence of the material."""
        else:
            difficulty_instructions = """Generate questions that test comprehension and application.
Questions should ask: comparisons, cause-effect, how things work together.
Example style: "How does X differ from Y?" "What happens when X fails?"
At least 2 questions should require applying knowledge, not just recalling it."""


        prompt = f"""You are a quiz generator for the topic: {request.topicName}.
Based ONLY on the following course material, generate exactly 5 multiple choice questions.
These questions must test conceptual understanding, not just memorization.
Each question must have 4 options (A, B, C, D) with exactly one correct answer.
For each question also write a 2-sentence explanation of WHY the correct answer is right,
using the source material as reference. Additionally, provide a concise explanation of WHY each of the 3 incorrect options is wrong.

DIFFICULTY GUIDELINES:
{difficulty_instructions}

Course material:
{context}

Return ONLY valid JSON, no extra text:
{{
  "quizId": "{str(uuid.uuid4())}",
  "topic": "{request.topicName}",
  "questions": [
    {{
      "id": 1,
      "question": "Question text?",
      "options": [
        {{"letter": "A", "text": "Option text"}},
        {{"letter": "B", "text": "Option text"}},
        {{"letter": "C", "text": "Option text"}},
        {{"letter": "D", "text": "Option text"}}
      ],
      "correctLetter": "A",
      "explanation": "The correct answer is A because... According to the material...",
      "wrongAnswerReasons": {{
        "B": "B is incorrect because...",
        "C": "C is incorrect because...",
        "D": "D is incorrect because..."
      }}
    }}
  ]
}}"""

        response = llm.invoke(prompt)
        text = response.content.strip()

        raw = text.strip()
        if raw.startswith("```"):
            import re
            raw = re.sub(r'^```(?:json)?\n?', '', raw)
            raw = re.sub(r'\n?```$', '', raw)
            
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r'\{.*\}', text, re.DOTALL)
            if match:
                data = json.loads(match.group())
            else:
                raise Exception("Failed to parse LLM response")

        return data
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[final-quiz] FAILED: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail={"error": "internal_error", "message": str(e)}
        )

@router.get("/health")
async def agent_health():
    """Health check for agent service."""
    return {
        "status": "ok",
        "service": "Agent Study Planner",
        "message": "Agent service is running"
    }
