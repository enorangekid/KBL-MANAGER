import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "outputs", "kbl_ratings_v2");
const data = JSON.parse(await fs.readFile(path.join(outputDir, "kbl_4teams_ratings_v2.json"), "utf8"));

const attrs = data.attrs;
const ratingHeaders = [
  "선수", "포지션", "주포지션", "OVR", "등급", "신장", "체중", "윙스팬", "GP", "MIN",
  ...attrs,
];

function header(range, fill = "#061B4F") {
  range.format = { fill, font: { bold: true, color: "#FFFFFF" } };
}

function baseSheet(sheet) {
  sheet.showGridLines = false;
}

function writeTable(sheet, startRow, startCol, headers, rows) {
  sheet.getRangeByIndexes(startRow, startCol, rows.length + 1, headers.length).values = [headers, ...rows];
  header(sheet.getRangeByIndexes(startRow, startCol, 1, headers.length));
  sheet.getRangeByIndexes(startRow, startCol, rows.length + 1, headers.length).format.borders = {
    preset: "inside",
    style: "thin",
    color: "#D8DEE9",
  };
  sheet.getRangeByIndexes(startRow, startCol, rows.length + 1, headers.length).format.autofitColumns();
}

function ratingRows(rows, includeTeam = false) {
  const headers = includeTeam ? ["팀", ...ratingHeaders] : ratingHeaders;
  const body = rows.map((row) => headers.map((head) => row[head] ?? ""));
  return { headers, body };
}

