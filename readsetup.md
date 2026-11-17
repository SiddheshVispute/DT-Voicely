# Voicely - Complete Setup & Teammate Onboarding Guide (`readsetup.md`)

Welcome to the team! This document details all recent codebase updates, environment variables configuration, and a complete, step-by-step walkthrough to get **Voicely** running smoothly on your local machine.

---

## 📋 Table of Contents
1. [Overview of Recent Changes](#-overview-of-recent-changes)
2. [System Prerequisites](#-system-prerequisites)
3. [Step-by-Step Setup Guide](#-step-by-step-setup-guide)
   - [Step 1: Clone or Pull Branch](#step-1-clone-or-pull-branch)
   - [Step 2: Environment Configuration (`.env`)](#step-2-environment-configuration-env)
   - [Step 3: Install Dependencies](#step-3-install-dependencies)
   - [Step 4: Running Voicely](#step-4-running-voicely)
4. [Testing & Verification](#-testing--verification)
5. [Architecture & Key Features](#-architecture--key-features)
6. [Troubleshooting Common Issues](#-troubleshooting-common-issues)

---

## 🚀 Overview of Recent Changes

Here is a summary of what has been implemented and modified in the project:

### 1. AI Receptionist Identity & Prompt Generation
- **Receptionist Name Updated to Dhruv**: Transitioned default receptionist name from Mia/Maya to **Dhruv** across UI, transcripts, speech synthesis, and backend system prompts.
- **5-Step Dynamic Business Context**: Voicely now constructs a structured, 5-step system prompt that injects:
  1. Business Overview & Description (new field in Business Profile and Settings)
  2. Complete Service Catalog (names, durations, pricing in ₹)
  3. Frequently Asked Questions (FAQs)
  4. Operating Hours, Timezone, and Contact Details
  5. Deterministic tool calling guidelines (`check_availability`, `create_appointment`, `create_lead`)
- **Copy Prompt for Vapi**: Added a 1-click button in **Settings** and **Onboarding** to copy the generated system prompt directly for pasting into your Vapi dashboard.

### 2. Voice & Audio Enhancements (`src/services/`)
- **Bidirectional Volume Metering**: Real-time microphone audio visualizer in `speech.js` using `AudioContext` and frequency analysis.
- **Vapi Web SDK Integration (`vapiVoice.js`)**:
  - Full listener pipeline tracking connection, audio playback, speaking status, and errors.
  - Multi-alias tool resolution supporting `check_availability`, `check_schedule`, `create_appointment`, `book_appointment`, `create_lead`, and `cancel_appointment`.
  - **Post-Conversation Auto-Booking**: If a customer confirms an appointment during a phone/web voice conversation but function calling did not trigger mid-stream, Voicely parses the final transcript at call teardown and automatically books the appointment and logs the call summary.

### 3. Backend Server & Middleware (`server.js` & `src/server/vapiMiddleware.js`)
- **Native `.env` Loader**: Automatic loading using Node.js `process.loadEnvFile()`.
- **CORS Support**: Configurable CORS for cross-origin API integration.
- **Health & Info Endpoints**:
  - `GET /health`: Server health check, uptime, and timestamp.
  - `GET /api/info`: Live status of backend, Vapi configuration, and Supabase connection.
  - `POST /api/vapi/webhook`: Webhook endpoint for Vapi telephony calls.
  - `POST /api/vapi/tools`: Tool-call dispatcher for assistants.
- **SPA Fallback**: Production server serves static Vite frontend from `dist/` with fallback to `index.html`.

### 4. Normalized Booking Pipeline (`src/domain/actions.js`)
- Added `normalizeBookingInput`:
  - Intelligent service resolution by ID or fuzzy name match.
  - Natural language relative date parsing (`"today"`, `"tomorrow"`, `"day after tomorrow"`, weekday names like `"Thursday"`).
  - Flexible 12-hour AM/PM to 24-hour time normalization (e.g. `"2 PM"` or `"10:30 am"` → `"14:00"`, `"10:30"`).

### 5. Automated Vitest Suite (`tests/vapi-context-booking.test.js`)
- 61 unit and integration tests passing across 8 test suites.
- Validates prompt construction, tool execution, transcript extraction, and local repository persistence.

---

## 💻 System Prerequisites

Before starting, ensure your system meets these requirements:

| Component | Minimum Version | Recommended Version | Verification Command |
|-----------|-----------------|---------------------|----------------------|
| **Node.js** | `>= 22.12.0` | Node 22 LTS or Node 24 LTS | `node -v` |
| **npm** | `>= 10.0.0` | Latest LTS (`npm.cmd` on Win) | `npm -v` |
| **Git** | `>= 2.30.0` | Latest | `git --version` |

> ⚠️ **Important for Node.js:** Node version **22.12 or newer** is required because Voicely uses native `process.loadEnvFile()` in `server.js` and modern ECMAScript module features.

---

## 🛠️ Step-by-Step Setup Guide

Follow these steps when pulling the project on your machine:

### Step 1: Clone or Pull Branch

If you are cloning for the first time:
```bash
git clone https://github.com/SiddheshVispute/DT-Voicely.git
cd DT-Voicely
```

If you already cloned the repository, fetch the new branch and check it out:
```bash
git fetch origin
git checkout feat/vapi-integration-setup-guide
git pull origin feat/vapi-integration-setup-guide
```

---

### Step 2: Environment Configuration (`.env`)

Voicely includes a pre-configured `.env.example` file that tracks all necessary variables.

1. **Create your `.env` file** by copying `.env.example`:

   - **Windows (PowerShell):**
     ```powershell
     Copy-Item .env.example .env
     ```
   - **Windows (Command Prompt):**
     ```cmd
     copy .env.example .env
     ```
   - **macOS / Linux:**
     ```bash
     cp .env.example .env
     ```

2. **Understand the Environment Variables**:

   ```env
   # =============================================================================
   # Voicely Environment Configuration
   # =============================================================================

   # Backend Server Configuration
   PORT=3000
   HOST=127.0.0.1
   NODE_ENV=development
   CORS_ORIGIN=*

   # -----------------------------------------------------------------------------
   # Supabase Cloud Database (Optional)
   # If left blank, Voicely runs in full local Demo Mode (IndexedDB / localStorage)
   # -----------------------------------------------------------------------------
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=

   # -----------------------------------------------------------------------------
   # Vapi AI Voice Receptionist (Optional)
   # -----------------------------------------------------------------------------
   VITE_VAPI_PUBLIC_KEY=
   VITE_VAPI_ASSISTANT_ID=
   ```

   - **Backend Settings**: `PORT=3000`, `HOST=127.0.0.1`.
   - **Supabase (Optional)**: If you leave `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` blank, Voicely automatically boots in **Demo Mode**. All appointments, settings, and logs are persisted locally in your browser (LocalStorage / IndexedDB with Web Locks concurrency). No external database setup is required!
   - **Vapi AI Voice**: For browser voice, use your public client key and assistant ID from [dashboard.vapi.ai](https://dashboard.vapi.ai). You can also enter them in **Settings → Integrations**.

---

### Step 3: Install Dependencies

Run the dependency installation:

- **Windows PowerShell Note**: If PowerShell blocks script execution (`PSSecurityException` for `npm.ps1`), use `npm.cmd`:
  ```powershell
  npm.cmd install
  ```
- **macOS / Linux / Command Prompt**:
  ```bash
  npm install
  ```

---

### Step 4: Running Voicely

You can run Voicely in two different modes depending on your workflow:

#### Option A: Dual-Server Development Mode (Recommended for Development)

In this mode, Vite provides instant Hot Module Replacement (HMR) for frontend development, and Express powers the backend API.

1. **Terminal 1 (Backend Server)**:
   ```powershell
   # Windows PowerShell
   npm.cmd start
   # or node server.js

   # macOS / Linux
   npm start
   ```
   *The backend starts at `http://localhost:3000`.*
   - Health check: `http://localhost:3000/health`
   - API info: `http://localhost:3000/api/info`

2. **Terminal 2 (Frontend Vite Dev Server)**:
   ```powershell
   # Windows PowerShell
   npm.cmd run dev

   # macOS / Linux
   npm run dev
   ```
   *The frontend starts at `http://127.0.0.1:5188`.* Open this link in your browser!

#### Option B: Production Server Mode (Single Server)

Build the static frontend and let Express serve both the frontend and API from a single port:

```powershell
# 1. Build the frontend bundle
npm.cmd run build

# 2. Start the Express server
npm.cmd start
```
*Open `http://localhost:3000` in your browser.* Express automatically serves the built assets from `dist/`.

#### Option C: Windows 1-Click Launcher

If you are on Windows, simply double-click:
```
start-voicely.cmd
```
It will verify dependencies and open the application in your default browser.

---

## 🧪 Testing & Verification

Run the automated test suite to verify everything works properly on your setup:

```powershell
# Unit & integration tests (Vitest)
npm.cmd test

# End-to-end browser journey tests (Playwright)
npm.cmd run test:e2e

# Real model + synthetic mic test
npm.cmd run test:voice
```

You should see:
```text
✓ tests/localVoice.test.js
✓ tests/speech.test.js
✓ tests/conversation-voice.test.js
✓ tests/vapi-context-booking.test.js
✓ tests/booking.test.js
✓ tests/persistence.test.js
✓ tests/conversation.test.js
✓ tests/database.test.js

Test Files  8 passed (8)
     Tests  61 passed (61)
```

---

## 📂 Architecture Overview

```text
DT-Voicely/
├── .env.example             # Template for all environment variables (tracked in git)
├── .env                     # Your local env file (gitignored)
├── readsetup.md             # This setup guide
├── server.js                # Express backend & static server
├── index.html               # Main entry HTML
├── vite.config.js           # Vite configuration & plugins
├── package.json             # Scripts & dependencies
├── src/
│   ├── components/          # Reusable UI & LiveCallModal
│   ├── pages/               # Landing, Onboarding, Agent, Settings, etc.
│   ├── domain/              # Pure business logic:
│   │   ├── actions.js       # Booking input normalizer & tool executors
│   │   ├── booking.js       # Appointment validation & slot calculations
│   │   ├── config.js        # Business profile configuration
│   │   ├── conversation.js  # Dialogue state machine & transcript parser
│   │   └── time.js          # Timezone and date helpers
│   ├── data/                # Persistence layer:
│   │   ├── localRepository.js     # Browser local demo persistence (Web Locks)
│   │   └── supabaseRepository.js  # Optional Supabase cloud integration
│   ├── services/            # Audio & voice integrations:
│   │   ├── speech.js        # Browser Web Speech API & volume meter
│   │   └── vapiVoice.js     # Vapi AI SDK wrapper & prompt builder
│   ├── server/
│   │   └── vapiMiddleware.js # Express middleware for tools & webhooks
│   └── state/               # AppContext global React state
└── tests/                   # Vitest unit & integration tests
```

---

## ❓ Troubleshooting Common Issues

### 1. `npm : File ... npm.ps1 cannot be loaded because running scripts is disabled`
- **Cause**: Windows PowerShell default Execution Policy blocks execution of unsigned `.ps1` scripts.
- **Solution**:
  - Always use `npm.cmd` instead of `npm` in PowerShell:
    ```powershell
    npm.cmd install
    npm.cmd run dev
    ```
  - Or enable execution policy for your current user:
    ```powershell
    Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
    ```

### 2. Node Version Incompatibility
- **Symptom**: Syntax errors or `process.loadEnvFile is not a function`.
- **Cause**: Node.js is older than `22.12.0`.
- **Solution**: Update Node.js to Node 22 LTS or Node 24 LTS via [nodejs.org](https://nodejs.org/) or `nvm` / `winget install OpenJS.NodeJS.LTS`.

### 3. Port Already in Use (`EADDRINUSE: 3000` or `5188`)
- **Backend (Port 3000)**: Edit `PORT=3001` in your `.env` file and restart `server.js`.
- **Frontend (Port 5188)**: Change `--port 5189` in `package.json` under `"scripts" -> "dev"`.

### 4. Microphone / Voice Permissions Blocked
- Ensure your browser has permitted microphone access on `http://127.0.0.1:5188` or `http://localhost:3000`.
- If testing in Chrome, navigate to `chrome://settings/content/microphone` to verify localhost is allowed.

### 5. Switching between Demo Mode and Supabase
- Voicely works out of the box with zero external configuration using **Demo Mode**.
- To connect a cloud Supabase database, paste your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` (or via the **Settings** page in the UI) and restart the dev server.

---

🎉 You are now fully set up! If you have any questions or encounter any issues, reach out to the team or check `README.md`.
