import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException
from utils.pdf_ingestion import load_and_split_pdf
from utils.vector_store import store_chunks_in_chroma

router = APIRouter()

UPLOAD_DIR = "./temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/")
async def upload_pdf(
    file: UploadFile = File(...),
    collection_name: str = "default"
):
    # Validate file type
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # Save uploaded file temporarily
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print(f"📁 Saved: {file.filename}")

        # Run through our RAG ingestion pipeline
        chunks = load_and_split_pdf(file_path)
        store_chunks_in_chroma(chunks, collection_name=collection_name)

        return {
            "message": "PDF uploaded and ingested successfully",
            "filename": file.filename,
            "chunks_created": len(chunks),
            "collection": collection_name
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Clean up temp file after ingestion
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"🗑️  Cleaned up temp file: {file.filename}")