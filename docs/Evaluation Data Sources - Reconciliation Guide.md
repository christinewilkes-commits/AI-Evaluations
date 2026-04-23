# Evaluation Data Sources: Reconciliation Guide

This document explains the three data sources used to analyze agent evaluation runs, how to export each one, and how to cross-reference them to produce a complete picture of a session.

---

## Overview

Each evaluation run involves the agent making LLM API calls, storing conversation records, and a caseworker interacting through the browser UI. Three separate systems capture different parts of this:

| Source | What it captures | Ground truth for |
|--------|-----------------|-----------------|
| **BigQuery** | Every LLM API call (model, timestamp, message count) | Which model was actually invoked, call volume, timing |
| **Cloud SQL** | Full conversation messages (ChatIds, roles, content, timestamps) | Session boundaries, user turn content, what the agent said |
| **PostHog** | Browser UI events (clicks, page views, rage clicks, dead clicks, model selection) | Caseworker actions, UI friction, model configured in the UI |

No single source is complete on its own. You need all three to confirm what happened in a session.

---

## Data Source 1: BigQuery

**Table:** `nava-labs.anthropic_logging.request_response_logging`  
**What's stored:** One row per LLM API call routed through Vertex AI. Includes the model name, timestamp (`logging_time`), and the full request/response payload.

**Key columns:**

| Column | Type | Notes |
|--------|------|-------|
| `logging_time` | TIMESTAMP | When the API call was made (UTC) |
| `model` | STRING | Full Vertex AI model path, e.g. `publishers/anthropic/models/claude-opus-4-7` |
| `model_version` | STRING | Usually null; use `model` instead |
| `full_request` | JSON | Full request payload (messages, system prompt, etc.) |
| `full_response` | JSON | Full response payload |

**How to access:**

BigQuery is accessible via the service account key at `service-account.json` in the Dashboard Project folder. You can query it using the Python BigQuery client or directly in the Google Cloud Console.

Example query to get all calls for a specific date window:

```sql
SELECT
  logging_time,
  model,
  ARRAY_LENGTH(JSON_QUERY_ARRAY(full_request, '$.messages')) AS msg_count
FROM `nava-labs.anthropic_logging.request_response_logging`
WHERE DATE(logging_time) = '2026-04-20'
  AND logging_time BETWEEN TIMESTAMP('2026-04-20 13:00:00') AND TIMESTAMP('2026-04-20 17:00:00')
ORDER BY logging_time
```

**Interpreting model names:**
- `publishers/anthropic/models/claude-opus-4-7` → Opus 4.7
- `publishers/anthropic/models/claude-sonnet-4-6` → Sonnet 4.6 (the only Sonnet model available; there is no claude-sonnet-4-7)
- `publishers/anthropic/models/claude-haiku-4-5` → Haiku 4.5 (used for background context engineering / working memory in every session)

**Gotchas:**
- Haiku calls appear in every session because the agent uses Haiku for background context engineering. These are not evaluation logic calls — they run silently in the background. Don't count them toward the primary model call tally.
- BigQuery may have logging gaps for evening traffic. If you run an evaluation after ~19:00 UTC and see zero rows, check whether the logging sink is active. Cross-reference with Cloud SQL to confirm whether the session actually happened.
- `full_request` and `full_response` may be NULL for some rows (particularly rows logged via older paths). In that case fall back to `request_payload` and `response_payload` (REPEATED STRING columns containing JSON chunks).

---

## Data Source 2: Cloud SQL

**Instance:** Dev instance (`Message_v2` table), private IP only — not reachable from outside the VPC.  
**What's stored:** Every message in every conversation: the ChatId, role (`user`, `assistant`, `tool`), message content (`parts`), and timestamp.

**Key columns:**

| Column | Notes |
|--------|-------|
| `chatId` | UUID that uniquely identifies a conversation. This is the ground truth for session boundaries. |
| `role` | `user` (caseworker messages), `assistant` (agent responses), `tool` (tool call results) |
| `parts` | JSON array containing the message content |
| `createdAt` | Message timestamp (UTC) |

**How to export:**

Cloud SQL has no public IP, so you cannot connect from outside the VPC (including from this workspace). To get the data:

1. Open **Google Cloud Console → SQL → your instance → Cloud Shell** (or connect from a machine inside the VPC)
2. Run: `SELECT * FROM Message_v2 WHERE DATE(createdAt) = '2026-04-20' ORDER BY createdAt`
3. Export as CSV and upload here

Alternatively, use **Cloud SQL Studio** in the Console to run queries and download results.

**How to identify evaluation sessions:**

The ChatId is embedded directly in the app URL: `https://dev.labs-asp.navateam.com/chat/{chatId}`. You can see these in PostHog page view events.

To confirm a ChatId is an evaluation run, look for the first user message — it will reference a client ID (e.g. "Retrieve 339688 and fill out WIC form"). Match this against your known test case IDs.

**Gotchas:**
- There will be many ChatIds in the export that are NOT evaluation runs (background context engineering, testing, unrelated chats). Filter by first-message content and time window.
- Each evaluation run produces two ChatIds: one for Test Case 1 (e.g. Rosa Flores) and one for Test Case 2 (e.g. Caroline Delgado). They often overlap in time.

