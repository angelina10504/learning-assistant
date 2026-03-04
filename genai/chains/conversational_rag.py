import os
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage
from dotenv import load_dotenv

load_dotenv()


def get_llm():
    return ChatGroq(
        model="llama-3.1-8b-instant",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.3
    )


def build_conversational_rag_chain(vectorstore):
    llm = get_llm()
    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

    # This prompt is different from before
    # It now includes chat_history as a placeholder
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a helpful study assistant. 
        Use the following context from the student's study material to answer their question.
        If the answer is not in the context, say "I couldn't find this in your notes."
        
        Context:
        {context}"""),
        MessagesPlaceholder(variable_name="chat_history"),  # ← memory goes here
        ("human", "{question}")
    ])

    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    # Chain that takes question + history, retrieves, then answers
    chain = (
        {
            "context": lambda x: format_docs(retriever.invoke(x["question"])),
            "chat_history": lambda x: x["chat_history"],
            "question": lambda x: x["question"]
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    return chain, retriever


def run_chat_session(chain):
    """
    Simulates a multi-turn chat session with memory
    """
    chat_history = []  # stores the conversation so far

    print("\n🎓 Study Assistant Ready! Type 'quit' to exit.\n")

    while True:
        question = input("You: ").strip()

        if question.lower() == 'quit':
            print("Goodbye! Keep studying! 👋")
            break

        if not question:
            continue

        # Pass both question AND full chat history to the chain
        response = chain.invoke({
            "question": question,
            "chat_history": chat_history
        })

        print(f"\n🤖 Assistant: {response}\n")

        # Update chat history with this turn
        chat_history.append(HumanMessage(content=question))
        chat_history.append(AIMessage(content=response))