# AOVS Backend Service (Render Deployment Guide)

Backend API service for the **AOVS (Assessment & Oral Verification System)**, providing student & instructor authentication, exam distribution, oral verification question generation, Whisper Speech-to-Text transcription, and weighted risk score analysis.

---

## 🚀 Deploying to Render.com

### Option 1: Monorepo Deployment (Recommended)
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your GitHub repository (`AOVS-Online-Assessment-and-Verification-System`).
3. In the Web Service configuration:
   - **Name:** `aovs-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
4. Under **Environment Variables**, add:
   - `MONGODB_URI`: Your MongoDB Atlas URI (optional, falls back to in-memory)
   - `MOCK_COLLEGE_PORT`: `10000` (or leave default, Render sets `PORT` automatically)
5. Click **Create Web Service**.
6. Note your Render URL (e.g. `https://aovs-backend.onrender.com`). You will plug this into the frontend Vercel config.

---

### Option 2: Push to a Dedicated Backend GitHub Repo
If you prefer pushing only the `backend` code to a separate repository:
```bash
# From the root of AOVS:
git subtree push --prefix=backend <your-backend-repo-git-url> main
```

---

## 🧪 Local Development

```bash
cd backend
npm install
npm start
```
Server runs by default at `http://localhost:3000`.
Health check: `http://localhost:3000/api/health`

