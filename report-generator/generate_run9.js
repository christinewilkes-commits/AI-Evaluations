// ─────────────────────────────────────────────────────────────────────────────
// Agent Eval Comparison Report — Run 9 (PR 347, Apr 27) added to Run 8 vs Run 7
// Run:  node generate_run9.js
// Output: eval_comparison_run9_2026-04-27.docx
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

const REPORT_DATE = "April 27, 2026";
const REPORT_FILE = "eval_comparison_run9_2026-04-27.docx";

const RUNS = [
  {
    label:     "Opus 4.7\nPR 346 Dev (Run 7 — Baseline)",
    model:     "Opus 4.7",
    modelFill: "E2EFDA",
    passRate:  "95.0%",
    rateFill:  "E2EFDA",
    rateColor: "375623",
    detail:    "57 / 60 steps",
    pr:        "PR 346",
    env:       "Dev (merged)",
    date:      "Apr 24, 2026",
  },
  {
    label:     "Opus 4.7\nPR 347 Preview (Run 8)",
    model:     "Opus 4.7",
    modelFill: "E2EFDA",
    passRate:  "89.8%",
    rateFill:  "FFF2CC",
    rateColor: "7F6000",
    detail:    "53 / 59 steps",
    pr:        "PR 347",
    env:       "Preview",
    date:      "Apr 24, 2026",
  },
  {
    label:     "Opus 4.7\nPR 347 Preview (Run 9)",
    model:     "Opus 4.7",
    modelFill: "E2EFDA",
    passRate:  "77.0%",
    rateFill:  "FCE4D6",
    rateColor: "9C0006",
    detail:    "47 / 61 steps",
    pr:        "PR 347",
    env:       "Preview",
    date:      "Apr 27, 2026",
  },
];

const RUBRIC_NARRATIVE = {
  stable: "Across all three runs the same model (Opus 4.7) is tested against PR 347. The trend is a consistent downward slide: 95.0% → 89.8% → 77.0%. Hallucination and Verbosity remained solid in Run 9; Ask Questions partially recovered (Steps 21, 22, 34 all fixed), but new failures appeared across Autonomous Progression, UI Interaction, and Deduction.",
  drops: [
    "Autonomous Progression regressed the most in Run 9 — three new failures. Step 1: the agent used Carlos as the applicant instead of Rosa. Step 29: the agent skipped the gap analysis and immediately started filling the application. Step 26b: the submit button was not made active before stopping.",
    "UI Interaction: the affirmation section expand (Step 25) failed for the first time in Run 9. This category had been clean across Runs 7 and 8.",
    "Ask Questions showed a mixed picture — Steps 21, 22, and 34 all recovered (SSN now asked, veteran status now asked, spouse info now solicited), but Steps 37 and 38 both failed: homelessness was assumed No again (persistent across all three runs), and the agent asked for the preferred contact method even though it is already in the database.",
    "TC2 (Carolina/IHSS) was perfect in Run 8 but introduced two new failures in Run 9: Step 53 (ethnicity mapping, also a Run 7 failure) regressed again, and Step 55 (household members) failed for the first time.",
  ],
  pattern: "The oscillation of individual steps (Step 21 fixes then regresses; Step 53 fails, fixes, fails again) suggests low run-to-run consistency on PR 347 rather than a stable regression. Steps 5, 37, and 53 are the only persistent failures across multiple runs.",
};

