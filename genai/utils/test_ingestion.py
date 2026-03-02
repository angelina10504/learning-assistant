from pdf_ingestion import load_and_split_pdf

# Put any PDF in your genai folder temporarily for testing
chunks = load_and_split_pdf("test.pdf")

print(f"\nTotal chunks: {len(chunks)}")