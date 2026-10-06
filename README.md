# 🚑 Emergency Vehicle Route Planner

An AI-powered emergency dispatch and adaptive route planning system leveraging **Constraint Satisfaction (CSP)**, **Knowledge Representation & Rule Inference**, and **State-Space Search Algorithms** (A*, Greedy Best-First, BFS, DFS, DLS, IDDFS).

---

## 🚀 Deploying on Vercel

This project is pre-configured for **Vercel** serverless Python deployment using `api/index.py` and `vercel.json`.

### Option 1: Deploy via Vercel Dashboard + GitHub (Recommended)
1. Push your repository to **GitHub**:
   ```bash
   git add .
   git commit -m "Deploy to Vercel"
   git push origin main
   ```
2. Go to **[vercel.com/new](https://vercel.com/new)**.
3. Import your `emergency-route-planner` repository.
4. Framework Preset: **Other** (Vercel will automatically detect `vercel.json` and Python).
5. Click **Deploy**.

### Option 2: Deploy directly via Vercel CLI
In your project terminal, run:
```bash
npx vercel
```
- When asked `Set up and deploy?`, enter `y`.
- Accept the defaults.
- For production deployment, run:
```bash
npx vercel --prod
```

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
