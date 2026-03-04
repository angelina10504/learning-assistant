import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.vector_store import load_chroma
from conversational_rag import build_conversational_rag_chain, run_chat_session

# Load existing vectorstore
vectorstore = load_chroma(collection_name="test_collection")

# Build conversational chain
chain, retriever = build_conversational_rag_chain(vectorstore)

# Start interactive chat session
run_chat_session(chain)