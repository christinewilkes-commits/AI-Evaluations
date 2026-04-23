// ─────────────────────────────────────────────────────────────────────────────
// Agent Eval Comparison Report — reusable template
// Fill in the RUN_DATA and FAILURES objects below for each new eval session,
// then run:  node generate_report.js
// Output:    eval_comparison_YYYY-MM-DD.docx
// ─────────────────────────────────────────────────────────────────────────────

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, LevelFormat, Header, PageNumber
} = require('docx');
const fs = require('fs');

// ══════════════════════════════════════════════════════════════════════════════
// ① EDIT THIS SECTION FOR EACH NEW EVAL RUN
// ══════════════════════════════════════════════════════════════════════════════

const REPORT_DATE = "April 23, 2026";
const REPORT_FILE = "eval_comparison_2026-04-23.docx";

// One entry per run column. First entry is always the baseline.
const RUNS = [
  {
    label:     "Opus 4.7\nApr 20 (Baseline)",
    model:     "Opus 4.7",
    modelFill: "E2EFDA",   // green tint for Opus
    passRate:  "93.3%",
    rateFill:  "E2EFDA",
    rateColor: "375623",
  },
  {
    label:     "Opus 4.7\n+ PR 344  (Apr 23)",
    model:     "Opus 4.7",
    modelFill: "E2EFDA",
    passRate:  "78.7%",
    rateFill:  "FFF2CC",
    rateColor: "7F6000",
  },
  {
    label:     "Sonnet 4.6\n+ PR 344  (Apr 23)",
    model:     "Sonnet 4.6",
    modelFill: "D6E4F0",   // blue tint for Sonnet
    passRate:  "78.3%",
    rateFill:  "FCE4D6",
    rateColor: "9C0006",
  },
];

// Category breakdown narrative — edit the three bullet texts
const RUBRIC_NARRATIVE = {
  stable: "Navigation, Verbosity, and Hallucination held at 100% across both models — those categories are stable. Everything else regressed.",
  drops: [
    "Clicking / UI Interaction fell the hardest for Opus: 100% → 50%. This is a new failure pattern — the baseline Opus had no UI issues. PR 344 introduced a bug where Opus loses form state after a caseworker Take Control handback, causing dropdowns and the submit button to fail on return.",
    "Ask Questions fell the hardest for Sonnet: 85% → 57% — a 28-point drop. Six out of fourteen Ask Questions steps failed, including the SSN ethnicity inference (Step 30), assuming program selection without asking (Step 31), and skipping spouse info and child citizenship.",
    "Deduction dropped for both models (90% → 75% Opus, 90% → 80% Sonnet), driven by household member identification failures and, for Opus, form fields appearing in the review card that were never actually submitted to the form.",
  ],
  pattern: "The pattern suggests PR 344 specifically reduced Opus's UI interaction reliability and Sonnet's question-asking discipline.",
};