// status: "PASS" | "FAIL" | "WARN" | "SKIP" | "—"
const FAILURES = [
  {
    issue: "Step 1 — Gap analysis missing / wrong applicant used",
    runs:  ["PASS", "PASS", "FAIL"],
    notes: [null, null, "Used Carlos as the applicant instead of Rosa"],
  },
  {
    issue: "⚠️ Step 5 — Auth checkbox checked without asking caseworker (persistent)",
    runs:  ["PASS", "FAIL", "FAIL"],
    notes: [null, "Recurring since Run 8", "Recurring — agent self-authorized the application"],
    critical: true,
  },
  {
    issue: "Step 6 — Child age not deduced from DOB (0–5 bucket)",
    runs:  ["PASS", "PASS", "FAIL"],
    notes: [null, null, "New in Run 9 — agent did not use child's DOB to select age range"],
  },
  {
    issue: "Step 21 — SSN not confirmed with caseworker",
    runs:  ["FAIL", "FAIL", "PASS"],
    notes: ["Recurring known failure", "Recurring known failure", "Fixed in Run 9 ✓"],
  },
  {
    issue: "Step 22 — Veteran status assumed without asking",
    runs:  ["PASS", "FAIL", "PASS"],
    notes: [null, "New in Run 8", "Fixed in Run 9 ✓"],
  },
  {
    issue: "Step 25 — Affirmation section expand failure",
    runs:  ["PASS", "PASS", "FAIL"],
    notes: [null, null, "New in Run 9 — first UI interaction failure of this type"],
  },
  {
    issue: "Step 26b — Submit button not made active",
    runs:  ["—", "SKIP", "FAIL"],
    notes: [null, "Not scored (skipped)", "New in Run 9 — agent did not verify button state"],
  },
  {
    issue: "Step 29 — Gap analysis skipped before BenefitsCal",
    runs:  ["PASS", "PASS", "FAIL"],
    notes: [null, null, "New in Run 9 — immediately started filling application without gap summary"],
  },
  {
    issue: "Step 34 — Spouse info fields not fully solicited",
    runs:  ["PASS", "FAIL", "PASS"],
    notes: [null, "New in Run 8", "Fixed in Run 9 ✓"],
  },
  {
    issue: "⚠️ Step 37 — Homelessness assumed No (persistent across all runs)",
    runs:  ["FAIL", "FAIL", "FAIL"],
    notes: ["Known failure", "Recurring", "Recurring — agent never asks caseworker about housing instability"],
    critical: true,
  },
  {
    issue: "Step 38 — Preferred contact method asked when already in DB",
    runs:  ["PASS", "PASS", "FAIL"],
    notes: [null, null, "New in Run 9 — contact method (text) is in database; agent should not ask"],
  },
  {
    issue: "Step 41 — Back-button navigation to fix entry error",
    runs:  ["PASS", "FAIL", "SKIP"],
    notes: [null, "New in Run 8 — used back nav to fix SSN", "Not evaluated (skipped)"],
  },
  {
    issue: "Step 53 — Ethnicity mapping TC2 (oscillating)",
    runs:  ["FAIL", "PASS", "FAIL"],
    notes: ["Known baseline failure", "Fixed in Run 8", "Regressed in Run 9 — inconsistent"],
  },
  {
    issue: "Step 55 — Household members not identified TC2",
    runs:  ["PASS", "PASS", "FAIL"],
    notes: [null, null, "New in Run 9 — TC2 was 100% in Run 8; this is a regression"],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// ② DOCUMENT BUILDER
// ══════════════════════════════════════════════════════════════════════════════

const NAVY="#1F3864", BLUE="#2E75B6",
      GREEN="#E2EFDA", RED="#FCE4D6", ORANGE="#FFF2CC",
      LGREY="#F2F2F2", WHITE="#FFFFFF", CRIMSON="#C00000",
      DKGREEN="#375623", DKRED="#9C0006", MIDGREY="#595959";

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
const b=(t,sz=19)=>new TextRun({text:t,bold:true,font:"Arial",size:sz});
const n=(t,sz=18)=>new TextRun({text:t,font:"Arial",size:sz});
const it=(t,sz=16)=>new TextRun({text:t,italics:true,font:"Arial",size:sz,color:MIDGREY});

// Portrait 8.5×11, 0.6" margins → content = 10080 twips
const nCols = RUNS.length;
const LW = 2200;
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
        mkCell("Model", LW, LGREY, {bold:true}),
        ...RUNS.map(r => mkCell(r.model, RW, r.modelFill)),
      ]}),
      new TableRow({children:[
        mkCell("PR / Environment", LW, LGREY, {bold:true}),
        ...RUNS.map(r => mkCell(`${r.pr}  ·  ${r.env}`, RW, LGREY)),
      ]}),
      new TableRow({children:[
        mkCell("Pass rate", LW, LGREY, {bold:true, sz:19}),
        ...RUNS.map(r => mkCell(r.passRate, RW, r.rateFill, {bold:true, sz:26, center:true, color:r.rateColor})),
      ]}),
      new TableRow({children:[
        mkCell("Steps (scored)", LW, LGREY, {bold:false}),
        ...RUNS.map(r => mkCell(r.detail, RW, LGREY, {center:true})),
      ]}),
    ]
  });
}

