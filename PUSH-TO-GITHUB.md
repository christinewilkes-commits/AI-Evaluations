# Push this to GitHub — 5 minutes, no developer needed

## Step 1 — Open Terminal on your Mac

Press `Cmd + Space`, type **Terminal**, hit Enter.

---

## Step 2 — Run these commands

Open Terminal (`Cmd + Space` → type Terminal → Enter).

Copy and paste each line, hitting Enter after each one. Adjust the first `cd` path if your Dashboard Project folder is somewhere other than Desktop.

```bash
cd ~/Desktop/"Dashboard Project/agent-evals"

git init
git branch -m main
git add .
git commit -m "Initial commit — agent eval toolkit"
git remote add origin https://github.com/christinewilkes-commits/AI-Evaluations.git
git push -u origin main
```

If GitHub asks you to log in, use your GitHub username and a **Personal Access Token** (not your password). To create one:
GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token → check **repo** scope → copy the token and paste it as your password.

---

## Step 4 — For future runs

After each eval session, save your CSV to `results/` and update `generate_report.js`
with the new run data, then:

```bash
cd "Dashboard Project/agent-evals"
git add .
git commit -m "Add eval results — PR 345, Apr 28 2026"
git push
```

---

## What's in the repo (and what's not)

✅ Included:
- `eval_runner.html` — the scoring tool
- `generate_report.js` — the report generator
- `slack_eval_template.md` — Slack template
- Both documentation guides

❌ Not included (protected by .gitignore):
- `service-account.json` — GCP credentials, stays on your machine only
- `node_modules/` — too large, regenerated with `npm install`
- `*.docx` — generated output files
- `results/*.csv` — opt-in only (use `git add -f results/filename.csv` to add one)
