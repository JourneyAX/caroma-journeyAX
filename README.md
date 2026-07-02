# Caroma JourneyAX - Bathroom Configurator POC

An AI-powered, conversational bathroom configurator built for Caroma. This Proof of Concept (POC) guides users through a seamless, end-to-end journey—from initial design and product selection to troubleshooting and generating a final quote—all driven by a dynamic, context-aware AI architecture.

## 🚀 Key Features

*   **Conversational UI Routing:** The AI acts as the orchestrator, instantly adapting the right-hand panel (Clarify, Products, Guide, Quote) based on the user's intent without requiring page reloads.
*   **Intelligent Knowledge Retrieval (RAG):** Powered by MongoDB Atlas Vector Search, the AI grounds every recommendation, price, and installation guide in actual Caroma product data to prevent hallucinations.
*   **Multi-Persona Execution:** The AI dynamically switches between acting as a Store Stylist (recommending matching collections like Liano or Luna) and a Plumber (diagnosing leaks and providing installation checklists).
*   **Real-time Quoting & BOM:** Automatically compiles the user's selections, adds mandatory installation parts, and generates a structured Bill of Materials (BOM) with live pricing.

## 🛠 Tech Stack

*   **Framework:** Next.js (App Router) + React
*   **AI Orchestration:** Vercel AI SDK
*   **LLM Provider:** OpenAI (`gpt-4o` / `gpt-4o-mini`)
*   **Database & Vector Search:** MongoDB Atlas
*   **Styling:** Vanilla CSS (custom `globals.css` with responsive, modern styling)
*   **Language:** TypeScript

## 🏗 Getting Started (Local Development)

### Prerequisites
*   Node.js v18+
*   MongoDB Atlas Cluster (with Vector Search index configured)
*   OpenAI API Key

### 1. Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/JourneyAX/caroma-journeyAX.git
cd caroma-journeyAX/journeyx-app
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root of `journeyx-app` and add your secret keys:
```env
OPENAI_API_KEY="sk-your-openai-api-key"
MONGODB_URI="mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority"
```

### 3. Run the Development Server
Start the Next.js local server:
```bash
npm run dev
```
Open [http://localhost:3008](http://localhost:3008) in your browser to start the conversation!

## ☁️ Deployment (Vercel)

This application is fully optimized for Vercel deployment.

1. Push your code to GitHub.
2. Go to the [Vercel Dashboard](https://vercel.com/new) and click **Add New** -> **Project**.
3. Import this repository.
4. Expand the **Environment Variables** section and add `OPENAI_API_KEY` and `MONGODB_URI`.
5. Click **Deploy**.

## 📁 Repository Structure
*   `src/app/page.tsx`: The main application shell layout.
*   `src/app/api/chat/route.ts`: The core AI Orchestrator prompt and tool definitions.
*   `src/components/panels/`: The dynamic UI panels (Hero, Clarify, Products, Guide, Quote).
*   `src/context/JourneyContext.tsx`: The global state manager that tracks the user's phase, selections, and quotes.
*   `src/services/knowledge/`: Ingestion, chunking, and MongoDB Vector Search logic.

---
*Built as a Proof of Concept by JourneyAX.*
