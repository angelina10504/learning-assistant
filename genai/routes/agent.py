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


@router.get("/health")
async def agent_health():
    """Health check for agent service."""
    return {
        "status": "ok",
        "service": "Agent Study Planner",
        "message": "Agent service is running"
    }
