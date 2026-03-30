"""
Agentic Study Planner using LangChain ReAct pattern with robust fallback.

This module implements an intelligent study agent that can:
- Retrieve information from student notes
- Generate comprehension questions
- Track weak areas
- Recommend next topics
- Summarize learning progress

The agent uses the ReAct (Reasoning + Acting) pattern for interpretability,
with a direct RAG fallback when the agent loop fails.
"""

import os
import json
from typing import Optional, Dict, List, Any, Tuple
from langchain_groq import ChatGroq
from langchain.agents import create_react_agent, AgentExecutor, Tool
from langchain_core.prompts import PromptTemplate
from langchain_core.tools import tool
from langchain_chroma import Chroma
from agents.tools import (
    retrieve_from_notes,
    ask_student_question,
    log_weak_topic,
    suggest_next_topic,
    summarize_progress,
    set_vectorstore
)
from dotenv import load_dotenv

load_dotenv()


def get_llm():
    """Create and return a ChatGroq LLM instance."""
    return ChatGroq(
        model="llama-3.1-8b-instant",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.5  # Slightly higher for more creative teaching
    )


def _parsing_error_handler(error) -> str:
    """Give the agent a clear nudge when it produces malformed output."""
    return (
        "I could not parse your last output. You MUST respond in exactly this format:\n"
        "Thought: <your reasoning>\n"
        "Action: <tool_name>\n"
        "Action Input: <input_string>\n\n"
        "OR if you are ready to answer:\n"
        "Thought: I now know the final answer\n"
        "Final Answer: <your answer to the student>\n\n"
        "Try again."
    )


def create_study_agent(vectorstore: Chroma) -> AgentExecutor:
    """
    Create a study agent with tools for adaptive learning.

    Args:
        vectorstore: Chroma vectorstore containing student notes

    Returns:
        Configured AgentExecutor ready for use
    """
    # Set the global vectorstore for tools to access
    set_vectorstore(vectorstore)

    llm = get_llm()

    # Define tools for the agent
    tools = [
        Tool(
            name="retrieve_from_notes",
            func=retrieve_from_notes.invoke,
            description=(
                "Search and retrieve relevant content from the student's uploaded study materials. "
                "Input should be a search query string about the topic you want to find."
            )
        ),
        Tool(
            name="ask_student_question",
            func=ask_student_question.invoke,
            description=(
                "Generate a comprehension question on a given topic. "
                "Input should be just the topic name as a string."
            )
        ),
        Tool(
            name="log_weak_topic",
            func=log_weak_topic.invoke,
            description=(
                "Record that a student is struggling with a topic for later review. "
                "Input should be the topic name as a string."
            )
        ),
        Tool(
            name="suggest_next_topic",
            func=suggest_next_topic.invoke,
            description=(
                "Recommend the next topic to study. "
                "Input should be a string like: 'completed: Topic A, Topic B | weak: Topic C'"
            )
        ),
        Tool(
            name="summarize_progress",
            func=summarize_progress.invoke,
            description=(
                "Create a summary of the learning session. "
                "Input should be a string like: 'topics: Topic A, Topic B | minutes: 30'"
            )
        ),
    ]

    system_prompt = PromptTemplate.from_template(
"""You are an adaptive study tutor for students. Your responses must be SHORT, CLEAR, and ENGAGING.

RESPONSE FORMAT RULES (follow strictly):
- Use **bold** for key terms only
- Use bullet points (- item) for lists of facts or steps — never long paragraphs
- Keep each bullet to ONE sentence max
- If explaining a concept: give a 1-2 sentence summary, then 3-4 bullets MAX
- If asking a question: ask ONE clear question, keep it short
- NEVER write walls of text. If your answer exceeds 5 lines, trim it.
- Use 💡 for tips, ✅ for correct answers, ❓ for questions, 📌 for key facts

TOOLS:
- Always use retrieve_from_notes FIRST before answering any topic question
- Each tool input must be a plain string, NOT a dict or JSON

Student Context:
- Completed: {completed_topics}
- Weak areas: {weak_topics}

{tools}

Tool names: {tool_names}

Use EXACTLY this format:

Thought: what I need to do
Action: tool_name_here
Action Input: simple string input
Observation: result
Thought: I now know the final answer
Final Answer: short, structured response using the format rules above

Begin!

Question: {input}
Thought:{agent_scratchpad}"""
    )

    # Create the ReAct agent
    agent = create_react_agent(
        llm=llm,
        tools=tools,
        prompt=system_prompt
    )

    # Wrap in AgentExecutor for better handling
    executor = AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=True,
        max_iterations=6,
        early_stopping_method="generate",
        handle_parsing_errors=_parsing_error_handler,
        return_intermediate_steps=True
    )

    return executor


