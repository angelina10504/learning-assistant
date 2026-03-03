import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.pdf_ingestion import load_and_split_pdf
from utils.vector_store import store_chunks_in_chroma, load_chroma
import shutil

# Force clean slate - delete old vectorstore
if os.path.exists("./vectorstore"):
    shutil.rmtree("./vectorstore")
    print("🗑️  Cleared old vectorstore")

# Step 1: Load and split
chunks = load_and_split_pdf("test.pdf")
print(f"\nTotal chunks: {len(chunks)}")

# Step 2: Store in Chroma
vectorstore = store_chunks_in_chroma(chunks, collection_name="test_collection")

# Step 3: Test similarity search
print("\n--- Testing Similarity Search ---")
query = "What is the attention mechanism?"
results = vectorstore.similarity_search(query, k=3)

for i, doc in enumerate(results):
    print(f"\n📄 Result {i+1} (Page {doc.metadata.get('page', '?')}):")
    print(doc.page_content[:300])