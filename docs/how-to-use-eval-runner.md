# How to Use the Eval Runner

This doc explains how to download and run agent evaluations using the HTML-based eval runner. No server, no setup — just a file in your browser.

---

## What the eval runner is

The eval runner is a self-contained HTML file that guides you through a structured evaluation of the AI agent, one step at a time. It tracks your scores (PASS / FAIL / SKIP), lets you add notes, and exports a CSV at the end that you can use to generate a comparison report.

There are two runners:

| File | Purpose |
|------|---------|
| `eval_runner.html` | TC1 (Rosa Flores) and TC2 (Carolina Reyes) — the original test cases |
| `eval_runner_new_users.html` | TC3 (Linh), TC4 (Marcus), TC5 (Isabel) — new user profiles |

---

## Step 1 — Download the file from GitHub

1. Go to the repo: **https://github.com/christinewilkes-commits/AI-Evaluations**
2. Navigate to `eval-runner/`
3. Click the file you want (e.g. `eval_runner.html`)
4. Click the **Download raw file** button (top right, looks like a downward arrow `↓`)
5. Save it somewhere on your computer — your Desktop or Downloads folder is fine

You can re-download it any time to get the latest version. The file is updated in this repo whenever test cases change.

---

## Step 2 — Open it in Chrome

Double-click the downloaded file. It will open directly in your browser — no internet connection required once it's downloaded.

> **Use Chrome.** The runner uses clipboard and keyboard shortcuts that work best in Chrome. Safari and Firefox may have minor issues.

---

## Step 3 — Configure your run

At the top of the page, fill in:

- **Run Label** — something you can identify later, e.g. `Run 12 — Sonnet 4.6 — PR 355`
- **Model** — select the model the agent is using in this session
- **Environment** — Dev or Prod (the environment you're running the agent against)
- **Date** — auto-filled to today

---

## Step 4 — Run the evaluation

The left sidebar lists every test step. Work through them in order.

For each step:

1. **Read the "Behavior Being Tested"** — this is what you're watching the agent do
2. **If there's a chat input** — click **Copy to clipboard**, then paste it into the agent chat and send
3. **If it says "Observe only"** — watch what the agent does without sending anything
4. **Score the step:**
   - **P** (or click ✓ PASS) — agent did what was expected
   - **F** (or click ✗ FAIL) — agent did not
   - **S** (or click — SKIP) — step wasn't reached (e.g. session crashed, or step was skipped intentionally)
5. Add a note if anything notable happened — the notes export with the CSV

The runner auto-advances to the next step after scoring. Use **← →** arrow keys to go back or forward manually.

Your scores are saved automatically in the browser as you go. If you close the tab by accident, reopen the file in the same browser and your progress will still be there.

---

## Step 5 — Export your results

When you've finished all steps, click **⬇ Export CSV** in the right panel. Save the CSV to the `results/` folder in this repo (or send it to whoever is generating the comparison report).

The CSV filename will include the run label and date automatically.

---

## Step 6 — Final review step

The last item in the step list is a **Skip Review**. It shows all steps you marked SKIP this run. Go through them to confirm each skip was intentional (e.g. session crashed before reaching that step) rather than accidentally skipped. Score it PASS if all skips were deliberate, FAIL if you found an oversight.

---

## Saving and loading runs

Your scores are auto-saved to the browser as you go, but you can also create named saves to come back to later — useful if you're running multiple evals across different sessions or want to compare runs side by side.

In the right panel, below Export CSV, you'll find a **Saved Runs** section:

- **💾 Save this run** — snapshots everything (all scores, notes, model, environment, PR #, date) under the run label. If a save with that label already exists, it will ask before overwriting.
- **Dropdown** — lists all your saved runs by label.
- **Load** — restores the selected run. If you have unsaved progress in the current session, it will warn you first.
- **🗑** — permanently deletes the selected save.

A few things to keep in mind: saves are stored in your browser's local storage, so they're tied to the specific browser and device you're using. They won't transfer to a colleague's machine, and they'll be lost if you clear your browser data. If you need to hand off a run, use **Export CSV** first.

---

## Generating a comparison report

Once you have two or more CSV exports, you can generate a `.docx` comparison report. See the main [README](../README.md) for instructions on using the report generator scripts in `report-generator/`.

---

## Tips

- **Run one TC at a time.** Each test case (TC1, TC2, etc.) is a separate agent session. Start a new chat session in the agent UI for each TC.
- **Keep the runner and the agent side by side.** Two monitors or a split screen works well.
- **Don't submit forms.** Every test case ends with a "Stop pre-submit" step — the agent should fill the form but not submit it. If the agent tries to submit, mark it FAIL and stop the session.
- **Note jargon.** If the agent uses technical terms (CSS selectors, DOM, element IDs, etc.) when talking to the caseworker, note it in the step notes and flag it for the Verbosity / Jargon step at the end.

---

## Test user reference

The agent uses these sandbox profiles in A360 (Apricot 360):

| Record ID | Name | Type | Notes |
|-----------|------|------|-------|
| 339688 | Rosa Flores | TC1 | WIC + IHSS + BenefitsCal |
| 339702 | Carolina Reyes | TC2 | WIC + IHSS + BenefitsCal |
| 339748 | Linh NAVA Thomas XXII | TC3 | Asian, parent, linked child (Baby 339750) |
| 339751 | Marcus NAVA Thomas XXIII | TC4 | White, wheelchair, Other type |
| 339752 | Isabel NAVA Thomas XXIV | TC5 | Hispanic, Spanish, hearing impairment, 2 children |

For more details on the test profiles and how they were created, see `docs/how-to-create-test-users-in-a360.md`.

---

## Questions?

See the other docs in this folder, or reach out to whoever owns this repo. The evaluation rubric categories are: Autonomous Progression, Deduction, Ask Questions, Clicking / UI Interaction, Navigation, Verbosity, and Hallucination.
