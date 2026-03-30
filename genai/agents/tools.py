"""
Tool implementations for the Study Agent.

This module defines the tools that the study agent can use to interact
with the vector store, track progress, and provide personalized learning.

IMPORTANT: All tools accept a single string input because the ReAct agent
passes tool inputs as plain strings, not dicts or multiple args.
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
def retrieve_from_notes(query: str) -> str:
    """Search and retrieve relevant content from the student's uploaded study materials. Input should be a search query string about the topic you want to find."""
    try:
        vectorstore = get_vectorstore()
        retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
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
def ask_student_question(topic: str) -> str:
    """Generate a comprehension question on a given topic to test student understanding. Input should be just the topic name as a string."""
    try:
        from chains.rag_chain import get_llm
        from langchain_core.prompts import PromptTemplate

        llm = get_llm()

        # Use the vectorstore to get relevant context for the question
        vectorstore = get_vectorstore()
        retriever = vectorstore.as_retriever(search_kwargs={"k": 2})
        relevant_docs = retriever.invoke(topic)

        context = "\n".join(doc.page_content for doc in relevant_docs) if relevant_docs else "General knowledge"

        prompt = PromptTemplate(
            template="""Based on the following study material, generate a comprehension question about {topic}.
The question should help assess understanding of key concepts.
Return ONLY the question, nothing else.

Context:
{context}

Question:""",
            input_variables=["topic", "context"]
        )

        question = llm.invoke(
            prompt.format(topic=topic, context=context[:2000])
        ).content.strip()

        return question

    except Exception as e:
        return f"Error generating question: {str(e)}"


@tool
def log_weak_topic(topic: str) -> str:
    """Record that a student is struggling with a specific topic for later review. Input should be the topic name as a string."""
    try:
        weak_topic_entry = {
            "topic": topic,
            "reason": "Student struggled with this topic",
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
def suggest_next_topic(input_str: str) -> str:
    """Recommend the next topic to study based on progress and weak areas. Input should be a string like: 'completed: Topic A, Topic B | weak: Topic C'"""
    try:
        from chains.rag_chain import get_llm
        from langchain_core.prompts import PromptTemplate

        llm = get_llm()

        # Parse the input string flexibly
        completed_str = ""
        weak_str = ""
        if "completed:" in input_str.lower():
            parts = input_str.lower().split("weak:")
            completed_str = parts[0].replace("completed:", "").strip()
            weak_str = parts[1].strip() if len(parts) > 1 else ""
        else:
            completed_str = input_str

        prompt = PromptTemplate(
            template="""As a study planner, recommend the next topic to study.

Completed topics: {completed}
Topics needing review: {weak}

Consider:
1. Whether weak topics should be reviewed first
2. Logical progression through the material
3. Prerequisites for advanced topics

Recommend ONE specific topic and explain briefly why.

Recommendation:""",
            input_variables=["completed", "weak"]
        )

        recommendation = llm.invoke(
            prompt.format(
                completed=completed_str or "None yet",
                weak=weak_str or "None identified"
            )
        ).content.strip()

        return recommendation

    except Exception as e:
        return f"Error generating recommendation: {str(e)}"


@tool
def summarize_progress(input_str: str) -> str:
    """Create a summary of the learning session. Input should be a string like: 'topics: Topic A, Topic B | minutes: 30'"""
    try:
        topics_covered = []
        time_spent_minutes = 0

        if "topics:" in input_str.lower():
            parts = input_str.lower().split("minutes:")
            topics_part = parts[0].replace("topics:", "").strip()
            topics_covered = [t.strip() for t in topics_part.split(",") if t.strip()]
            if len(parts) > 1:
                try:
                    time_spent_minutes = int(parts[1].strip())
                except ValueError:
                    time_spent_minutes = 0
        else:
            topics_covered = [t.strip() for t in input_str.split(",") if t.strip()]

        if not topics_covered:
            return "No topics covered in this session yet."

        topics_text = "\n".join(f"  - {topic}" for topic in topics_covered)
        summary = f"""**Session Summary**
Topics Covered: {len(topics_covered)}
{topics_text}

Time Spent: {time_spent_minutes} minutes

Great progress! Keep up the consistent learning habit."""
        return summary.strip()

    except Exception as e:
        return f"Error summarizing progress: {str(e)}"
