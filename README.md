# ChatX - AI Chatbot with PDF RAG (Week 2)

A premium AI-powered chatbot application featuring real-time streaming chat and a PDF-based Retrieval-Augmented Generation (RAG) system.

## 🚀 Features

### **AI Chat & Streaming**
- **Real-time Streaming**: Integrated SSE (Server-Sent Events) for ChatGPT-like token-by-token responses.
- **Advanced GenAI**: Powered by Google's Gemini Flash models via the unified SDK.
- **Session Management**: Automated conversation tracking with session persistence in Supabase.

### **PDF RAG (Retrieval-Augmented Generation)**
- **Document Processing**: Custom PDF parsing and chunking logic.
- **Vector Embeddings**: Generates high-dimensional embeddings for document chunks.
- **Supabase Vector Store**: Stores chunks and embeddings in Supabase with pgvector for semantic search.
- **Context-Aware Responses**: AI answers questions specifically about uploaded documents with source citations.

### **Premium UI/UX**
- **Clean Interface**: Minimalist, modern design focused on interaction.
- **Chat History Sidebar**: Persistent sidebar to access and load past conversations.
- **File Management**: "Document Mode" with file pills and upload progress indicators.
- **Source Transparency**: Direct citations of document parts used in AI answers.

## 🛠 Tech Stack

- **Backend**: Node.js, Express, TypeScript, Supabase (PostgreSQL + pgvector).
- **Frontend**: React, Vite, TypeScript, Vanilla CSS.
- **AI/LLM**: Google Generative AI (Gemini), Gemini Embeddings.
- **Validation & Tools**: Zod, Multer, PDF-Parse, Turbo.

## ⚙️ Environment Variables

Create a `.env` file in the `backend` directory:

```env
PORT=3000
GEMINI_API_KEY=your_gemini_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🚥 API Documentation (v2)

### **AI Operations**
- `POST /api/v2/ai/conversation`: Initialize a new chat session.
- `POST /api/v2/ai/upload`: Upload and index a PDF document.
- `GET /api/v2/ai/ask`: Ask a question about the uploaded document (RAG).
- `GET /api/v2/ai/sessions`: List all previous chat sessions.
- `GET /api/v2/ai/sessions/:id/messages`: Retrieve message history for a specific session.

## 📦 Getting Started

1. **Install Root Dependencies**:
   ```bash
   npm install
   ```

2. **Run Application**:
   ```bash
   # Run both backend and frontend in dev mode
   npm run dev
   ```

## ✅ Project Status: Assignment Completed
All requirements for the AI Chatbot and PDF RAG assignment have been implemented, including repository pattern refactoring, v2 API namespace, and a full-featured React UI.
