# 🚑 Emergency Vehicle Route Planner

An AI-powered emergency dispatch and adaptive route planning system leveraging **Constraint Satisfaction (CSP)**, **Knowledge Representation & Rule Inference**, and **State-Space Search Algorithms** (A*, Greedy Best-First, BFS, DFS, DLS, IDDFS).

---

## 🚀 Deploying on Render

This project is pre-configured for **Render** using `render.yaml` and `gunicorn`.

### Option 1: Automatic Blueprint Deployment (Recommended)
1. Push this repository to **GitHub** or **GitLab**.
2. Go to [dashboard.render.com](https://dashboard.render.com/).
3. Click **New +** → **Blueprint**.
4. Connect your repository.
5. Render will automatically read `render.yaml` and configure:
   - **Runtime**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Plan**: Free
6. Click **Apply** to deploy!

### Option 2: Manual Web Service Deployment
1. Go to [dashboard.render.com](https://dashboard.render.com/).
2. Click **New +** → **Web Service**.
3. Connect your Git repository.
4. Set the following fields:
   - **Name**: `emergency-route-planner`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Instance Type**: `Free`
5. Click **Create Web Service**.

---

## 💻 Local Development

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the application:
   ```bash
   python app.py
   ```

3. Open your browser at:
   ```
   http://127.0.0.1:5000
   ```
