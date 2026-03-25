# AI Chatbot Backend - Week 1

A robust Node.js + Express backend service integrated with Google's GenAI SDK (Gemini) to provide an AI-powered chat endpoint.

## 🚀 Features (Week 1 — LLM Basics)

- **RESTful API**: Exposes a `POST /api/chat` endpoint.
- **LLM Integration**: Powered by `gemini-2.5-flash` via the `@google/genai` SDK.
- **System Prompt**: Configured with a default persona ("You are a helpful coding assistant").
- **Dynamic Control**: Supports custom `temperature` (0.0–1.0) and `max_tokens` (capped at 500).
- **Input Validation**: Uses **Zod** for strict request body validation (400 Bad Request on missing message).
- **Security**: Environment variables managed via `.env` (API keys are never hardcoded).
- **Comprehensive Response**: Returns generated reply along with usage metadata (token counts) and finish reasons.

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **LLM SDK**: `@google/genai` (Google Unified GenAI SDK)
- **Validation**: Zod
- **Build Tool**: Turbo + TSC

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

## 🚥 API Documentation

### **Start Chat**
`POST /api/chat`

**Request Body:**
```json
{
  "message": "Write a function to find the max value in an array.",
  "temperature": 0.7
}
```

**Response Body:**
```json
{
  "data": {
    "reply": "You can use Math.max() with the spread operator...",
    "model": "gemini-3.0-flash",
    "usage": {
      "input_tokens": 12,
      "output_tokens": 45,
      "tokens_used": 57
    },
    "finish_reason": "STOP",
    "temperature": 0.7
  }
}
```

## 📦 Getting Started

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Run in development mode** (hot-reloading):
    ```bash
    npm run dev
    ```
3.  **Build and Start**:
    ```bash
    npm run build
    npm start
    ```

## ✅ Status: Week 1 Completed
All assignment requirements for Week 1 have been implemented and tested, including API integration, prompt structuring, and error handling.
