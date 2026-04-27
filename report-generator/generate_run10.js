// ─────────────────────────────────────────────────────────────────────────────
// Agent Eval Report — Dev regression check
// Run 7 Dev (Apr 24, original baseline) vs Run 10 Dev (Apr 27, rerun)
//                                        vs Run 9 Preview (Apr 27)
// Run:  node generate_run10.js
// Output: eval_comparison_run10_2026-04-27.docx
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
const REPORT_FILE = "eval_comparison_run10_2026-04-27.docx";

const RUNS = [
  {
    label:     "Run 7 — Dev baseline\n(Apr 24, PR 346)",
    model:     "Opus 4.7",
    modelFill: "E2EFDA",
    passRate:  "95.0%",
    rateFill:  "E2EFDA",
    rateColor: "375623",
    detail:    "57 / 60 steps",
    env:       "Dev",
    date:      "Apr 24, 2026",
    tag:       "Original baseline",
  },
  {
    label:     "Run 10 — Dev rerun\n(Apr 27, today)",
    model:     "Opus 4.7",
    modelFill: "E2EFDA",
    passRate:  "86.9%",
    rateFill:  "FFF2CC",
    rateColor: "7F6000",
    detail:    "53 / 61 steps",
    env:       "Dev",
    date:      "Apr 27, 2026",
    tag:       "Dev env today",
  },
  {
    label:     "Run 9 — PR 347 Preview\n(Apr 27, today)",
    model:     "Opus 4.7",
    modelFill: "E2EFDA",
    passRate:  "77.0%",
    rateFill:  "FCE4D6",
    rateColor: "9C0006",
    detail:    "47 / 61 steps",
    env:       "Preview",
    date:      "Apr 27, 2026",
    tag:       "PR 347 Preview",
  },
];

const RUBRIC_NARRATIVE = {
  headline: "The Dev environment has regressed since the Run 7 baseline: 95.0% → 86.9%, a 8-point drop without any change of tester or model. Preview (Run 9) is worse still at 77.0%.",
  drops: [
    "Dev env (Run 10 vs Run 7): 5 new failures appeared — Steps 5, 6, 25, 26b, and 55. Step 5 (auth checkbox) and Step 55 (TC2 household members) are notable because they were clean in the original Dev baseline. Step 21 (SSN) recovered. Steps 37 and 53 remain persistent failures in both Dev runs.",
    "Preview is worse than Dev across the board: Run 9 fails 3 additional steps that Dev passes — Step 1 (wrong applicant), Step 29 (gap analysis skipped), and Step 38 (contact method asked when in DB). Steps 32, 33, 40, and 41 were skipped entirely in Preview but scored and passed in Dev.",
    "Shared regressions in both Dev and Preview (vs original baseline): Steps 5, 6, 25, 26b, 55. These 5 steps are failing regardless of environment, suggesting a model-level behavior change rather than an environment-specific issue.",
  ],
  pattern: "The persistent shared failures (Steps 5, 6, 25, 26b, 55) are the most actionable signal — they show up in both Dev and Preview today, while they passed in the Apr 24 Dev baseline. Step 37 and 53 are long-standing known issues. Preview adds 3 more failures on top of Dev, so the Preview environment is introducing additional instability beyond the Dev baseline regression.",
};

