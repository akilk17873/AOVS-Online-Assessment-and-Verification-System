# AOVS Frontend Portal (Vercel Deployment Guide)

Static client-side web application for the **AOVS (Assessment & Oral Verification System)**.
Contains:
- **Landing Page & Navigation Portal:** Interactive 3D/GSAP landing interface.
- **Student Authentication:** `Student Login/Creating Login_UI/index.html`
- **Student Exam & Proctoring Portal:** `Exam/index.html` (with dynamic oral verification, audio recording, and live Speech-to-Text).
- **Instructor Review & Grading Dashboard:** `Instructor/login.html` & `Instructor/dashboard.html` (with weighted risk score cards, audio player, and review drawer).

---

## 🚀 Deploying to Vercel

### Option 1: Monorepo Deployment (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/) and click **Add New...** -> **Project**.
2. Select your GitHub repository (`AOVS-Online-Assessment-and-Verification-System`).
3. In **Project Settings**:
   - **Framework Preset:** Other
   - **Root Directory:** Click "Edit" and choose `frontend`
   - **Build Command:** Leave empty
   - **Output Directory:** Leave empty (serves root of `frontend`)
4. In `frontend/vercel.json`, update the `destination` URL to your Render backend URL:
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
5. Click **Deploy**!

---

### Option 2: Push to a Dedicated Frontend GitHub Repo
If you want to maintain a separate GitHub repository for just the frontend:
```bash
# From the root of AOVS:
git subtree push --prefix=frontend <your-frontend-repo-git-url> main
```

---

## 🔗 Connecting to the Backend
You can point the frontend to your Render backend in any of three ways:
1. **Vercel Rewrites (Automatic):** Requests to `/api/*` are transparently routed to Render via `frontend/vercel.json`.
2. **Browser Storage:** Set the backend URL once in your browser console:
   ```javascript
   localStorage.setItem('AOVS_API_BASE', 'https://your-backend.onrender.com');
   ```
3. **URL Parameter:** Open the frontend with `?api=https://your-backend.onrender.com`.

