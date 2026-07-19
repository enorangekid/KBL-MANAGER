import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "outputs", "kbl_formula_calculator");
const outputPath = path.join(outputDir, "KBL_능력치_공식계산기.xlsx");
const previewPath = path.join(outputDir, "KBL_능력치_공식계산기_preview.png");

await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const guide = workbook.worksheets.add("사용법");
const input = workbook.worksheets.add("입력데이터");
const result = workbook.worksheets.add("계산결과");
const formula = workbook.worksheets.add("공식표");

for (const sheet of [guide, input, result, formula]) {
  sheet.showGridLines = false;
}

function setHeader(range) {
  range.format = {
    fill: "#061B4F",
    font: { bold: true, color: "#FFFFFF" },
  };
}

function setSubHeader(range) {
  range.format = {
    fill: "#FF5A1F",
    font: { bold: true, color: "#FFFFFF" },
  };
}

guide.getRange("A1:H1").merge();
guide.getRange("A1").values = [["KBL 능력치 공식 계산기"]];
guide.getRange("A1").format = {
  fill: "#061B4F",
  font: { bold: true, color: "#FFFFFF", size: 16 },
};
guide.getRange("A3:B8").values = [
  ["1", "입력데이터 시트에 선수 기본정보와 경기 기록을 붙여넣습니다."],
  ["2", "계산결과 시트에서 기록 기반 능력치가 자동 계산됩니다."],
  ["3", "현재능력, 잠재능력, 히든 능력치는 이 파일에서 계산하지 않습니다."],
  ["4", "정규화는 입력데이터 시트에 들어간 선수 풀 기준으로 계산됩니다."],
  ["5", "SAST, DFL 등 빈 기록은 0으로 계산됩니다."],
  ["6", "KBL_stat.xlsx를 참조하지 않는 독립 계산 파일입니다."],
];
setHeader(guide.getRange("A3:B3"));
guide.getRange("A3:B8").format.borders = { preset: "inside", style: "thin", color: "#D9DEE8" };
guide.getRange("A:A").format.columnWidth = 8;
guide.getRange("B:B").format.columnWidth = 95;
guide.getRange("B:B").format.wrapText = true;

const inputHeaders = [
  "팀", "선수", "선수ID", "생년월일", "국적", "출생지", "출신 대학", "신장", "체중", "윙스팬", "포지션",
  "GP", "W", "L", "MIN", "PTS", "2PM", "2PA", "2P%", "3PM", "3PA", "3P%", "FGM", "FGA", "FG%",
  "FTM", "FTA", "FT%", "OREB", "DREB", "REB", "AST", "STL", "BLK", "GD", "DK", "DKA", "TO", "PF",
  "PP", "PPA", "PP%", "+/-", "DD2", "TD3", "SAST", "DFL",
];
input.getRangeByIndexes(0, 0, 1, inputHeaders.length).values = [inputHeaders];
setHeader(input.getRangeByIndexes(0, 0, 1, inputHeaders.length));
input.freezePanes.freezeRows(1);
input.freezePanes.freezeColumns(2);
input.getRangeByIndexes(0, 0, 101, inputHeaders.length).format.borders = {
  preset: "inside",
  style: "thin",
  color: "#E5E7EB",
};
input.getRangeByIndexes(0, 0, 1, inputHeaders.length).format.autofitColumns();

const resultHeaders = [
  "팀", "선수", "포지션", "신장", "체중", "윙스팬", "GP", "MIN",
  "근거리슛", "드라이빙레이업", "드라이빙덩크", "스탠딩덩크", "포스트컨트롤", "중거리슛", "3점슛", "자유투",
  "패스", "볼핸들링", "스틸", "블록", "공격리바운드", "수비리바운드", "인사이드수비", "외곽수비",
  "OVR", "볼과함께뛰는속도", "스피드", "민첩성", "힘", "점프력",
];
const rawHeaders = [
  "RAW_근거리슛", "RAW_드라이빙레이업", "RAW_드라이빙덩크", "RAW_스탠딩덩크", "RAW_포스트컨트롤", "RAW_중거리슛",
  "RAW_3점슛", "RAW_자유투", "RAW_패스", "RAW_볼핸들링", "RAW_스틸", "RAW_블록", "RAW_공격리바운드",
  "RAW_수비리바운드", "RAW_인사이드수비", "RAW_외곽수비",
];
const allResultHeaders = [...resultHeaders, ...rawHeaders];
result.getRangeByIndexes(0, 0, 1, allResultHeaders.length).values = [allResultHeaders];
setHeader(result.getRangeByIndexes(0, 0, 1, allResultHeaders.length));
result.freezePanes.freezeRows(1);
result.freezePanes.freezeColumns(2);

