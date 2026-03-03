import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.vector_store import load_chroma
from rag_chain import build_rag_chain

vectorstore = load_chroma(collection_name="test_collection")
chain, retriever = build_rag_chain(vectorstore)

query = "What is the attention mechanism and how does it work?"
print(f"\n🔍 Question: {query}\n")

# Get answer
answer = chain.invoke(query)
print(f"💡 Answer:\n{answer}")

# Get source documents separately
print(f"\n📄 Sources:")
docs = retriever.invoke(query)
for doc in docs:
    print(f"  - Page {doc.metadata.get('page', '?')}: {doc.page_content[:100]}...")