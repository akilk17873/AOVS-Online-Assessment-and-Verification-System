# AOVS — Online Assessment and Oral Verification System

Next-Generation Online Assessment & Intelligent Verification Platform. Secure, AI-proctored exams with spontaneous oral verification questions, real-time microphone audio capture, Whisper Speech-to-Text transcription, and automated weighted risk scoring.

---

## 📁 Repository Structure

The project is cleanly decoupled into `frontend` and `backend` services:

```text
AOVS/
├── frontend/                  # Client-side web applications & portals
│   ├── Exam/                  # Student Exam & Proctoring UI (Timer, Audio & STT)
│   ├── Instructor/            # Faculty Review Dashboard, Risk Scoring & Grading
│   ├── Student Login/         # College Identity Authentication
│   ├── assets/                # Production CSS & JavaScript bundles
│   ├── audio/                 # Sound assets
│   ├── fonts/                 # Web typography
│   ├── img/                   # Graphic assets & branding
│   ├── videos/                # Multimedia components
│   ├── aovs-landing-page/     # React / Vite 3D Landing Page source
│   ├── index.html             # Main entry point & Landing Page
│   ├── vercel.json            # Vercel deployment & API proxy configuration
│   └── README.md              # Frontend & Vercel deployment guide
│
├── backend/                   # Node.js / Express API & Verification Service
│   ├── mock-service.js        # Core Express API, Proctoring, Transcribe & Exam Endpoints
│   ├── server.js              # Server entry point
│   ├── db.js                  # MongoDB Atlas database integration & repository
│   ├── risk-scorer.js         # Weighted risk calculation engine (paste & response telemetry)
│   ├── scripts/               # Database seed scripts
│   ├── render.yaml            # Render Blueprint deployment definition
│   ├── package.json           # Backend dependencies (Express, CORS, MongoDB, Dotenv)
│   ├── .env.example           # Environment template
│   └── README.md              # Backend & Render deployment guide
│
├── tests/                     # Playwright automated test suites (30 tests)
├── playwright.config.js       # Playwright test runner configuration
└── package.json               # Root dev scripts & test orchestration
```

---

## 🚀 Deployment

### 1. Deploy Frontend to Vercel
- **Root Directory:** `frontend`
- In `frontend/vercel.json`, requests to `/api/*` are automatically proxied to your Render backend:
  ```json
  {
    "rewrites": [
      {
        "source": "/api/:match*",
        "destination": "https://<YOUR-RENDER-BACKEND>.onrender.com/api/:match*"
      }
    ]
  }
  ```
- *See [frontend/README.md](frontend/README.md) for full steps.*

### 2. Deploy Backend to Render
- **Root Directory:** `backend`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- *See [backend/README.md](backend/README.md) for full steps.*

### 3. Pushing Individually to Separate Repositories
If you want to maintain separate GitHub repositories for frontend and backend:
```bash
# Push only frontend:
git subtree push --prefix=frontend <frontend-repo-url> main

# Push only backend:
git subtree push --prefix=backend <backend-repo-url> main
```

---

## 🧪 Local Testing & Development

Run the complete backend & test suite from root:

```bash
# Start backend server
npm start

# Run all 30 automated Playwright tests
npm test
```
