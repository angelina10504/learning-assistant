"""
Tool implementations for the Study Agent.

This module defines the tools that the study agent can use to interact
with the vector store, track progress, and provide personalized learning.
"""

import json
from typing import Dict, List, Any, Optional
from langchain_core.tools import tool
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings


# Global reference to vectorstore (set during agent initialization)
_vectorstore: Optional[Chroma] = None


def set_vectorstore(vectorstore: Chroma) -> None:
    """Set the vectorstore for use by tools."""
    global _vectorstore
    _vectorstore = vectorstore


def get_vectorstore() -> Chroma:
    """Get the current vectorstore."""
    if _vectorstore is None:
        raise RuntimeError("Vectorstore not initialized. Call set_vectorstore() first.")
    return _vectorstore


@tool
def retrieve_from_notes(query: str, top_k: int = 3) -> str:
    """
    Retrieve relevant content from the student's notes using semantic search.

    Args:
        query: The search query about a topic
        top_k: Number of results to retrieve (default 3)

    Returns:
        Formatted string containing retrieved content chunks
    """
    try:
        vectorstore = get_vectorstore()
        retriever = vectorstore.as_retriever(search_kwargs={"k": top_k})
        docs = retriever.invoke(query)

        if not docs:
            return f"No relevant content found for: {query}"

        formatted = "\n\n---\n\n".join(
            f"Page {doc.metadata.get('page', '?')}: {doc.page_content}"
            for doc in docs
        )
        return f"Retrieved {len(docs)} relevant sections:\n\n{formatted}"

    except Exception as e:
        return f"Error retrieving from notes: {str(e)}"


@tool
def ask_student_question(topic: str, difficulty: str = "medium") -> str:
    """
    Generate a comprehension question to test student understanding.

    This tool creates a question at the specified difficulty level on a given topic.
    The question helps assess whether the student understands the material.

    Args:
        topic: The topic to create a question about
        difficulty: "easy", "medium", or "hard" (default: "medium")

    Returns:
        A question string to ask the student
    """
    try:
        from chains.rag_chain import get_llm
        from langchain_core.prompts import PromptTemplate

        llm = get_llm()

        # Use the vectorstore to get relevant context for the question
        vectorstore = get_vectorstore()
        retriever = vectorstore.as_retriever(search_kwargs={"k": 2})
        relevant_docs = retriever.invoke(topic)

        context = "\n".join(doc.page_content for doc in relevant_docs)

        prompt = PromptTemplate(
            template="""Based on the following study material, generate a {difficulty}
            comprehension question about {topic}. The question should help assess understanding
            of key concepts. Return ONLY the question, nothing else.

            Context:
            {context}

            Question:""",
            input_variables=["difficulty", "topic", "context"]
        )

        question = llm.invoke(
            prompt.format(difficulty=difficulty, topic=topic, context=context)
        ).content.strip()

        return question

    except Exception as e:
        return f"Error generating question: {str(e)}"


@tool
def log_weak_topic(topic: str, reason: str = "Student struggled with this topic") -> str:
    """
    Log that a student is struggling with a specific topic.

    This tool records weak areas so the study plan can be adjusted.
    Returns a JSON structure that should be saved by the backend.

    Args:
        topic: The topic the student is struggling with
        reason: Explanation of why this topic is weak

    Returns:
        JSON string with weak topic data
    """
    try:
        weak_topic_entry = {
            "topic": topic,
            "reason": reason,
            "action": "log_weak_topic",
            "requires_backend_save": True
        }
        return json.dumps(weak_topic_entry, indent=2)

    except Exception as e:
        return json.dumps({
            "error": str(e),
            "topic": topic
        })


@tool
def suggest_next_topic(completed_topics: List[str], weak_topics: List[str]) -> str:
    """
    Suggest the next topic to study based on progress and weak areas.

    Uses the syllabus structure and student's learning progress to recommend
    the most valuable topic to study next.

    Args:
        completed_topics: List of topics already covered
        weak_topics: List of topics where student struggled

    Returns:
        Recommendation for the next topic to study
    """
    try:
        from chains.rag_chain import get_llm
        from langchain_core.prompts import PromptTemplate

        llm = get_llm()

        prompt = PromptTemplate(
            template="""As a study planner, recommend the next topic to study.

            Completed topics: {completed}
            Topics needing review: {weak}

            Consider:
            1. Whether weak topics should be reviewed first
            2. Logical progression through the material
            3. Prerequisites for advanced topics

            Recommend ONE specific topic and explain why.

            Recommendation:""",
            input_variables=["completed", "weak"]
        )

        recommendation = llm.invoke(
            prompt.format(
                completed=", ".join(completed_topics) or "None yet",
                weak=", ".join(weak_topics) or "None identified"
            )
        ).content.strip()

        return recommendation

    except Exception as e:
        return f"Error generating recommendation: {str(e)}"


@tool
def summarize_progress(topics_covered: List[str], time_spent_minutes: int) -> str:
    """
    Create a summary of the learning session.

    Generates a progress report for the session including topics covered,
    estimated learning efficiency, and recommendations for future study.

    Args:
        topics_covered: List of topics studied in this session
        time_spent_minutes: Total minutes spent studying

    Returns:
        A formatted progress summary
    """
    try:
        if not topics_covered:
            return "No topics covered in this session yet."

        topics_text = "\n".join(f"  • {topic}" for topic in topics_covered)
        efficiency = len(topics_covered) / max(1, time_spent_minutes / 10)

        summary = f"""
📚 SESSION SUMMARY
==================
Topics Covered: {len(topics_covered)}
{topics_text}

Time Spent: {time_spent_minutes} minutes
Pace Score: {efficiency:.2f} topics per 10 minutes

Great progress! Keep up the consistent learning habit.
"""
        return summary.strip()

    except Exception as e:
        return f"Error summarizing progress: {str(e)}"
