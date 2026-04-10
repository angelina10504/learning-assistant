# 🎓 AGENTIC STUDY PLANNER

An intelligent, agent-driven learning ecosystem built with the **MERN stack**, **FastAPI**, and **LangChain**. This project transforms static course materials into interactive, adaptive learning journeys using state-of-the-art **Retrieval-Augmented Generation (RAG)**.

---

## 🚀 Key Features

### 👨‍🎓 For Students: Adaptive Learning Journey
- **✅ AI Diagnostic Assessment:** Start each class with a smart pre-assessment that gauges your prior knowledge to tailor your roadmap.
- **✅ Dynamic Study Roadmaps:** Automated study plans that sequence topics logically, complete with estimated durations and difficulty scoring.
- **✅ Agentic RAG Study Sessions:** Chat with a dedicated AI tutor that has deep knowledge of your specific course materials.
- **✅ Interactive Retrieval Tools:** The AI agent can search your notes, generate practice questions, and summarize your progress on the fly.
- **✅ Adaptive Final Quizzes:** Test your mastery with quizzes that provide immediate, contextual feedback and explanations for every answer.
- **✅ Insightful Progress Tracking:** A personalized dashboard tracking your study hours, confidence trends, and learning streaks.

### 👩‍🏫 For Teachers: Command & Control
- **✅ Unified Class Management:** Effortlessly manage student rosters and course materials across multiple classes.
- **✅ Advanced Performance Analytics:** Real-time visibility into class-wide completion rates, average confidence scores, and identified weak topics.
- **✅ Material Vectorization:** Automated ingestion pipeline that transforms PDFs and documents into searchable vector embeddings.
- **✅ Secure Inline Preview:** View and manage course materials directly within the dashboard using our secure file streaming system.
- **✅ Insight Exports:** Download detailed student performance data as CSVs for external reporting and analysis.
- **✅ Smart Intervention Alerts:** Proactive identification of students who may be falling behind based on engagement metrics.

---

## 🛠️ Technical Architecture

### Tech Stack
- **Frontend:** React, Tailwind CSS, Framer Motion (Animations), Lucide React (Icons), Axios.
- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT Auth.
- **GenAI Engine:** Python, FastAPI, LangChain, ChromaDB (Vector Store).
- **LLM Context:** Llama-3-70b (via Groq), HuggingFace Embeddings (`all-MiniLM-L6-v2`).

### Core Design Patterns
1. **Per-Entity Isolation:** Each class/student pair operates within its own vector collection for enhanced privacy and retrieval precision.
2. **ReAct Agent Logic:** The study agent utilizes a "Thought-Action-Observation" pattern to intelligently select tools like document search or quiz generation.
3. **Structured Metadata Bridge:** A seamless data flow between the Python GenAI engine and the Node.js backend for persisting student insights.

---

## 🔧 Setup & Installation

### 1. Backend (Node.js)
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 2. Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

### 3. GenAI Service (Python)
```bash
cd genai
python -m venv venv
source venv/bin/activate # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```

---

## 📄 Environment Configuration

**backend/.env.example**
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
GENAI_URL=http://localhost:8000
```

**genai/.env.example**
```env
GROQ_API_KEY=your_groq_api_key
CHROMA_PATH=./vectorstore
```
