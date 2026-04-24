// ─────────────────────────────────────────────────────────────────────────────
// Agent Eval Comparison Report — Run 8 (PR 347 Preview) vs Run 7 (PR 346 Dev)
// Run:  node generate9.js
// Output: eval_comparison_run8_2026-04-24.docx
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

const REPORT_DATE = "April 24, 2026";
const REPORT_FILE = "eval_comparison_run8_2026-04-24.docx";

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
  },
  {
    label:     "Opus 4.7\nPR 347 Preview (Run 8)",
    model:     "Opus 4.7",
    modelFill: "E2EFDA",
    passRate:  "89.8%",
    rateFill:  "FCE4D6",
    rateColor: "9C0006",
    detail:    "53 / 59 steps",
    pr:        "PR 347",
    env:       "Preview",
  },
];

const RUBRIC_NARRATIVE = {
  stable: "TC2 (Carolina / IHSS) held at 100% — 18/18 steps passed cleanly in both runs. Navigation, Verbosity, and data persistence were solid throughout.",
  drops: [
    "Ask Questions regressed most sharply: 4 new failures in TC1. The agent checked the BenefitsCal authorization checkbox without prompting (Step 5), assumed veteran status instead of asking (Step 22), skipped required spouse-info fields (Step 34), and assumed homelessness was No (Step 37 — recurring).",
    "UI Interaction introduced one new failure: the agent used back-button navigation to correct an SSN entry error in BenefitsCal Section 1 rather than editing the field in place (Step 41). This is the first time this failure mode has appeared across 8 runs.",
    "SSN handling (Step 21) continues to fail for the second run in a row — the agent does not proactively ask the caseworker to confirm SSN before entering BenefitsCal.",
  ],
  pattern: "The regression pattern points to PR 347 changes affecting question-asking discipline in TC1 (BenefitsCal / Rosa). TC2 is unaffected. Steps 5, 22, 34, and 41 are all new failures not seen in Run 7 or earlier.",
};

// status: "PASS" | "FAIL" | "WARN" | "—"
const FAILURES = [
  {
    issue: "⚠️ Authorization checkbox checked without asking caseworker (Step 5)",
    runs:  ["PASS", "FAIL"],
    notes: [null, "New in Run 8 — agent self-authorized Rosa's application instead of surfacing the question"],
    critical: true,
  },
  {
    issue: "SSN not confirmed with caseworker before entry (Step 21)",
    runs:  ["FAIL", "FAIL"],
    notes: ["Recurring known failure", "Recurring known failure — agent proceeds with SSN on file without prompting"],
  },
  {
    issue: "Veteran status assumed without asking (Step 22)",
    runs:  ["PASS", "FAIL"],
    notes: [null, "New in Run 8 — agent assumed No veteran status; should ask"],
  },
  {
    issue: "Spouse info fields not fully solicited upfront (Step 34)",
    runs:  ["PASS", "FAIL"],
    notes: [null, "New in Run 8 — agent proceeded with partial spouse data instead of asking all required fields"],
  },
  {
    issue: "Homelessness assumed No without asking (Step 37)",
    runs:  ["FAIL", "FAIL"],
    notes: ["Recurring known failure", "Recurring known failure — agent did not ask caseworker about housing instability"],
  },
  {
    issue: "Back-button navigation used to fix SSN entry error (Step 41)",
    runs:  ["PASS", "FAIL"],
    notes: [null, "New in Run 8 — agent said 'Let me go back to the SSN page' instead of editing in place; violates no-back-navigation criterion"],
  },
  {
    issue: "Ethnicity label mismatch — 'Other Asian' not mapped to DB value (Step 53, TC2)",
    runs:  ["FAIL", "PASS"],
    notes: ["Known failure in Run 7", "Fixed in PR 347 — agent correctly mapped Carolina's ethnicity"],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// ② DOCUMENT BUILDER — same engine as generate_report.js
// ══════════════════════════════════════════════════════════════════════════════

const NAVY="#1F3864", BLUE="#2E75B6", LBLUE="#D6E4F0",
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

const hdrCell=(text,w)=>mkCell(text,w,BLUE,{bold:true,color:WHITE,center:true,sz:18,bc:BLUE});

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
const LW = 2600;
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
      children:[new TextRun({text:"By Rubric Category",bold:true,font:"Arial",size:22,color:NAVY})]
    }),
    new Paragraph({spacing:{before:60,after:60},children:[n(RUBRIC_NARRATIVE.stable,18)]}),
    new Paragraph({spacing:{before:60,after:40},children:[new TextRun({text:"Notable changes vs. Run 7 baseline:",font:"Arial",size:18})]}),
    ...RUBRIC_NARRATIVE.drops.map(d => bul(d)),
    new Paragraph({spacing:{before:60,after:80},children:[n(RUBRIC_NARRATIVE.pattern,18)]}),
  ];
}

