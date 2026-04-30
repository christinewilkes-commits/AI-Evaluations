// ─────────────────────────────────────────────────────────────────────────────
// Agent Eval Report — PR 351 vs Dev baseline
// Dev (Apr 27, 2026) vs PR 351 (Apr 30, 2026) — both Opus 4.7
// Run:  node generate_pr351.js
// Output: eval_comparison_PR351_vs_Dev_2026-04-30.docx
// ─────────────────────────────────────────────────────────────────────────────

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, LevelFormat, Header, PageNumber
} = require('docx');
const fs = require('fs');

// ══════════════════════════════════════════════════════════════════════════════
// ① RUN DATA
// ══════════════════════════════════════════════════════════════════════════════

const REPORT_DATE = "April 30, 2026";
const REPORT_FILE = "eval_comparison_PR351_vs_Dev_2026-04-30.docx";

const RUNS = [
  {
    label:     "Dev baseline\n(Apr 27, current)",
    model:     "Opus 4.7",
    modelFill: "E2EFDA",
    passRate:  "86.9%",
    rateFill:  "FFF2CC",
    rateColor: "7F6000",
    detail:    "53 / 61 steps",
    env:       "Dev",
    date:      "Apr 27, 2026",
    tag:       "Current Dev",
  },
  {
    label:     "PR 351\n(Apr 30, today)",
    model:     "Opus 4.7",
    modelFill: "E2EFDA",
    passRate:  "83.1%",
    rateFill:  "FCE4D6",
    rateColor: "9C0006",
    detail:    "49 / 59 scored",
    env:       "Preview",
    date:      "Apr 30, 2026",
    tag:       "PR 351 Preview",
  },
];

const RUBRIC_NARRATIVE = {
  headline: "PR 351 scores 3.8 points lower than the current Dev baseline: 86.9% → 83.1%, with 4 new failures, 2 newly unscored, and only 1 fix. Deduction-category failures account for the majority of the regression.",
  drops: [
    "Deduction regressions — Step 3 (WIC clinic from home address) newly fails in PR 351, having been unscored in Dev due to a jargon flag. More significantly, TC2 Step 55 (household member deduction) flips from FAIL in Dev to PASS in PR 351, showing the PR improves one deduction while breaking another. The 3 persistent deduction failures — Step 5 (auth checkbox), Step 6 (child age from DOB), and TC2 Step 53 (Asian ethnicity subgroup on IHSS) — remain unresolved in both runs. Deduction is the highest-failure category and warrants targeted attention.",
    "Ask Questions regressions — Steps 33 and 34 both newly fail. Step 33 (child citizenship not asked) was passing in Dev. Step 34 (spouse name, DOB, SSN, immigration status) was a known failure in Run 1 baseline, was fixed in Dev, and has regressed again in PR 351. These two breaking together strongly suggests a change in how the agent handles multi-person household context during BenefitsCal — it appears to be either skipping or abbreviating its gap analysis for the family members section.",
    "TC2 Step 59 (gap analysis before BenefitsCal) newly fails — consistent with the above: the agent is moving directly to filling BenefitsCal instead of presenting a gap analysis card first. This may be the root cause connecting the Step 59 failure with Steps 33 and 34, since those questions typically surface during the gap analysis phase.",
    "Two late-session steps (30, 38) are newly unscored. Both are BenefitsCal steps that were passing in Dev. This likely reflects a longer or more verbose session run rather than a functional regression, but confirms that PR 351 took more steps to reach the same point in the form.",
  ],
  pattern: "Deduction and Ask Questions are the two categories most affected by PR 351. Within Deduction: one improvement (TC2 Step 55), one new failure (Step 3), and three persistent failures unchanged (Steps 5, 6, 53). Within Ask Questions: two new failures (Steps 33, 34) that may trace back to a single root cause — the skipped BenefitsCal gap analysis (Step 59). If the gap analysis regression is fixed, Steps 33 and 34 may recover. The 6 persistent failures (Steps 5, 6, 25, 26b, 37, 53) are not attributable to PR 351 and should be tracked separately.",
};