---

## Data Source 3: PostHog

**Project:** NAVA labs production PostHog  
**What's stored:** Browser autocapture events — every click, page view, rage click, and dead click during a caseworker session.

**How to export:**

1. Go to PostHog → **Activity → Events**
2. Filter by date range covering your evaluation window. Add extra buffer (export at least 30 min after your last expected session end — PostHog can lag).
3. Click **Export → CSV**

**Key columns in the export:**

| Column | Notes |
|--------|-------|
| `*.event` | Event type: `$autocapture`, `$pageview`, `$rageclick`, `$dead_click`, `$set` |
| `*.timestamp` | UTC timestamp of the event |
| `*.properties.$current_url` | The page URL at the time of the event. **The ChatId appears directly in the path:** `/chat/{chatId}` |
| `*.properties.$el_text` | The text of the element clicked (button labels, link text, etc.) |
| `*.properties.$session_id` | PostHog browser session ID (different from ChatId) |

**How to find model selection events:**

Look for `$autocapture` events where `$el_text` matches a model name (e.g. "Claude Opus 4.7"). These are clicks on the model selector in the UI. The timestamp tells you when the caseworker switched models.

**Gotchas:**
- PostHog captures what the caseworker *configured* in the UI, not what model the system *actually used*. Always cross-reference with BigQuery to confirm the model that was invoked.
- If your export ends before your last session finished, re-export with a later end time. The gap in the new file will still be there if the export was taken before the session ran.
- PostHog sessions (browser session IDs) are not the same as ChatIds. Use the `$current_url` column to map PostHog events to ChatIds.

---

## Cross-Referencing the Three Sources

### Step 1: Establish session boundaries from Cloud SQL

Export the Cloud SQL `Message_v2` table for your evaluation date. Group messages by `chatId`. For each ChatId, note:
- First message time (`MIN(createdAt)`)
- Last message time (`MAX(createdAt)`)
- First user message content (to confirm which test case it is)
- Total user turns

This gives you a definitive list of evaluation sessions and their time windows.

### Step 2: Assign BigQuery rows to sessions

Use the Cloud SQL time windows to query BigQuery. For each ChatId's time window, pull all BigQuery rows within that window:

```sql
SELECT logging_time, model, ...
FROM `nava-labs.anthropic_logging.request_response_logging`
WHERE logging_time BETWEEN TIMESTAMP('...') AND TIMESTAMP('...')
ORDER BY logging_time
```

Count calls by model to confirm which model was used and how many times. Note: don't use gap-based clustering to define session boundaries in BigQuery — Haiku background context engineering calls create artificial gaps within a single conversation. Always use Cloud SQL time windows as the ground truth.

### Step 3: Map PostHog events to sessions

PostHog page URLs contain the ChatId directly (`/chat/{chatId}`). Filter your PostHog export by ChatId to get all UI events for a given session. Look for:
- **Model selection clicks** (`$el_text` = model name) — when did the caseworker change models?
- **Rage clicks** — where did the caseworker click repeatedly in frustration?
- **Dead clicks** — where did the caseworker click on an unresponsive element?
- **"Take control" / "Leave session"** button clicks — how often did the caseworker intervene?
- **"Skip for now"** — how often was a step skipped?

### Step 4: Confirm with three-way cross-reference

A session is fully confirmed when:
- Cloud SQL shows the ChatId with the expected first message and time range ✓
- BigQuery shows API calls within that time window ✓
- PostHog shows page view events for the ChatId URL ✓

If BigQuery or PostHog is missing, note the gap in your report. Missing BigQuery data = possible logging sink issue. Missing PostHog = export window too narrow (re-export with later end time).

---

## Evaluation Rubric

The rubric lives in `Evaluation Rubric April 2026.xlsx`. Each evaluation run has its own tab (named after the model/config used). The rubric has 7 categories: Autonomous Progression, Deduction, Ask Questions, Clicking / UI Interaction, Navigation, Verbosity, Hallucination.

Score each tab to get PASS/FAIL counts. Pass rate = PASS / total scored steps. If a session crashed mid-run, some steps will be unscored — report both the scored pass rate and the effective pass rate assuming all unscored steps failed.

---

## Known Limitations

**BigQuery logging gap for evening traffic.** Runs starting after approximately 19:00–20:00 UTC may not appear in BigQuery. This has been observed on April 20, 2026. If you run evaluations in the evening (US time = UTC+7 for PDT), schedule them before ~11:00 AM Pacific to stay within the confirmed logging window.

**Cloud SQL is private IP only.** There is no way to query Cloud SQL directly from outside the VPC. Export manually from Cloud SQL Studio or Cloud Shell after each evaluation session. Naming convention: `studio_results_YYYYMMDD_HHMM.csv`.

**PostHog export timing.** If you export PostHog immediately after an evaluation, the last few minutes of events may not have been ingested yet. Wait at least 15–30 minutes after the last session ends before exporting.

**Haiku in every session.** The agent uses Haiku for background context engineering (working memory calls). Every session will show Haiku calls in BigQuery. These are not evaluation logic — filter them out when counting primary model usage.

---

*Last updated: April 2026. Maintained by Christine Wilkes (christinewilkes@navapbc.com).*
