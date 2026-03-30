"""
Agentic Study Planner using LangChain ReAct pattern.

This module implements an intelligent study agent that can:
- Retrieve information from student notes
- Generate comprehension questions
- Track weak areas
- Recommend next topics
- Summarize learning progress

The agent uses the ReAct (Reasoning + Acting) pattern for interpretability.
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
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.5  # Slightly higher for more creative teaching
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
            description=retrieve_from_notes.description or
                "Search and retrieve relevant content from the student's notes based on a query"
        ),
        Tool(
            name="ask_student_question",
            func=ask_student_question.invoke,
            description=ask_student_question.description or
                "Generate a comprehension question on a given topic at specified difficulty level"
        ),
        Tool(
            name="log_weak_topic",
            func=log_weak_topic.invoke,
            description=log_weak_topic.description or
                "Record that a student is struggling with a topic for later review"
        ),
        Tool(
            name="suggest_next_topic",
            func=suggest_next_topic.invoke,
            description=suggest_next_topic.description or
                "Recommend the next topic to study based on completed and weak topics"
        ),
        Tool(
            name="summarize_progress",
            func=summarize_progress.invoke,
            description=summarize_progress.description or
                "Create a summary of the learning session"
        ),
    ]

    # Define the system prompt for the agent
    # LangChain's create_react_agent requires: {tools}, {tool_names}, {agent_scratchpad}, {input}
    system_prompt = PromptTemplate.from_template("""You are an adaptive study planner agent designed to help students learn effectively.

Your role is to:
1. Understand what the student wants to learn or review
2. Retrieve relevant material from their notes using the retrieve_from_notes tool
3. Ask clarifying or comprehension questions to gauge understanding
4. Identify areas where the student struggles and log them with log_weak_topic
5. Recommend next topics strategically using suggest_next_topic
6. Provide periodic summaries of progress with summarize_progress

Teaching Strategy:
- Start by understanding what topic the student wants to focus on
- Retrieve relevant material to refresh their knowledge
- Ask targeted questions to assess comprehension
- Be encouraging and adaptive - adjust difficulty based on student responses
- When a student struggles, log the weak area and suggest related material for review
- Make learning efficient by building on completed knowledge

Student Context:
- Completed Topics: {completed_topics}
- Weak Topics (need review): {weak_topics}

Always maintain a supportive tone and break complex topics into digestible pieces.
Use the tools strategically - don't overuse them. Think about what the student needs most right now.

You have access to the following tools:

{tools}

Tool names: {tool_names}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
Thought:{agent_scratchpad}""")

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
        verbose=False,  # Set to True for debugging
        max_iterations=10,  # Prevent infinite loops
        early_stopping_method="force"  # Stop gracefully if max iterations reached
    )

    return executor


async def run_agent_chat(
    user_message: str,
    vectorstore: Chroma,
    chat_history: Optional[List[Dict[str, str]]] = None,
    student_context: Optional[Dict[str, Any]] = None
) -> Tuple[str, List[str], List[Dict[str, Any]]]:
    """
    Run a single turn of agent-based chat.

    Args:
        user_message: The student's input message
        vectorstore: Chroma vectorstore with student notes
        chat_history: Optional list of previous messages
        student_context: Optional dict with completed_topics and weak_topics

    Returns:
        Tuple of (agent_response, tools_used, extracted_data)
    """
    try:
        # Initialize student context if not provided
        if student_context is None:
            student_context = {
                "completed_topics": [],
                "weak_topics": []
            }

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

        agent_response = response.get("output", "I encountered an error processing your request.")

        # Extract tools used and any data to be saved
        tools_used = _extract_tools_used(response)
        extracted_data = _extract_structured_data(agent_response)

        return agent_response, tools_used, extracted_data

    except Exception as e:
        error_msg = f"Error running agent: {str(e)}"
        return error_msg, [], []


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
