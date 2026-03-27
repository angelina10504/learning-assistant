"""
Integration test for the Agentic Study Planner.

This test verifies that all components work together correctly.
Run with: python test_agent_integration.py
"""

import asyncio
import json
from agents.study_agent import create_study_agent
from utils.vector_store import load_chroma


async def test_agent_integration():
    """Test the agent with a sample vectorstore."""
    print("🧪 Testing Agentic Study Planner Integration\n")

    try:
        # Load the default collection
        print("1. Loading vectorstore...")
        vectorstore = load_chroma(collection_name="default")
        print("   ✓ Vectorstore loaded")

        # Create the agent
        print("\n2. Creating study agent...")
        agent = create_study_agent(vectorstore)
        print("   ✓ Agent created with tools:")
        print("     - retrieve_from_notes")
        print("     - ask_student_question")
        print("     - log_weak_topic")
        print("     - suggest_next_topic")
        print("     - summarize_progress")

        # Test agent with a sample message
        print("\n3. Testing agent with sample query...")
        test_message = "What are the main topics covered in my notes?"

        response = agent.invoke({
            "input": test_message,
            "completed_topics": "None",
            "weak_topics": "None"
        })

        print(f"\n   Input: {test_message}")
        print(f"\n   Agent Response:\n   {response.get('output', 'No response')}")

        print("\n✅ Integration test passed!")
        return True

    except Exception as e:
        print(f"\n❌ Integration test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_agent_integration())
    exit(0 if success else 1)
