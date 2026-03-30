from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.upload import router as upload_router
from routes.chat import router as chat_router
from routes.agent import router as agent_router

app = FastAPI(title="Learning Assistant GenAI API")

# Allow requests from Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(upload_router, prefix="/upload", tags=["Upload"])
app.include_router(chat_router, prefix="/chat", tags=["Chat"])
app.include_router(agent_router, prefix="/agent", tags=["Agent"])


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "GenAI server is running"}