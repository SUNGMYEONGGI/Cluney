# 🎓 Cluney Math Tutor

Cluney is an interactive AI math tutor built with **Next.js 15**, **Gemini 3.1**, and the **Vercel AI SDK**. It helps students solve math problems through problem-specific chat sessions, supporting both active participation and direct assistance modes.

<img width="800" alt="Cluney Screenshot" src="https://github.com/user-attachments/assets/48817c8b-e0e1-47c1-bbb2-5e9f2327813a" />

## 🌟 Key Features

- **Problem Grid**: Browse and select math problems from a gallery of images.
- **Problem-Specific Chat**: Each problem has its own independent chat history and context.
- **AI Modes**:
  - **Active Mode**: The AI acts as a tutor, guiding the student through hints and questions without giving away the answer immediately.
  - **Passive Mode**: The AI provides direct answers and full solutions for quick learning.
- **Rich Interface**: 
  - Rounded pill-shaped input with attachment support.
  - Math formula rendering (KaTeX/LaTeX).
  - Hover-to-enlarge problem image effect in the sidebar.
- **Persistent History**: Chat logs and sessions are saved locally for review.

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (Latest LTS recommended)
- Google Gemini API Key

### 2. Installation
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
GOOGLE_MODEL=gemini-3.1-flash-lite-preview
```

### 4. Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📂 Project Structure

- `app/`: Next.js App Router (pages and API routes).
- `components/`: UI components (ChatPane, ChatSidebar, ProblemGrid, etc.).
- `lib/ai/`: AI logic, prompt templates (Active/Passive), and prompt builder.
- `data/`: Local storage for chat logs and interactive problem images.
- `public/`: Static assets and the Cluney CI image.

## 🛠 Tech Stack

- **Framework**: Next.js 15
- **AI Integration**: AI SDK (Google Generative AI)
- **Styling**: Tailwind CSS & Shadcn UI
- **Content**: React Markdown, Remark Math, Rehype KaTeX

---
*Created by [SUNGMYEONGGI](https://github.com/SUNGMYEONGGI)*