// ── Rubric narrative ──────────────────────────────────────────────────────────
function rubricSection() {
  return [
    new Paragraph({
      spacing:{before:160,after:80},
      border:{bottom:{style:BorderStyle.SINGLE,size:4,color:BLUE,space:3}},
      children:[new TextRun({text:"Trend Analysis",bold:true,font:"Arial",size:22,color:NAVY})]
    }),
    new Paragraph({spacing:{before:60,after:60},children:[n(RUBRIC_NARRATIVE.stable,18)]}),
    new Paragraph({spacing:{before:60,after:40},children:[new TextRun({text:"Key changes in Run 9 vs prior runs:",font:"Arial",size:18})]}),
    ...RUBRIC_NARRATIVE.drops.map(d => bul(d)),
    new Paragraph({spacing:{before:60,after:80},children:[n(RUBRIC_NARRATIVE.pattern,18)]}),
  ];
}

// ── Failures table ────────────────────────────────────────────────────────────
const IW = 2900;
const FW = Math.floor((10080 - IW) / (nCols + 1));

function statusCell(status, note, w) {
  const fillMap = {FAIL:RED, PASS:GREEN, WARN:"FFE0E0", SKIP:ORANGE, "—":LGREY};
  const colorMap = {FAIL:DKRED, PASS:DKGREEN, WARN:CRIMSON, SKIP:"7F6000", "—":MIDGREY};
  const label = status==="WARN" ? "FAIL ⚠" : status||"—";
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
  const runWidths = RUNS.map((_, i) => i === RUNS.length - 1 ? FW * 2 : FW);
  const totalWidth = IW + runWidths.reduce((a,b)=>a+b,0);
  const adj = 10080 - totalWidth;
  runWidths[runWidths.length-1] += adj;

  const headerRow = new TableRow({children:[
    hdrCell("Step / Issue", IW),
    ...RUNS.map((r, i) => hdrCell(r.label.split('\n')[0] + ' ' + r.label.split('\n')[1].replace(/.*\(/, '('), runWidths[i])),
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
        border:{bottom:{style:BorderStyle.SINGLE,size:6,color:BLUE,space:4}},
        children:[
          new TextRun({text:`Agent Evaluation — ${REPORT_DATE}`,bold:true,font:"Arial",size:34,color:NAVY}),
          new TextRun({text:"    Run 9 (PR 347 Preview)  ·  3-Run Trend vs. Run 7 Baseline",font:"Arial",size:19,color:MIDGREY}),
        ]
      }),
      sp(),

      // Context
      new Paragraph({
        spacing:{before:40,after:100},
        children:[
          b("Test cases: ", 18),
          n("TC1 = Rosa Flores (BenefitsCal, case #339688)  ·  TC2 = Carolina Reyes (IHSS, case #339702)  ·  Environment: PR 347 Preview", 18),
        ]
      }),

      // Summary table
      summaryTable(),

      // Rubric narrative
      ...rubricSection(),

      // Failures table
      new Paragraph({
        spacing:{before:40,after:80},
        border:{bottom:{style:BorderStyle.SINGLE,size:4,color:BLUE,space:3}},
        children:[new TextRun({text:"Step-Level Failures — 3-Run Comparison",bold:true,font:"Arial",size:22,color:NAVY})]
      }),
      failuresTable(),
      sp(),

      // Footer
      new Paragraph({
        spacing:{before:40,after:0},
        border:{top:{style:BorderStyle.SINGLE,size:3,color:"CCCCCC",space:2}},
        children:[it("Sources: Run 7 (PR 346 Dev, Apr 24): 57/60 = 95.0%. Run 8 (PR 347 Preview, Apr 24): 53/59 = 89.8% — manually scored. Run 9 (PR 347 Preview, Apr 27): 47/61 = 77.0% from eval_PR_347___Opus_4_7__2026-04-27.csv. Skipped steps excluded from pass-rate denominator varies by run. Step 26b counted as scored in Run 9.")]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(REPORT_FILE, buf);
  console.log(`Done → ${REPORT_FILE}`);
});