// status: "PASS" | "FAIL" | "WARN" | "SKIP" | "—"
const FAILURES = [
  {
    issue: "Step 1 — Gap analysis missing / wrong applicant",
    runs:  ["PASS", "PASS", "FAIL"],
    notes: [null, null, "Preview only — used Carlos instead of Rosa"],
  },
  {
    issue: "⚠️ Step 5 — Auth checkbox checked without asking\n(shared regression)",
    runs:  ["PASS", "FAIL", "FAIL"],
    notes: [null, "New failure in Dev today", "Also fails in Preview"],
    critical: true,
  },
  {
    issue: "Step 6 — Child age not deduced from DOB (0–5)\n(shared regression)",
    runs:  ["PASS", "FAIL", "FAIL"],
    notes: [null, "New failure in Dev today", "Also fails in Preview"],
  },
  {
    issue: "Step 21 — SSN not confirmed with caseworker",
    runs:  ["FAIL", "PASS", "PASS"],
    notes: ["Known baseline failure", "Fixed in Dev today ✓", "Also fixed in Preview ✓"],
  },
  {
    issue: "Step 25 — Affirmation section expand failure\n(shared regression)",
    runs:  ["PASS", "FAIL", "FAIL"],
    notes: [null, "New failure in Dev today", "Also fails in Preview"],
  },
  {
    issue: "Step 26b — Submit button not made active\n(shared regression)",
    runs:  ["—", "FAIL", "FAIL"],
    notes: [null, "New in Dev today", "Also fails in Preview"],
  },
  {
    issue: "Step 29 — Gap analysis skipped before BenefitsCal",
    runs:  ["PASS", "PASS", "FAIL"],
    notes: [null, null, "Preview only — immediately started filling application"],
  },
  {
    issue: "Step 37 — Homelessness assumed No (persistent, all runs)",
    runs:  ["FAIL", "FAIL", "FAIL"],
    notes: ["Known failure", "Recurring", "Recurring"],
  },
  {
    issue: "Step 38 — Preferred contact method asked when in DB",
    runs:  ["PASS", "PASS", "FAIL"],
    notes: [null, null, "Preview only — contact method (text) is in database"],
  },
  {
    issue: "Step 53 — Ethnicity mapping TC2 (persistent)",
    runs:  ["FAIL", "FAIL", "FAIL"],
    notes: ["Known failure", "Recurring", "Recurring"],
  },
  {
    issue: "Step 55 — Household members TC2 not identified\n(shared regression)",
    runs:  ["PASS", "FAIL", "FAIL"],
    notes: [null, "New failure in Dev today", "Also fails in Preview"],
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
const n=(t,sz=18)=>new TextRun({text:t,font:"Arial",size:sz});
const it=(t,sz=16)=>new TextRun({text:t,italics:true,font:"Arial",size:sz,color:MIDGREY});

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
        mkCell("Environment", LW, LGREY, {bold:true}),
        ...RUNS.map(r => mkCell(r.env, RW, LGREY, {center:true})),
      ]}),
      new TableRow({children:[
        mkCell("Pass rate", LW, LGREY, {bold:true, sz:19}),
        ...RUNS.map(r => mkCell(r.passRate, RW, r.rateFill, {bold:true, sz:26, center:true, color:r.rateColor})),
      ]}),
      new TableRow({children:[
        mkCell("Steps (scored)", LW, LGREY),
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
      border:{bottom:{style:BorderStyle.SINGLE,size:4,color:BLUE,space:3}},
      children:[new TextRun({text:"Analysis",bold:true,font:"Arial",size:22,color:NAVY})]
    }),
    new Paragraph({spacing:{before:60,after:60},children:[n(RUBRIC_NARRATIVE.headline,18)]}),
    ...RUBRIC_NARRATIVE.drops.map(d => bul(d)),
    new Paragraph({spacing:{before:60,after:80},children:[n(RUBRIC_NARRATIVE.pattern,18)]}),
  ];
}

// ── Failures table ────────────────────────────────────────────────────────────
const IW = 2900;
const FW = Math.floor((10080 - IW) / (nCols + 1));

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
  const runWidths = RUNS.map((_, i) => i === RUNS.length - 1 ? FW * 2 : FW);
  const totalWidth = IW + runWidths.reduce((a,b)=>a+b,0);
  runWidths[runWidths.length-1] += (10080 - totalWidth);

  const hdrLabels = [
    "Run 7 — Dev (Apr 24)",
    "Run 10 — Dev (Apr 27)",
    "Run 9 — Preview (Apr 27)",
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
        border:{bottom:{style:BorderStyle.SINGLE,size:6,color:BLUE,space:4}},
        children:[
          new TextRun({text:`Agent Evaluation — Dev Regression Check  ·  ${REPORT_DATE}`,bold:true,font:"Arial",size:30,color:NAVY}),
          new TextRun({text:"    Dev (Apr 24 baseline) vs Dev (today) vs PR 347 Preview (today)",font:"Arial",size:19,color:MIDGREY}),
        ]
      }),
      sp(),

      // Context
      new Paragraph({
        spacing:{before:40,after:100},
        children:[
          new TextRun({text:"Purpose: ",bold:true,font:"Arial",size:18}),
          n("Determine whether the regression seen in PR 347 Preview (Run 9) is also present in the current Dev environment. TC1 = Rosa Flores (BenefitsCal)  ·  TC2 = Carolina Reyes (IHSS)  ·  Same model (Opus 4.7) across all runs.", 18),
        ]
      }),

      // Summary table
      summaryTable(),

      // Analysis
      ...rubricSection(),

      // Failures table
      new Paragraph({
        spacing:{before:40,after:80},
        border:{bottom:{style:BorderStyle.SINGLE,size:4,color:BLUE,space:3}},
        children:[new TextRun({text:"Step-Level Comparison",bold:true,font:"Arial",size:22,color:NAVY})]
      }),
      failuresTable(),
      sp(),

      // Footer
      new Paragraph({
        spacing:{before:40,after:0},
        border:{top:{style:BorderStyle.SINGLE,size:3,color:"CCCCCC",space:2}},
        children:[it("Sources: Run 7 (Dev, Apr 24 2026): 57/60 = 95.0%. Run 10 (Dev manual baseline, Apr 27 2026): 53/61 = 86.9%, from eval_Dev__manual_baseline____Opus_4_7__2026-04-27.csv. Run 9 (PR 347 Preview, Apr 27 2026): 47/61 = 77.0%, from eval_PR_347___Opus_4_7__2026-04-27.csv.")]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(REPORT_FILE, buf);
  console.log(`Done → ${REPORT_FILE}`);
});