const maxRows = 100;
const firstDataRow = 2;
const lastDataRow = maxRows + 1;
const rawStartCol = resultHeaders.length + 1;

function q(sheetName, col, row) {
  return `='${sheetName}'!${col}${row}`;
}

function blankIfNoPlayer(ref, row) {
  return `=IF('입력데이터'!$B${row}="","",${ref.slice(1)})`;
}

function nz(ref) {
  return `IFERROR(${ref},0)`;
}

const inputCol = {
  team: "A", player: "B", height: "H", weight: "I", wingspan: "J", position: "K", gp: "L", min: "O",
  pts: "P", twoPm: "Q", twoPp: "S", threePm: "T", threePa: "U", threePp: "V", fgP: "Y",
  ftm: "Z", fta: "AA", ftP: "AB", oreb: "AC", dreb: "AD", reb: "AE", ast: "AF", stl: "AG", blk: "AH",
  gd: "AI", dk: "AJ", dka: "AK", to: "AL", pp: "AN", ppa: "AO", ppP: "AP", sast: "AT", dfl: "AU",
};

for (let i = 0; i < maxRows; i++) {
  const row = firstDataRow + i;
  const inputRow = row;
  const outputRow = row;
  const baseFormulas = [
    blankIfNoPlayer(q("입력데이터", inputCol.team, inputRow), inputRow),
    blankIfNoPlayer(q("입력데이터", inputCol.player, inputRow), inputRow),
    blankIfNoPlayer(q("입력데이터", inputCol.position, inputRow), inputRow),
    blankIfNoPlayer(q("입력데이터", inputCol.height, inputRow), inputRow),
    blankIfNoPlayer(q("입력데이터", inputCol.weight, inputRow), inputRow),
    blankIfNoPlayer(q("입력데이터", inputCol.wingspan, inputRow), inputRow),
    blankIfNoPlayer(q("입력데이터", inputCol.gp, inputRow), inputRow),
    blankIfNoPlayer(q("입력데이터", inputCol.min, inputRow), inputRow),
  ];
  result.getRangeByIndexes(outputRow - 1, 0, 1, baseFormulas.length).formulas = [baseFormulas];

  const r = {
    pts: nz(q("입력데이터", inputCol.pts, inputRow)),
    twoPm: nz(q("입력데이터", inputCol.twoPm, inputRow)),
    twoPp: nz(q("입력데이터", inputCol.twoPp, inputRow)),
    threePm: nz(q("입력데이터", inputCol.threePm, inputRow)),
    threePa: nz(q("입력데이터", inputCol.threePa, inputRow)),
    threePp: nz(q("입력데이터", inputCol.threePp, inputRow)),
    fgP: nz(q("입력데이터", inputCol.fgP, inputRow)),
    ftm: nz(q("입력데이터", inputCol.ftm, inputRow)),
    fta: nz(q("입력데이터", inputCol.fta, inputRow)),
    ftP: nz(q("입력데이터", inputCol.ftP, inputRow)),
    oreb: nz(q("입력데이터", inputCol.oreb, inputRow)),
    dreb: nz(q("입력데이터", inputCol.dreb, inputRow)),
    reb: nz(q("입력데이터", inputCol.reb, inputRow)),
    ast: nz(q("입력데이터", inputCol.ast, inputRow)),
    stl: nz(q("입력데이터", inputCol.stl, inputRow)),
    blk: nz(q("입력데이터", inputCol.blk, inputRow)),
    gd: nz(q("입력데이터", inputCol.gd, inputRow)),
    dk: nz(q("입력데이터", inputCol.dk, inputRow)),
    dka: nz(q("입력데이터", inputCol.dka, inputRow)),
    to: nz(q("입력데이터", inputCol.to, inputRow)),
    pp: nz(q("입력데이터", inputCol.pp, inputRow)),
    ppa: nz(q("입력데이터", inputCol.ppa, inputRow)),
    ppP: nz(q("입력데이터", inputCol.ppP, inputRow)),
    sast: nz(q("입력데이터", inputCol.sast, inputRow)),
    dfl: nz(q("입력데이터", inputCol.dfl, inputRow)),
  };

  const rawFormulas = [
    `=${r.twoPp}*0.4+${r.ppP}*0.4+${r.ppa}*0.5`,
    `=${r.twoPp}*0.5+${r.pts}*0.8+${r.stl}`,
    `=${r.dk}*8+IFERROR(${r.dk}/${r.dka},0)*30`,
    `=${r.dk}*6+${r.blk}*4`,
    `=${r.ppP}*0.4+${r.reb}*1.5+${r.twoPm}*1.5`,
    `=MAX(0,${r.pts}-${r.twoPm}*2-${r.threePm}*3-${r.ftm})*1.5+${r.fgP}*0.3`,
    `=${r.threePp}*0.6+${r.threePa}*2+${r.threePm}*3`,
    `=${r.ftP}*0.7+${r.fta}*1.5`,
    `=${r.ast}*5+IFERROR(${r.ast}/${r.to},0)*3+${r.sast}`,
    `=${r.ast}*3+${r.stl}*3+IFERROR(${r.ast}/${r.to},0)*4`,
    `=${r.stl}*12+${r.dfl}*6`,
    `=${r.blk}*14+${r.dreb}`,
    `=${r.oreb}*10`,
    `=${r.dreb}*7+${r.blk}*2`,
    `=${r.blk}*8+${r.dreb}*2+${r.gd}*4`,
    `=${r.stl}*8+${r.gd}*5+${r.dfl}*4`,
  ];
  result.getRangeByIndexes(outputRow - 1, rawStartCol - 1, 1, rawFormulas.length).formulas = [rawFormulas];

  const normalizedFormulas = [];
  for (let j = 0; j < rawHeaders.length; j++) {
    const rawColIndex = rawStartCol + j;
    const rawColLetter = columnLetter(rawColIndex);
    const rawCell = `${rawColLetter}${outputRow}`;
    const rawRange = `$${rawColLetter}$${firstDataRow}:$${rawColLetter}$${lastDataRow}`;
    normalizedFormulas.push(`=IF($B${outputRow}="", "", ROUND(MAX(30, MIN(99, IFERROR((${rawCell}-MIN(${rawRange}))/(MAX(${rawRange})-MIN(${rawRange}))*99,30))),0))`);
  }
  result.getRangeByIndexes(outputRow - 1, 8, 1, normalizedFormulas.length).formulas = [normalizedFormulas];
  result.getRangeByIndexes(outputRow - 1, 24, 1, 1).formulas = [[`=IF($B${outputRow}="","",ROUND(AVERAGE(I${outputRow}:X${outputRow}),0))`]];

  const pos = `UPPER(SUBSTITUTE($C${outputRow},"/","-"))`;
  const height = `IFERROR($D${outputRow},195)`;
  const weight = `IFERROR($E${outputRow},95)`;
  const wingspan = `IFERROR($F${outputRow},200)`;
  const speedBase = `IFS(ISNUMBER(SEARCH("PG",${pos})),84,ISNUMBER(SEARCH("SG",${pos})),76,ISNUMBER(SEARCH("SF",${pos})),68,ISNUMBER(SEARCH("PF",${pos})),55,ISNUMBER(SEARCH("C",${pos})),42,TRUE,65)`;
  const strengthBase = `IFS(ISNUMBER(SEARCH("C",${pos})),92,ISNUMBER(SEARCH("PF",${pos})),82,ISNUMBER(SEARCH("SF",${pos})),64,ISNUMBER(SEARCH("SG",${pos})),48,ISNUMBER(SEARCH("PG",${pos})),36,TRUE,60)`;
  const physicalFormulas = [
    `=IF($B${outputRow}="","",ROUND(MAX(30,MIN(99,${speedBase}+((195-${height})*0.15)+((95-${weight})*0.08))),0))`,
    `=IF($B${outputRow}="","",ROUND(MAX(30,MIN(99,${speedBase}+((195-${height})*0.18)+((95-${weight})*0.10))),0))`,
    `=IF($B${outputRow}="","",ROUND(MAX(30,MIN(99,${speedBase}+2+((195-${height})*0.14)+((95-${weight})*0.09))),0))`,
    `=IF($B${outputRow}="","",ROUND(MAX(30,MIN(99,${strengthBase}+((${weight}-95)*0.45)+((${height}-195)*0.10)+((${wingspan}-200)*0.08))),0))`,
    `=IF($B${outputRow}="","",ROUND(MAX(30,MIN(99,65+((${wingspan}-200)*0.22)+((${height}-195)*0.08)-((${weight}-95)*0.07))),0))`,
  ];
  result.getRangeByIndexes(outputRow - 1, 25, 1, physicalFormulas.length).formulas = [physicalFormulas];
}

