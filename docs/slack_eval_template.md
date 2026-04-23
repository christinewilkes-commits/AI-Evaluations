# Slack Eval Message Template
## Copy, fill in the brackets, post.

---

*🧪 Agent Eval Results — [Date] ([PR number])*

Ran the full evaluation suite today against [PR number] with [number] models. [One sentence on overall result — e.g. "Both came in well below our Opus baseline" or "Sonnet held steady; Opus regressed"]. See my [report]([link to doc]) that lays out what specifically failed (new failures compared to [baseline description — e.g. "Opus baseline from Monday"]).

*Scores by rubric category*
```
Category                  [Baseline label]   [Run 2 label]   [Run 3 label]
──────────────────────────────────────────────────────────────────────────
Autonomous Progression    [X/X  (X%)]        [X/X  (X%)]     [X/X  (X%)]
Deduction                 [X/X  (X%)]        [X/X  (X%)]     [X/X  (X%)]
Ask Questions             [X/X  (X%)]        [X/X  (X%)]     [X/X  (X%)]
Clicking / UI Interaction [X/X  (X%)]        [X/X  (X%)]     [X/X  (X%)]
Navigation                [X/X  (X%)]        [X/X  (X%)]     [X/X  (X%)]
Verbosity                 [X/X  (X%)]        [X/X  (X%)]     [X/X  (X%)]
Hallucination             [X/X  (X%)]        [X/X  (X%)]     [X/X  (X%)]
──────────────────────────────────────────────────────────────────────────
TOTAL                     [X/X  (X%)]        [X/X  (X%)]     [X/X  (X%)]
```

TLDR:
• [What held stable — e.g. "Navigation, Verbosity, and Hallucination held at 100% across both models — those categories are stable. Everything else regressed."]
• Couple red flags: [Model 1] [brief description of most critical failure] and [Model 2] [brief description of most critical failure]
• Couple other product notes:
  ○ [Business/cost consideration if relevant — e.g. "Since this effort is for cost-savings, I would not recommend accepting these performance failures as a trade-off"]
  ○ [UX observation if relevant — e.g. "UI: [what you noticed about the interface during testing]"]

---

## Guidance notes (delete before sending)

**What held stable:** start here — it gives people a positive anchor before the bad news.

**Red flags:** 2 max. These are the things that would block a merge or ship. Keep it one sentence each. If something has a fairness/bias dimension, lead with that.

**Product notes:** optional section for observations outside the rubric — UX friction, cost/performance trade-offs, things that aren't failures but are worth the team knowing.

**What to omit from Slack:** the full failures list, per-step details, BigQuery/PostHog methodology. Those live in the report doc. The Slack message should make someone want to read the report, not replace it.

**Tone:** opinionated and brief. You ran the test, you know what matters. Write it like you'd say it to a teammate, not like a status update.