async function buildRatingsWorkbook() {
  const workbook = Workbook.create();
  const summary = workbook.worksheets.add("요약");
  baseSheet(summary);
  summary.getRange("A1:F1").merge();
  summary.getRange("A1").values = [["KBL 4팀 능력치 초안 V2"]];
  summary.getRange("A1").format = {
    fill: "#061B4F",
    font: { bold: true, color: "#FFFFFF", size: 16 },
  };
  summary.getRange("A2:F2").merge();
  summary.getRange("A2").values = [["Min-Max 제외 / 포지션 가중치 / 포지션 기본값 / 신체 보정 적용"]];
  summary.getRange("A2").format = {
    fill: "#FF5A1F",
    font: { bold: true, color: "#FFFFFF" },
  };
  writeTable(summary, 3, 0, ["팀", "선수수", "평균 OVR", "최고 OVR", "최고 선수"], data.summary.map((row) => [
    row["팀"], row["선수수"], row["평균OVR"], row["최고OVR"], row["최고선수"],
  ]));
  writeTable(summary, 10, 0, ["등급", "OVR 범위"], [
    ["MVP급", "95+"],
    ["시즌베스트급", "90~95"],
    ["주전라인업급", "80~90"],
    ["로테이션급", "75~80"],
    ["후보급", "70~75"],
    ["예비/신인급", "60~70"],
    ["육성/저기록", "60 미만"],
  ]);
  summary.freezePanes.freezeRows(4);

  const all = workbook.worksheets.add("전체");
  baseSheet(all);
  const allData = ratingRows(data.rows, true);
  writeTable(all, 0, 0, allData.headers, allData.body);
  all.freezePanes.freezeRows(1);
  all.freezePanes.freezeColumns(2);
  all.getRangeByIndexes(1, 4, allData.body.length, allData.headers.length - 4).format.numberFormat = "0";
  all.getRangeByIndexes(1, 4, allData.body.length, 1).conditionalFormats.add("colorScale", {
    criteria: [
      { type: "lowestValue", color: "#F97316" },
      { type: "percentile", value: 50, color: "#FDE68A" },
      { type: "highestValue", color: "#22C55E" },
    ],
  });

  for (const [team, rows] of Object.entries(data.rows_by_team)) {
    const sheet = workbook.worksheets.add(team.replace(/[\\/?*[\]:]/g, " "));
    baseSheet(sheet);
    sheet.getRange("A1:H1").merge();
    sheet.getRange("A1").values = [[`${team} 능력치 초안`]];
    sheet.getRange("A1").format = {
      fill: "#061B4F",
      font: { bold: true, color: "#FFFFFF", size: 14 },
    };
    const teamData = ratingRows(rows, false);
    writeTable(sheet, 2, 0, teamData.headers, teamData.body);
    sheet.freezePanes.freezeRows(3);
    sheet.freezePanes.freezeColumns(2);
    sheet.getRangeByIndexes(3, 3, teamData.body.length, 1).conditionalFormats.add("colorScale", {
      criteria: [
        { type: "lowestValue", color: "#F97316" },
        { type: "percentile", value: 50, color: "#FDE68A" },
        { type: "highestValue", color: "#22C55E" },
      ],
    });
  }

  const notes = workbook.worksheets.add("산출메모");
  baseSheet(notes);
  notes.getRange("A1:B1").merge();
  notes.getRange("A1").values = [["산출 메모"]];
  notes.getRange("A1").format = {
    fill: "#061B4F",
    font: { bold: true, color: "#FFFFFF", size: 14 },
  };
  writeTable(notes, 2, 0, ["번호", "내용"], data.notes.map((note, index) => [index + 1, note]));
  notes.getRange("B:B").format.columnWidth = 110;
  notes.getRange("B:B").format.wrapText = true;

  const outputPath = path.join(outputDir, "KBL_4팀_능력치_초안_V2.xlsx");
  const preview = await workbook.render({ sheetName: "요약", autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(path.join(outputDir, "KBL_4팀_능력치_초안_V2_preview.png"), new Uint8Array(await preview.arrayBuffer()));
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(outputPath);
  return outputPath;
}

async function buildFormulaWorkbook() {
  const workbook = Workbook.create();
  const guide = workbook.worksheets.add("사용법");
  const formula = workbook.worksheets.add("공식요약");
  const weights = workbook.worksheets.add("포지션가중치");
  const grades = workbook.worksheets.add("등급기준");
  [guide, formula, weights, grades].forEach(baseSheet);

  guide.getRange("A1:B1").merge();
  guide.getRange("A1").values = [["KBL 능력치 공식 계산기 V2"]];
  guide.getRange("A1").format = {
    fill: "#061B4F",
    font: { bold: true, color: "#FFFFFF", size: 16 },
  };
  writeTable(guide, 2, 0, ["핵심", "내용"], [
    ["정규화", "Min-Max 사용 안 함"],
    ["능력치", "기록 점수 + 포지션 기본값 + 포지션 바닥값 + 신체 보정"],
    ["OVR", "포지션별 가중치로 계산"],
    ["히든", "현재능력~더티플레이는 계산하지 않음"],
    ["용도", "사용자가 직접 보는 계산기보다, 이후 내가 산출할 때 참고하는 기준 파일"],
  ]);

  writeTable(formula, 0, 0, ["능력치", "기준"], [
    ["근거리슛", "2P%, PP%, PPA, 2PM, 빅맨 보정"],
    ["드라이빙레이업", "2P%, PTS, STL, 가드/윙 보정"],
    ["드라이빙덩크", "DK, DK/DKA, 신장/윙스팬"],
    ["스탠딩덩크", "DK, BLK, 신장/윙스팬, 빅맨 보정"],
    ["포스트컨트롤", "PP%, PP, REB, 2PM, 빅맨 보정"],
    ["중거리슛", "추정 중거리득점, FG%, PTS"],
    ["3점슛", "3P%, 3PM, 3PA, 포지션 보정"],
    ["자유투", "FT%, FTA"],
    ["패스", "AST, AST/TO, SAST, PG 보정"],
    ["볼핸들링", "AST, AST/TO, STL, 가드 보정"],
    ["스틸", "STL, DFL, GD, 가드 보정"],
    ["블록", "BLK, DREB, 신장/윙스팬, 빅맨 보정"],
    ["공격리바운드", "OREB, REB, 신장/윙스팬, 빅맨 보정"],
    ["수비리바운드", "DREB, BLK, 신장/윙스팬, 빅맨 보정"],
    ["인사이드수비", "BLK, DREB, GD, 신장/윙스팬, 빅맨 보정"],
    ["외곽수비", "STL, GD, DFL, 가드/윙 보정"],
  ]);
  formula.getRange("B:B").format.columnWidth = 80;

  writeTable(weights, 0, 0, ["포지션", "높게 보는 능력치"], [
    ["PG", "패스, 볼핸들링, 3점슛, 스틸, 외곽수비, 스피드, 민첩성"],
    ["SG", "3점슛, 중거리슛, 드라이빙레이업, 볼핸들링, 외곽수비, 스틸"],
    ["SF", "3점슛, 드라이빙레이업, 외곽수비, 수비리바운드, 인사이드수비, 힘"],
    ["PF", "근거리슛, 포스트컨트롤, 리바운드, 인사이드수비, 블록, 힘"],
    ["C", "근거리슛, 포스트컨트롤, 수비리바운드, 인사이드수비, 블록, 힘"],
  ]);
  weights.getRange("B:B").format.columnWidth = 90;

  writeTable(grades, 0, 0, ["등급", "OVR 범위"], [
    ["MVP급", "95+"],
    ["시즌베스트급", "90~95"],
    ["주전라인업급", "80~90"],
    ["로테이션급", "75~80"],
    ["후보급", "70~75"],
    ["예비/신인급", "60~70"],
  ]);

  const outputPath = path.join(outputDir, "KBL_능력치_공식계산기_V2.xlsx");
  const preview = await workbook.render({ sheetName: "사용법", autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(path.join(outputDir, "KBL_능력치_공식계산기_V2_preview.png"), new Uint8Array(await preview.arrayBuffer()));
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(outputPath);
  return outputPath;
}

const ratingsPath = await buildRatingsWorkbook();
const formulaPath = await buildFormulaWorkbook();
console.log(ratingsPath);
console.log(formulaPath);
