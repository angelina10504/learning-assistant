import re
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter


def clean_text(text: str) -> str:
    # Remove <pad>, <EOS>, and other token artifacts
    text = re.sub(r'<[^>]+>', '', text)
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def is_noisy_chunk(text: str) -> bool:
    # Calculate ratio of single-char tokens (sign of broken PDF text)
    words = text.split()
    if not words:
        return True
    single_chars = sum(1 for w in words if len(w) <= 2)
    ratio = single_chars / len(words)
    # If more than 30% of words are 1-2 chars, it's a noisy chunk
    return ratio > 0.3


def load_and_split_pdf(file_path: str):
    loader = PyPDFLoader(file_path)
    documents = loader.load()

    print(f"✅ Loaded {len(documents)} pages from PDF")

    for doc in documents:
        doc.page_content = clean_text(doc.page_content)

    documents = [doc for doc in documents if len(doc.page_content) > 100]
    print(f"✅ Kept {len(documents)} pages after cleaning")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ".", " ", ""]
    )

    chunks = splitter.split_documents(documents)

    # Filter short chunks AND noisy chunks
    clean_chunks = [
        c for c in chunks
        if len(c.page_content.strip()) > 50 and not is_noisy_chunk(c.page_content)
    ]

    print(f"✅ Split into {len(clean_chunks)} clean chunks")

    if len(clean_chunks) > 0:
        print("\n--- Sample Chunk ---")
        print(clean_chunks[0].page_content)
        print("\n--- Chunk Metadata ---")
        print(clean_chunks[0].metadata)

    return clean_chunks