# Evaluation Automation Strategy
## Nava Labs — Agent Eval Pipeline

---

## What you have today (no developer needed)

**`eval_runner.html`** — open this file in any browser. It gives you:

- All 61 test steps pre-loaded, organized by Test Case 1 (Rosa) and Test Case 2 (Caroline)
- For steps that require you to type something, a **Copy to clipboard** button so you paste directly into the chat
- **P / F / S** keyboard shortcuts to score each step instantly
- Your baseline (Opus 4.7, Run 1) shown on every step for comparison
- Auto-saves your progress — if you close the tab, it remembers where you left off
- **Export CSV** at the end, ready to feed into the comparison report

**How to run an evaluation this morning:**
1. Open `eval_runner.html` in Chrome
2. Fill in Run Label (e.g. "Run 5 — Opus 4.7") and model, then click the environment to open it in a new tab
3. Work through the steps: paste inputs from the runner into your chat, observe the agent, hit P or F
4. Add notes as you go
5. Export the CSV when done, then repeat for the second model
6. Share the CSVs — the comparison report can be regenerated from them

---

## The three things that need to be automated

Your eval process has three distinct parts with different automation complexity:

### 1. Input delivery — Medium difficulty
**What it is:** Sending the right messages to the agent at the right time (the entries in column D).

**What automation looks like:** A script that opens a browser, logs in, starts a new chat, and sends each message in sequence — waiting for the agent to respond before sending the next one.

**Tech approach:** [Playwright](https://playwright.dev) (a browser automation library) or the Claude in Chrome integration. Your developer would write a script that drives the browser the same way you do manually.

**Complexity note:** This is straightforward for the 15 steps that have explicit inputs. The tricky part is the conditional steps (like "if required: she has cancer") — the script needs to detect what the agent said before deciding whether to send that message.

**Brandon's experiments 10-13** cover exactly this kind of trace-driven automation. The pattern: define a sequence of inputs, run them against the system, collect the full conversation trace.

---

### 2. Scoring — High difficulty, requires decisions
**What it is:** Looking at the agent's output and deciding Pass/Fail for each rubric criterion.

This is the hardest part to automate, and your rubric's own notes say it well: *"Only generalization errors, where your system works sometimes but not consistently, are good candidates for automated evaluation. Default to code-based and not LLM-as-judge."*

Looking at your 61 steps, here's the breakdown:

**Can be automated with code (no AI needed):**
| Step | Check | How |
|------|-------|-----|
| Agent stops before submitting | Did the submit button get clicked? | Cloud SQL: look for submit confirmation message |
| Does not open new tabs | Tab count stayed at 1 | Playwright: monitor tab events |
| Does not use back button | No navigation events backward | Playwright: monitor navigation |
| Agent asks for SSN | Was SSN mentioned in the conversation? | Cloud SQL: text search in `parts` |
| Agent asks for veteran status | Was veteran mentioned? | Cloud SQL: text search |
| Agent does not update read-only DB | No database write confirmation message | Cloud SQL: absence check |

**Requires LLM-as-judge (AI grades the output):**
| Step | Why AI is needed |
|------|-----------------|
| Used correct WIC clinic (Perris/Lakeshore) | Needs to extract a place name from free text |
| Asian ethnicity not clarified | Needs to understand whether a question was asked |
| Verbosity / conciseness | Subjective judgment |
| Hallucination check | Needs to verify facts against database values |
| Summary at end of form | Needs to evaluate completeness |

**Requires human judgment (for now):**
| Step | Why humans still needed |
|------|------------------------|
| DOB / telephone / dropdown interaction | Requires visual confirmation the field was filled correctly |
| County modal navigation | Requires watching the UI |
| Affirmation section expand | Requires UI observation |

---

### 3. Report generation — Easy, mostly done
**What it is:** Taking the scores from the runs and producing the comparison document.

**Current state:** The comparison Word doc (`Evaluation Comparison April 20 2026.docx`) is already generated programmatically from `generate4.js`. The inputs are hardcoded, but they could be replaced with CSV reads.

**What a developer needs to add:** A function that reads the exported CSVs and populates the document template automatically. This is a 1-2 day task.

---

## Recommended phased approach

### Phase 1 — This week (no developer)
Use `eval_runner.html`. Run both models, export CSVs, share with me, I generate the comparison report.

**Time per eval run:** ~40-60 minutes (same as now, but no spreadsheet juggling)

---

### Phase 2 — 2-4 weeks (1 developer, ~3 days of work)
**Goal:** Automate input delivery and report generation. You still score.

What to build:
- Playwright script that opens the environment, logs in, and sends the 15 inputs in the right sequence
- Script reads the Chat ID after each session starts and logs it to a file
- Report generator reads CSVs → produces the Word doc automatically

**Output:** You open the environment, the script drives the inputs, you score, export CSV, run report script — one command generates the document.

---

### Phase 3 — 4-8 weeks (1 developer, ~1-2 weeks of work)
**Goal:** LLM-as-judge for the ~25 steps that require AI interpretation.

Pattern (from Brandon's experiments 10-13):
1. Script runs the eval and collects the full conversation from Cloud SQL
2. Feed each conversation turn to Claude with the rubric criteria as a prompt
3. Claude returns `{step: 5, result: "FAIL", reason: "Agent assumed WIC appointment checkbox without asking"}` for each gradeable step
4. Human reviews only the FAIL verdicts and the ~15 UI-observation steps
5. Results auto-populate the scoring CSV

**This is the Brandon approach adapted to your tool.** The key difference from his use case: his tool outputs JSON (easy to evaluate programmatically), yours controls a browser (harder). The LLM-as-judge step bridges that gap by reading the conversation transcript rather than structured output.

**Estimated automation coverage:** ~60-65% of steps fully automated, ~35% still needing human eyes on the UI.

---

### Phase 4 — Full pipeline (eventual)
Input delivery → auto-scoring → BigQuery pull → report → stored in Braintrust for trend tracking.

This is what the `bigquery_to_braintrust.py` script in your project was started for. Brandon's end state was "LLM takes over running evaluations and subsequently improves them" — that's the long-term direction here too.

---

## What to tell your developer

When you bring them in, share:
1. This document
2. `eval_runner.html` (shows the step structure and scoring format)
3. `Evaluation Data Sources - Reconciliation Guide.md` (explains BigQuery, Cloud SQL, PostHog)
4. The GitHub: https://github.com/gobrando/labs-gen-ai-experiments (experiments 10-13 for the eval loop pattern)

**The specific ask for Phase 2:**
> "Build a Playwright script that opens `https://dev.labs-asp.navateam.com`, logs in with Google (we'll handle auth), starts a new chat, and sends the following 15 messages in sequence, waiting for a response before each one. Log the ChatId and all timestamps to a JSON file. Then build a second script that reads a scoring CSV and generates a Word comparison doc using the template in `generate4.js`."

**The specific ask for Phase 3:**
> "After each eval run, pull the conversation from Cloud SQL (see the reconciliation guide for the query). For each of the following rubric criteria [list the 25 LLM-gradeable steps], send the conversation + the expected behavior to Claude and ask it to return a pass/fail verdict with a one-sentence reason. Write the verdicts to the scoring CSV."

---

## One important caveat

Your rubric notes say: *"Only use LLM-as-judge where you need a subjective assessment."*

For the steps that check whether the agent *asked a specific question* or *used a specific value*, code-based checks (text search in Cloud SQL) are more reliable and cheaper than LLM judgment. Start there. Use LLM-as-judge only for the genuinely subjective criteria: verbosity, hallucination quality, summary completeness.

---

*Last updated: April 2026.*
