import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv()

def get_llm():
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.3
    )

def build_rag_chain(vectorstore):
    llm = get_llm()

    prompt_template = PromptTemplate(
        template="""
        You are a helpful study assistant. Use the following context from the 
        student's study material to answer their question accurately.
        
        If the answer is not found in the context, say 
        "I couldn't find this in your notes" — do not make up an answer.
        
        Context:
        {context}
        
        Question: {question}
        
        Answer:
        """,
        input_variables=["context", "question"]
    )

    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

    def format_docs(docs):
        # joins all retrieved chunks into one string for the prompt
        return "\n\n".join(doc.page_content for doc in docs)

    # Modern LangChain uses LCEL (LangChain Expression Language)
    # Read left to right: retrieve → format → prompt → LLM → parse
    chain = (
        {
            "context": retriever | format_docs,
            "question": RunnablePassthrough()
        }
        | prompt_template
        | llm
        | StrOutputParser()
    )

    return chain, retriever