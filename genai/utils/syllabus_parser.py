"""
Syllabus Parser for extracting topic structure from educational documents.

This module parses the document structure to build a topic tree,
allowing the study agent to understand prerequisites and progression.
"""

from typing import List, Dict, Any, Optional
from langchain_core.documents import Document
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
import os
from dotenv import load_dotenv

load_dotenv()


def get_llm():
    """Create and return a ChatGroq LLM instance."""
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.3
    )


def extract_topics_from_documents(documents: List[Document]) -> Dict[str, Any]:
    """
    Extract topic structure from a list of documents.

    Uses the document structure (headings, sections) to build a topic tree.
    This helps the study planner understand learning progression.

    Args:
        documents: List of LangChain Document objects

    Returns:
        Dictionary containing:
        - topics: List of main topics with subtopics and page ranges
        - structure: Hierarchical topic tree
        - total_pages: Number of pages analyzed
    """
    try:
        llm = get_llm()

        # Extract text that looks like headings and structure
        document_text = _extract_document_structure(documents)

        # Use LLM to parse structure
        prompt = PromptTemplate(
            template="""Analyze this educational material structure and extract the topic outline.

Material Content:
{content}

Please provide a JSON-formatted response with this structure:
{{
    "topics": [
        {{
            "name": "Topic Name",
            "subtopics": ["subtopic1", "subtopic2"],
            "page_range": [start, end],
            "difficulty": "beginner|intermediate|advanced",
            "prerequisites": []
        }}
    ],
    "total_topics": number,
    "estimated_hours": number
}}

Only return valid JSON, nothing else.""",
            input_variables=["content"]
        )

        response = llm.invoke(
            prompt.format(content=document_text[:3000])  # Limit to first 3000 chars
        )

        response_text = response.content.strip()

        # Parse JSON response
        import json
        try:
            parsed = json.loads(response_text)
        except json.JSONDecodeError:
            # Try to extract JSON from response
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
            else:
                parsed = _create_default_structure(documents)

        return {
            "topics": parsed.get("topics", []),
            "total_topics": parsed.get("total_topics", len(parsed.get("topics", []))),
            "estimated_hours": parsed.get("estimated_hours", 0),
            "total_pages": len(documents)
        }

    except Exception as e:
        print(f"Error extracting topics: {str(e)}")
        return _create_default_structure(documents)


def _extract_document_structure(documents: List[Document]) -> str:
    """Extract headings and structure markers from documents."""
    structure_lines = []

    for i, doc in enumerate(documents[:20]):  # First 20 pages
        content = doc.page_content
        page_num = doc.metadata.get("page", i + 1)

        # Extract lines that might be headings (capitalized, short lines)
        lines = content.split("\n")
        for line in lines:
            stripped = line.strip()
            if len(stripped) < 100 and len(stripped) > 5:
                # Likely a heading if it's short and has capital letters
                if any(c.isupper() for c in stripped) and stripped.count(" ") < 10:
                    structure_lines.append(f"Page {page_num}: {stripped}")

    return "\n".join(structure_lines[:50])  # Top 50 structure indicators


def _create_default_structure(documents: List[Document]) -> Dict[str, Any]:
    """Create a default structure if parsing fails."""
    num_pages = len(documents)

    # Simple heuristic: divide into sections
    topics_count = max(1, num_pages // 5)

    default_topics = [
        {
            "name": f"Topic {i + 1}",
            "subtopics": ["Core concepts", "Examples", "Practice"],
            "page_range": [i * 5 + 1, (i + 1) * 5],
            "difficulty": "intermediate",
            "prerequisites": [] if i == 0 else [f"Topic {i}"]
        }
        for i in range(topics_count)
    ]

    return {
        "topics": default_topics,
        "total_topics": topics_count,
        "estimated_hours": num_pages / 4,  # Rough estimate: 4 pages per hour
        "total_pages": num_pages
    }


def suggest_next_topic(
    completed_topics: List[str],
    weak_topics: List[str],
    all_topics: List[Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    """
    Suggest the next topic to study based on progress.

    Args:
        completed_topics: List of completed topic names
        weak_topics: List of topics needing review
        all_topics: Full list of available topics with structure

    Returns:
        Next recommended topic or None
    """
    # Weak topics should be reviewed first
    for topic_name in weak_topics:
        topic = _find_topic_by_name(topic_name, all_topics)
        if topic:
            return topic

    # Find first uncompleted topic
    for topic in all_topics:
        if topic["name"] not in completed_topics:
            # Check prerequisites
            prereqs = topic.get("prerequisites", [])
            if all(prereq in completed_topics for prereq in prereqs):
                return topic

    # If all prerequisites not met, find the missing one
    for topic in all_topics:
        if topic["name"] not in completed_topics:
            return topic

    return None


def _find_topic_by_name(name: str, topics: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Find a topic by name in the topic list."""
    for topic in topics:
        if topic.get("name") == name:
            return topic
    return None


def build_prerequisite_chain(
    all_topics: List[Dict[str, Any]]
) -> Dict[str, List[str]]:
    """
    Build a map of topics to their prerequisites.

    Args:
        all_topics: List of topics with prerequisite info

    Returns:
        Dictionary mapping topic names to their prerequisites
    """
    chain = {}
    for topic in all_topics:
        chain[topic.get("name", "")] = topic.get("prerequisites", [])
    return chain
