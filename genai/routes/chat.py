from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from langchain_core.messages import HumanMessage, AIMessage
from chains.conversational_rag import build_conversational_rag_chain
from utils.vector_store import load_chroma

router = APIRouter()


# Define what the request body looks like
class ChatMessage(BaseModel):
    role: str        # "human" or "ai"
    content: str


class ChatRequest(BaseModel):
    question: str
    collection_name: str = "default"
    chat_history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    answer: str
    sources: List[dict]


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Load the correct vectorstore for this user's documents
        vectorstore = load_chroma(collection_name=request.collection_name)

        # Build the chain
        chain, retriever = build_conversational_rag_chain(vectorstore)

        # Convert chat history from request format to LangChain format
        history = []
        for msg in request.chat_history:
            if msg.role == "human":
                history.append(HumanMessage(content=msg.content))
            else:
                history.append(AIMessage(content=msg.content))

        # Get answer
        answer = chain.invoke({
            "question": request.question,
            "chat_history": history
        })

        # Get source documents
        source_docs = retriever.invoke(request.question)
        sources = [
            {
                "page": doc.metadata.get("page", "?"),
                "source": doc.metadata.get("source", "?"),
                "content_preview": doc.page_content[:150]
            }
            for doc in source_docs
        ]

        return ChatResponse(answer=answer, sources=sources)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))