async def _fallback_rag_response(
    user_message: str,
    vectorstore: Chroma,
    student_context: Dict[str, Any]
) -> Tuple[str, List[str], List[Dict[str, Any]]]:
    """
    Direct RAG fallback when the agent loop fails.
    Retrieves relevant content and generates a response without the agent loop.
    """
    try:
        llm = get_llm()

        # Retrieve relevant documents
        retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
        docs = retriever.invoke(user_message)

        context = ""
        if docs:
            context = "\n\n---\n\n".join(
                f"From study materials (page {doc.metadata.get('page', '?')}): {doc.page_content}"
                for doc in docs
            )

        completed = ", ".join(student_context.get("completed_topics", [])) or "None"
        weak = ", ".join(student_context.get("weak_topics", [])) or "None"

        prompt = PromptTemplate(
            template="""You are a helpful study tutor. A student asked the following question/request.
Use the retrieved study material context below to provide a helpful, educational response.

Student's completed topics: {completed}
Student's weak topics: {weak}

Retrieved Study Material:
{context}

Student's message: {question}

Provide a clear, well-structured response using markdown formatting. Include:
1. An explanation based on the study materials
2. Key points to remember
3. If appropriate, a practice question to test understanding

Response:""",
            input_variables=["question", "context", "completed", "weak"]
        )

        response = llm.invoke(
            prompt.format(
                question=user_message,
                context=context[:4000] if context else "No study materials found for this query.",
                completed=completed,
                weak=weak
            )
        )

        tools_used = ["retrieve_from_notes"] if docs else []
        return response.content.strip(), tools_used, []

    except Exception as e:
        return f"I'm having trouble accessing your study materials right now. Error: {str(e)}", [], []


async def run_agent_chat(
    user_message: str,
    vectorstore: Chroma,
    chat_history: Optional[List[Dict[str, str]]] = None,
    student_context: Optional[Dict[str, Any]] = None
) -> Tuple[str, List[str], List[Dict[str, Any]]]:
    """
    Run a single turn of agent-based chat.
    Falls back to direct RAG if the agent loop fails.

    Args:
        user_message: The student's input message
        vectorstore: Chroma vectorstore with student notes
        chat_history: Optional list of previous messages
        student_context: Optional dict with completed_topics and weak_topics

    Returns:
        Tuple of (agent_response, tools_used, extracted_data)
    """
    # Initialize student context if not provided
    if student_context is None:
        student_context = {
            "completed_topics": [],
            "weak_topics": []
        }

    try:
        # Create the agent
        agent_executor = create_study_agent(vectorstore)

        # Format the input with context
        formatted_input = _prepare_agent_input(
            user_message,
            chat_history,
            student_context
        )

        # Run the agent
        response = agent_executor.invoke({
            "input": formatted_input,
            "completed_topics": ", ".join(student_context.get("completed_topics", [])) or "None",
            "weak_topics": ", ".join(student_context.get("weak_topics", [])) or "None"
        })

        agent_response = response.get("output", "")

        # Check if the agent actually produced a useful response
        if not agent_response or "Agent stopped" in agent_response or len(agent_response.strip()) < 20:
            print("⚠️ Agent produced weak response, falling back to direct RAG")
            return await _fallback_rag_response(user_message, vectorstore, student_context)

        # Extract tools used and any data to be saved
        tools_used = _extract_tools_used(response)
        extracted_data = _extract_structured_data(agent_response)

        return agent_response, tools_used, extracted_data

    except Exception as e:
        print(f"⚠️ Agent error: {str(e)}, falling back to direct RAG")
        return await _fallback_rag_response(user_message, vectorstore, student_context)


def _prepare_agent_input(
    user_message: str,
    chat_history: Optional[List[Dict[str, str]]],
    student_context: Dict[str, Any]
) -> str:
    """Prepare input message with context for the agent."""
    formatted = user_message

    if chat_history and len(chat_history) > 0:
        # Include recent chat history for context
        recent_history = chat_history[-4:]  # Last 2 turns
        history_text = "\nRecent conversation:\n"
        for msg in recent_history:
            role = msg.get("role", "unknown").upper()
            content = msg.get("content", "")
            history_text += f"{role}: {content}\n"
        formatted = history_text + f"\nStudent: {user_message}"

    return formatted


def _extract_tools_used(response: Dict[str, Any]) -> List[str]:
    """Extract which tools were called during agent execution."""
    tools_used = []

    # Check if response contains agent steps info
    if "intermediate_steps" in response:
        for step in response.get("intermediate_steps", []):
            if isinstance(step, tuple) and len(step) > 0:
                action = step[0]
                if hasattr(action, "tool"):
                    tools_used.append(action.tool)

    return tools_used


def _extract_structured_data(response_text: str) -> List[Dict[str, Any]]:
    """Extract any JSON-formatted data from the response for backend saving."""
    extracted = []

    # Look for JSON objects in the response (from log_weak_topic)
    lines = response_text.split("\n")
    current_json = ""
    in_json = False

    for line in lines:
        if "{" in line:
            in_json = True
        if in_json:
            current_json += line + "\n"
        if "}" in line and in_json:
            try:
                data = json.loads(current_json)
                extracted.append(data)
                current_json = ""
                in_json = False
            except json.JSONDecodeError:
                pass

    return extracted