// Failures table — focus on NEW failures vs baseline; omit recurring known issues
// status: "PASS" | "FAIL" | "WARN" (red with ⚠) | "—" (not applicable)
const FAILURES = [
  {
    issue:   "Gap analysis skipped before BenefitsCal",
    runs:    ["PASS", "FAIL", "FAIL"],
    notes:   [null, null, "Both models skip this in TC1 and TC2"],
  },
  {
    issue:   "Child citizenship not asked (Step 33)",
    runs:    ["PASS", "FAIL", "FAIL"],
    notes:   [null, null, "New failure in both PR 344 runs"],
  },
  {
    issue:   "Preferred contact method asked when already in DB (Step 38)",
    runs:    ["PASS", "FAIL", "FAIL"],
    notes:   [null, null, "New failure — agent queried caseworker unnecessarily"],
  },
  {
    issue:   "Household members not correctly identified (Step 20)",
    runs:    ["PASS", "FAIL", "FAIL"],
    notes:   [null, null, "Regression in both models with PR 344"],
  },
  {
    issue:   "⚠️ SSN not asked — assumed based on applicant's ethnicity (Step 30)",
    runs:    ["PASS", "PASS", "WARN"],
    notes:   [null, null, "Critical: \"Since Rosa is Hispanic/Latino and has no SSN… I'll select 'No califica para un SSN'\" — fairness concern"],
    critical: true,
  },
  {
    issue:   "Assumed program selection without asking (Step 31)",
    runs:    ["PASS", "PASS", "FAIL"],
    notes:   [null, null, "Sonnet checked all three programs (CalFresh, CalWORKs, Medi-Cal) without prompting"],
  },
  {
    issue:   "Deduction errors: ethnic origin/zip not on form, Carlos not noted (Step 19)",
    runs:    ["PASS", "FAIL", "—"],
    notes:   [null, "Opus only; review card showed data not actually submitted to form", null],
  },
  {
    issue:   "Didn't check that the child's age qualified mother for WIC",
    runs:    ["PASS", "FAIL", "—"],
    notes:   [null, "Opus only today; was correct in baseline", null],
  },
  {
    issue:   "Affirmation section expand / dropdown failures (Steps 25–26)",
    runs:    ["PASS", "FAIL", "—"],
    notes:   [null, null, null],
  },
  {
    issue:   "Submit button 'not active' — agent pushed back on caseworker (Step 26b)",
    runs:    ["PASS", "FAIL", "—"],
    notes:   [null, "Opus claimed optional fields must be filled first before trying submit", null],
  },
  {
    issue:   "Telephone field not actually filled (Step 24)",
    runs:    ["PASS", "—", "FAIL"],
    notes:   [null, null, "Sonnet confirmed action but field remained empty"],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// ② DOCUMENT BUILDER — no edits needed below this line
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
const bulRuns=(runs)=>new Paragraph({
  numbering:{reference:"bullets",level:0},spacing:{before:30,after:30},children:runs
});
const b=(t,sz=19)=>new TextRun({text:t,bold:true,font:"Arial",size:sz});
const n=(t,sz=18)=>new TextRun({text:t,font:"Arial",size:sz});
const it=(t,sz=16)=>new TextRun({text:t,italics:true,font:"Arial",size:sz,color:MIDGREY});

// Portrait 8.5×11, 0.6" margins → content = 10080 twips
const nCols = RUNS.length;
const LW = 2200;
const RW = Math.floor((10080 - LW) / nCols);

// ── Summary table (Model + Pass Rate only) ────────────────────────────────────
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
        mkCell("Pass rate", LW, LGREY, {bold:true, sz:19}),
        ...RUNS.map(r => mkCell(r.passRate, RW, r.rateFill, {bold:true, sz:22, center:true, color:r.rateColor})),
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
    new Paragraph({spacing:{before:60,after:40},children:[new TextRun({text:"The biggest drops vs. baseline Opus:",font:"Arial",size:18})]}),
    ...RUBRIC_NARRATIVE.drops.map(d => bul(d)),
    new Paragraph({spacing:{before:60,after:80},children:[n(RUBRIC_NARRATIVE.pattern,18)]}),
  ];
}

// ── Failures table ────────────────────────────────────────────────────────────
const IW = 3200;
const FW = Math.floor((10080 - IW) / (nCols + 1)); // +1 because last col has note

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
  // Last run column is wider to accommodate notes
  const runWidths = RUNS.map((_, i) => i === RUNS.length - 1 ? FW * 2 : FW);
  const totalWidth = IW + runWidths.reduce((a,b)=>a+b,0);
  // Adjust if needed
  const adj = 10080 - totalWidth;
  runWidths[runWidths.length-1] += adj;

  const headerRow = new TableRow({children:[
    hdrCell("Failure", IW),
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
          new TextRun({text:`    ${RUNS.filter((_,i)=>i>0).map(r=>r.model).join(" vs. ")}  ·  vs. ${RUNS[0].label.split("\n")[0]} Baseline`,font:"Arial",size:20,color:MIDGREY}),
        ]
      }),
      sp(),

      // Summary table
      summaryTable(),

      // Rubric narrative
      ...rubricSection(),

      // Failures table
      new Paragraph({
        spacing:{before:40,after:80},
        border:{bottom:{style:BorderStyle.SINGLE,size:4,color:BLUE,space:3}},
        children:[new TextRun({text:"Notable Failures vs. Baseline",bold:true,font:"Arial",size:22,color:NAVY})]
      }),
      failuresTable(),
      sp(),

      // Footer footnote
      new Paragraph({
        spacing:{before:40,after:0},
        border:{top:{style:BorderStyle.SINGLE,size:3,color:"CCCCCC",space:2}},
        children:[it(`Sources: Eval runner CSVs. Baseline (${RUNS[0].label.replace('\n',' ')}): BigQuery + Cloud SQL + PostHog. Recurring known failures (WIC checkbox, homelessness, Asian ethnicity) omitted from failures table — see eval runner export for full step-by-step results.`)]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(REPORT_FILE, buf);
  console.log(`Done → ${REPORT_FILE}`);
});