result.getRangeByIndexes(0, 0, maxRows + 1, allResultHeaders.length).format.borders = {
  preset: "inside",
  style: "thin",
  color: "#E5E7EB",
};
result.getRangeByIndexes(1, 8, maxRows, 22).format.numberFormat = "0";
result.getRangeByIndexes(1, 8, maxRows, 22).conditionalFormats.add("colorScale", {
  criteria: [
    { type: "lowestValue", color: "#F97316" },
    { type: "percentile", value: 50, color: "#FDE68A" },
    { type: "highestValue", color: "#22C55E" },
  ],
});
result.getRangeByIndexes(0, 0, 1, allResultHeaders.length).format.autofitColumns();

const formulaRows = [
  ["근거리슛", "2P% × 0.4 + PP% × 0.4 + PPA × 0.5"],
  ["드라이빙레이업", "2P% × 0.5 + PTS × 0.8 + STL × 1.0"],
  ["드라이빙덩크", "DK × 8 + (DK/DKA) × 30"],
  ["스탠딩덩크", "DK × 6 + BLK × 4"],
  ["포스트컨트롤", "PP% × 0.4 + REB × 1.5 + 2PM × 1.5"],
  ["중거리슛", "MAX(0, PTS - 2PM×2 - 3PM×3 - FTM) × 1.5 + FG% × 0.3"],
  ["3점슛", "3P% × 0.6 + 3PA × 2 + 3PM × 3"],
  ["자유투", "FT% × 0.7 + FTA × 1.5"],
  ["패스", "AST × 5 + (AST/TO) × 3 + SAST"],
  ["볼핸들링", "AST × 3 + STL × 3 + (AST/TO) × 4"],
  ["스틸", "STL × 12 + DFL × 6"],
  ["블록", "BLK × 14 + DREB"],
  ["공격리바운드", "OREB × 10"],
  ["수비리바운드", "DREB × 7 + BLK × 2"],
  ["인사이드수비", "BLK × 8 + DREB × 2 + GD × 4"],
  ["외곽수비", "STL × 8 + GD × 5 + DFL × 4"],
  ["정규화", "(선수 RAW - 입력 선수풀 최소 RAW) / (최대 RAW - 최소 RAW) × 99, 최소 30 보장"],
  ["OVR", "기록 기반 16개 능력치 평균"],
  ["피지컬", "KBL_stat 없이 포지션, 신장, 체중, 윙스팬만으로 임시 계산"],
];
formula.getRange("A1:B1").merge();
formula.getRange("A1").values = [["능력치 공식표"]];
formula.getRange("A1").format = {
  fill: "#061B4F",
  font: { bold: true, color: "#FFFFFF", size: 14 },
};
formula.getRangeByIndexes(2, 0, formulaRows.length + 1, 2).values = [["능력치", "공식"], ...formulaRows];
setHeader(formula.getRange("A3:B3"));
formula.getRangeByIndexes(2, 0, formulaRows.length + 1, 2).format.borders = {
  preset: "inside",
  style: "thin",
  color: "#D9DEE8",
};
formula.getRange("A:A").format.columnWidth = 20;
formula.getRange("B:B").format.columnWidth = 95;
formula.getRange("B:B").format.wrapText = true;

const inspect = await workbook.inspect({
  kind: "sheet,table",
  maxChars: 4000,
  tableMaxRows: 5,
  tableMaxCols: 8,
});
console.log(inspect.ndjson);

const preview = await workbook.render({
  sheetName: "사용법",
  autoCrop: "all",
  scale: 1,
  format: "png",
});
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);

function columnLetter(index1Based) {
  let n = index1Based;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}