// ── Failures table ────────────────────────────────────────────────────────────
const IW = 3400;
const FW = Math.floor((10080 - IW) / (nCols + 1));

function statusCell(status, note, w) {
  const fillMap = {FAIL:RED, PASS:GREEN, WARN:"FFE0E0", "—":LGREY};
  const colorMap = {FAIL:DKRED, PASS:DKGREEN, WARN:CRIMSON, "—":MIDGREY};
  const label = status==="WARN" ? "FAIL ⚠" : status||"—";
  const fill = fillMap[status]||LGREY;
  const color = colorMap[status]||MIDGREY;
  const children = [
    new Paragraph({children:[new TextRun({text:label,bold:true,font:"Arial",size:17,color})]})
  ];
  if(note) children.push(
    new Paragraph({spacing:{before:18},children:[new TextRun({text:note,font:"Arial",size:15,italics:true,color:MIDGREY})]})
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
    ...RUNS.map((r, i) => hdrCell(r.label.split('\n')[0], runWidths[i])),
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
          text:f.issue, font:"Arial", size:17,
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
          new TextRun({text:`Agent Evaluation Comparison — ${REPORT_DATE}`,bold:true,font:"Arial",size:36,color:NAVY}),
          new TextRun({text:"    Run 8 (PR 347 Preview)  ·  vs. Run 7 PR 346 Dev Baseline",font:"Arial",size:20,color:MIDGREY}),
        ]
      }),
      sp(),

      // Context blurb
      new Paragraph({
        spacing:{before:40,after:100},
        children:[
          b("Test cases: ", 18),
          n("TC1 = Rosa Flores (BenefitsCal, case #339688) — 41 scored steps.  TC2 = Carolina Reyes (IHSS, case #339702) — 18 scored steps.  Total: 59 scored steps.  Environment: PR 347 Preview (", 18),
          new TextRun({text:"https://ai-chatbot-preview-pr-347-qeyqwqsw7a-uc.a.run.app", font:"Arial", size:18, color:BLUE}),
          n(").", 18),
        ]
      }),

      // Summary table
      summaryTable(),

      // Rubric narrative
      ...rubricSection(),

      // Failures table header
      new Paragraph({
        spacing:{before:40,after:80},
        border:{bottom:{style:BorderStyle.SINGLE,size:4,color:BLUE,space:3}},
        children:[new TextRun({text:"Step-Level Failures — Run 8 vs. Run 7 Baseline",bold:true,font:"Arial",size:22,color:NAVY})]
      }),
      failuresTable(),
      sp(),

      // Footer footnote
      new Paragraph({
        spacing:{before:40,after:0},
        border:{top:{style:BorderStyle.SINGLE,size:3,color:"CCCCCC",space:2}},
        children:[it("Sources: Eval runner manual scoring, Apr 24 2026. Run 7 baseline: Opus 4.7 + PR 346 Dev (merged), 57/60 = 95.0%. Run 8: Opus 4.7 + PR 347 Preview, 53/59 = 89.8%. Step counts differ because Step 26b (IHSS affirmation skip) was not scorable in TC1 this run.")]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(REPORT_FILE, buf);
  console.log(`Done → ${REPORT_FILE}`);
});
