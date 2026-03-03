import os
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from dotenv import load_dotenv

load_dotenv()

CHROMA_PATH = os.getenv("CHROMA_PATH", "./vectorstore")

def get_embedding_model():
    return HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2"
    )

def store_chunks_in_chroma(chunks, collection_name: str = "default"):
    embeddings = get_embedding_model()

    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        collection_name=collection_name,
        persist_directory=CHROMA_PATH
    )

    print(f"✅ Stored {len(chunks)} chunks in Chroma")
    print(f"✅ Collection: {collection_name}")
    print(f"✅ Persisted at: {CHROMA_PATH}")

    return vectorstore


def load_chroma(collection_name: str = "default"):
    embeddings = get_embedding_model()

    vectorstore = Chroma(
        collection_name=collection_name,
        embedding_function=embeddings,
        persist_directory=CHROMA_PATH
    )

    return vectorstore