from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter


def load_and_split_pdf(file_path: str):
    # Step 1: Load the PDF
    loader = PyPDFLoader(file_path)
    documents = loader.load()

    print(f"✅ Loaded {len(documents)} pages from PDF")

    # Step 2: Split into chunks
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ".", " ", ""]
    )

    chunks = splitter.split_documents(documents)

    print(f"✅ Split into {len(chunks)} chunks")

    # Step 3: Inspect a chunk so you can see what it looks like
    print("\n--- Sample Chunk ---")
    print(chunks[0].page_content)
    print("\n--- Chunk Metadata ---")
    print(chunks[0].metadata)

    return chunks