// status: "PASS" | "FAIL" | "WARN" | "SKIP" | "—"
const FAILURES = [
  {
    issue: "Step 3 — WIC clinic selection (Perris)",
    runs:  ["—", "FAIL"],
    notes: ["Unscored in Dev (jargon flag, no verdict)", "New FAIL — clinic not correctly selected"],
  },
  {
    issue: "⚠️ Step 5 — Auth checkbox (persistent)",
    runs:  ["FAIL", "FAIL"],
    notes: ["Known failure", "Recurring"],
    critical: true,
  },
  {
    issue: "Step 6 — Child age from DOB (0–5, persistent)",
    runs:  ["FAIL", "FAIL"],
    notes: ["Known failure", "Recurring"],
  },
  {
    issue: "⚠️ Step 33 — Child citizenship status not asked",
    runs:  ["PASS", "FAIL"],
    notes: ["Passing in Dev", "New regression in PR 351"],
    critical: true,
  },
  {
    issue: "⚠️ Step 34 — Spouse info not asked",
    runs:  ["PASS", "FAIL"],
    notes: ["Dev had fixed this (was FAIL in Run 1 baseline)", "Regressed in PR 351"],
    critical: true,
  },
  {
    issue: "Step 25 — Affirmation section expand (persistent)",
    runs:  ["FAIL", "FAIL"],
    notes: ["Known failure", "Recurring"],
  },
  {
    issue: "Step 26b — Submit button not made active (persistent)",
    runs:  ["FAIL", "FAIL"],
    notes: ["Known failure", "Recurring"],
  },
  {
    issue: "Step 37 — Homelessness assumed No (persistent)",
    runs:  ["FAIL", "FAIL"],
    notes: ["Known failure", "Recurring"],
  },
  {
    issue: "TC2 Step 53 — Ethnicity mapping (Asian subgroup, persistent)",
    runs:  ["FAIL", "FAIL"],
    notes: ["Known failure", "Recurring"],
  },
  {
    issue: "TC2 Step 55 — Household members (Caroline lives alone)",
    runs:  ["FAIL", "PASS"],
    notes: ["New failure in Dev", "Fixed in PR 351 ✓"],
  },
  {
    issue: "TC2 Step 59 — Gap analysis before BenefitsCal",
    runs:  ["PASS", "FAIL"],
    notes: ["Passing in Dev", "New regression — agent skipped gap analysis"],
  },
  {
    issue: "Step 30 — SSN ask on BenefitsCal",
    runs:  ["PASS", "—"],
    notes: ["Passing in Dev", "Unscored in PR 351 — step may not have been reached"],
  },
  {
    issue: "Step 38 — Did not ask contact method (in DB)",
    runs:  ["PASS", "—"],
    notes: ["Passing in Dev", "Unscored in PR 351 — step may not have been reached"],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// ② DOCUMENT BUILDER
// ══════════════════════════════════════════════════════════════════════════════

const NAVY="1F3864", BLUE="2E75B6",
      GREEN="E2EFDA", RED="FCE4D6", ORANGE="FFF2CC",
      LGREY="F2F2F2", WHITE="FFFFFF", CRIMSON="C00000",
      DKGREEN="375623", DKRED="9C0006", MIDGREY="595959";

const bd=(c)=>({style:BorderStyle.SINGLE,size:1,color:c||"CCCCCC"});
const bds=(c)=>({top:bd(c),bottom:bd(c),left:bd(c),right:bd(c)});
const TIGHT={top:60,bottom:60,left:100,right:100};
const TIGHT_SM={top:50,bottom:50,left:90,right:90};

const mkCell=(text,w,fill,opts={})=>new TableCell({
  borders:bds(opts.bc||"CCCCCC"),
  shading:{fill:fill||WHITE,type:ShadingType.CLEAR},
  margins:TIGHT,width:{size:w,type:WidthType.DXA},
  verticalAlign:VerticalAlign.CENTER,
  children:[new Paragraph({
    alignment:opts.center?AlignmentType.CENTER:AlignmentType.LEFT,
    children:[new TextRun({text:String(text),font:"Arial",size:opts.sz||18,
      bold:!!opts.bold,color:opts.color||"000000",italics:!!opts.it})]
  })]
});

const hdrCell=(text,w)=>mkCell(text,w,BLUE,{bold:true,color:WHITE,center:true,sz:17,bc:BLUE});
const sp=()=>new Paragraph({children:[new TextRun("")],spacing:{before:50,after:50}});
const bul=(txt,sz=18)=>new Paragraph({
  numbering:{reference:"bullets",level:0},spacing:{before:30,after:30},
  children:[new TextRun({text:txt,font:"Arial",size:sz})]
});
const n=(t,sz=18)=>new TextRun({text:t,font:"Arial",size:sz});
const it=(t,sz=16)=>new TextRun({text:t,italics:true,font:"Arial",size:sz,color:MIDGREY});

const nCols = RUNS.length;
// 2-column layout — wider columns
const LW = 2400;
const RW = Math.floor((10080 - LW) / nCols);

// ── Summary table ─────────────────────────────────────────────────────────────
function summaryTable() {
  return new Table({
    width:{size:10080,type:WidthType.DXA},
    columnWidths:[LW, ...RUNS.map(()=>RW)],
    rows:[
      new TableRow({children:[
        hdrCell("Metric", LW),
        ...RUNS.map(r => hdrCell(r.label, RW)),
      ]}),
      new TableRow({children:[
        mkCell("Date", LW, LGREY, {bold:true}),
        ...RUNS.map(r => mkCell(r.date, RW, LGREY, {center:true})),
      ]}),
      new TableRow({children:[
        mkCell("Environment", LW, LGREY, {bold:true}),
        ...RUNS.map(r => mkCell(r.env, RW, LGREY, {center:true})),
      ]}),
      new TableRow({children:[
        mkCell("Pass rate", LW, LGREY, {bold:true, sz:19}),
        ...RUNS.map(r => mkCell(r.passRate, RW, r.rateFill, {bold:true, sz:26, center:true, color:r.rateColor})),
      ]}),
      new TableRow({children:[
        mkCell("Steps scored", LW, LGREY),
        ...RUNS.map(r => mkCell(r.detail, RW, LGREY, {center:true})),
      ]}),
      new TableRow({children:[
        mkCell("Model", LW, LGREY, {bold:true}),
        ...RUNS.map(r => mkCell(r.model, RW, r.modelFill)),
      ]}),
    ]
  });
}

// ── Rubric narrative ──────────────────────────────────────────────────────────
function rubricSection() {
  return [
    new Paragraph({
      spacing:{before:160,after:80},
      border:{bottom:{style:BorderStyle.SINGLE,size:4,color:"2E75B6",space:3}},
      children:[new TextRun({text:"Analysis",bold:true,font:"Arial",size:22,color:NAVY})]
    }),
    new Paragraph({spacing:{before:60,after:60},children:[n(RUBRIC_NARRATIVE.headline,18)]}),
    ...RUBRIC_NARRATIVE.drops.map(d => bul(d)),
    new Paragraph({spacing:{before:60,after:80},children:[n(RUBRIC_NARRATIVE.pattern,18)]}),
  ];
}

// ── Failures table ────────────────────────────────────────────────────────────
const IW = 3300;
const FW = Math.floor((10080 - IW) / nCols);
const lastFW = 10080 - IW - FW * (nCols - 1);

function statusCell(status, note, w) {
  const fillMap = {FAIL:RED, PASS:GREEN, SKIP:ORANGE, "—":LGREY};
  const colorMap = {FAIL:DKRED, PASS:DKGREEN, SKIP:"7F6000", "—":MIDGREY};
  const label = status||"—";
  const fill = fillMap[status]||LGREY;
  const color = colorMap[status]||MIDGREY;
  const children = [
    new Paragraph({children:[new TextRun({text:label,bold:true,font:"Arial",size:17,color})]})
  ];
  if(note) children.push(
    new Paragraph({spacing:{before:18},children:[new TextRun({text:note,font:"Arial",size:14,italics:true,color:MIDGREY})]})
  );
  return new TableCell({
    borders:bds("CCCCCC"),shading:{fill,type:ShadingType.CLEAR},
    margins:TIGHT_SM,width:{size:w,type:WidthType.DXA},
    verticalAlign:VerticalAlign.TOP,children
  });
}

function failuresTable() {
  const runWidths = RUNS.map((_, i) => i === RUNS.length - 1 ? lastFW : FW);

  const hdrLabels = [
    "Dev baseline (Apr 27)",
    "PR 351 (Apr 30)",
  ];

  const headerRow = new TableRow({children:[
    hdrCell("Step / Issue", IW),
    ...hdrLabels.map((l, i) => hdrCell(l, runWidths[i])),
  ]});

  const dataRows = FAILURES.map(f => {
    const isCritical = !!f.critical;
    const issueFill = isCritical ? "FFF0F0" : WHITE;
    return new TableRow({children:[
      new TableCell({
        borders:bds("CCCCCC"),
        shading:{fill:issueFill,type:ShadingType.CLEAR},
        margins:TIGHT_SM, width:{size:IW,type:WidthType.DXA},
        children:[new Paragraph({children:[new TextRun({
          text:f.issue, font:"Arial", size:16,
          bold:isCritical, color:isCritical?CRIMSON:"000000"
        })]})]
      }),
      ...f.runs.map((status, i) => statusCell(status, (f.notes||[])[i]||null, runWidths[i])),
    ]});
  });

  return new Table({
    width:{size:10080,type:WidthType.DXA},
    columnWidths:[IW,...runWidths],
    rows:[headerRow,...dataRows]
  });
}

// ── Document assembly ─────────────────────────────────────────────────────────
const doc = new Document({
  numbering:{config:[{reference:"bullets",levels:[
    {level:0,format:LevelFormat.BULLET,text:"\u2022",alignment:AlignmentType.LEFT,
     style:{paragraph:{indent:{left:540,hanging:280}}}}
  ]}]},
  styles:{default:{document:{run:{font:"Arial",size:18}}}},
  sections:[{
    properties:{page:{size:{width:12240,height:15840},margin:{top:864,right:864,bottom:864,left:864}}},
    headers:{default:new Header({children:[new Paragraph({
      border:{bottom:{style:BorderStyle.SINGLE,size:3,color:"CCCCCC",space:2}},
      children:[
        new TextRun({text:`NAVA PBC  |  Agent Evaluation — ${REPORT_DATE}  |  CONFIDENTIAL`,font:"Arial",size:16,color:"888888"}),
        new TextRun({text:"\t",font:"Arial",size:16}),
        new TextRun({children:[PageNumber.CURRENT],font:"Arial",size:16,color:"888888"}),
      ],tabStops:[{type:"right",position:10080}]
    })]})},
    children:[

      // Title
      new Paragraph({
        spacing:{before:0,after:80},
        border:{bottom:{style:BorderStyle.SINGLE,size:6,color:"2E75B6",space:4}},
        children:[
          new TextRun({text:`Agent Evaluation — PR 351 vs Dev Baseline  ·  ${REPORT_DATE}`,bold:true,font:"Arial",size:30,color:NAVY}),
          new TextRun({text:"    Dev (Apr 27) vs PR 351 (Apr 30)  ·  Opus 4.7  ·  TC1 = Rosa Flores  ·  TC2 = Carolina Reyes",font:"Arial",size:19,color:MIDGREY}),
        ]
      }),
      sp(),

      // Context
      new Paragraph({
        spacing:{before:40,after:100},
        children:[
          new TextRun({text:"Purpose: ",bold:true,font:"Arial",size:18}),
          n("Determine whether PR 351 improves or regresses agent performance relative to the current Dev baseline. Both runs use Opus 4.7 on TC1 (Rosa Flores — WIC + IHSS + BenefitsCal) and TC2 (Carolina Reyes — WIC + IHSS + BenefitsCal). 61 scored steps total.", 18),
        ]
      }),

      // Summary table
      summaryTable(),

      // Analysis
      ...rubricSection(),

      // Failures table
      new Paragraph({
        spacing:{before:40,after:80},
        border:{bottom:{style:BorderStyle.SINGLE,size:4,color:"2E75B6",space:3}},
        children:[new TextRun({text:"Step-Level Comparison",bold:true,font:"Arial",size:22,color:NAVY})]
      }),
      failuresTable(),
      sp(),

      // Footer
      new Paragraph({
        spacing:{before:40,after:0},
        border:{top:{style:BorderStyle.SINGLE,size:3,color:"CCCCCC",space:2}},
        children:[it("Sources: Dev baseline (Apr 27 2026): 53/61 = 86.9%, from eval_Dev_manual_baseline_Opus_4_7_2026-04-27.csv. PR 351 (Apr 30 2026): 49/59 scored = 83.1%, from eval_PR_351__Opus_4_7__2026-04-30.csv.")]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(REPORT_FILE, buf);
  console.log(`Done → ${REPORT_FILE}`);
});
