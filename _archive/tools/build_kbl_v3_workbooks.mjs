import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "outputs", "kbl_ratings_v3");
const data = JSON.parse(await fs.readFile(path.join(outputDir, "kbl_4teams_ratings_v3.json"), "utf8"));

function styleHeader(range, fill = "#061B4F") {
  range.format = { fill, font: { bold: true, color: "#FFFFFF" } };
}

function setup(sheet) {
  sheet.showGridLines = false;
}

function writeTable(sheet, row, col, headers, rows) {
  sheet.getRangeByIndexes(row, col, rows.length + 1, headers.length).values = [headers, ...rows];
  styleHeader(sheet.getRangeByIndexes(row, col, 1, headers.length));
  sheet.getRangeByIndexes(row, col, rows.length + 1, headers.length).format.borders = {
    preset: "inside",
    style: "thin",
    color: "#D8DEE9",
  };
  sheet.getRangeByIndexes(row, col, rows.length + 1, headers.length).format.autofitColumns();
}

function makeRows(rows, includeTeam) {
  const headers = [
    ...(includeTeam ? ["팀"] : []),
    "선수", "포지션", "주포지션", "OVR", "등급", "신장", "체중", "윙스팬", "GP", "MIN",
    ...data.attrs,
  ];
  return {
    headers,
    rows: rows.map((item) => headers.map((header) => item[header] ?? "")),
  };
}

const ratings = Workbook.create();
const summary = ratings.worksheets.add("요약");
setup(summary);
summary.getRange("A1:F1").merge();
summary.getRange("A1").values = [["KBL 4팀 능력치 초안 V3"]];
summary.getRange("A1").format = {
  fill: "#061B4F",
  font: { bold: true, color: "#FFFFFF", size: 16 },
};
summary.getRange("A2:F2").merge();
summary.getRange("A2").values = [["60 미만 제거 / 99 빈도 축소 / 덩크·자유투·근거리슛 보정"]];
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
]);

const all = ratings.worksheets.add("전체");
setup(all);
const allRows = makeRows(data.rows, true);
writeTable(all, 0, 0, allRows.headers, allRows.rows);
all.freezePanes.freezeRows(1);
all.freezePanes.freezeColumns(2);
all.getRangeByIndexes(1, 4, allRows.rows.length, 1).conditionalFormats.add("colorScale", {
  criteria: [
    { type: "lowestValue", color: "#F97316" },
    { type: "percentile", value: 50, color: "#FDE68A" },
    { type: "highestValue", color: "#22C55E" },
  ],
});

for (const [team, rows] of Object.entries(data.rows_by_team)) {
  const sheet = ratings.worksheets.add(team.replace(/[\\/?*[\]:]/g, " "));
  setup(sheet);
  sheet.getRange("A1:H1").merge();
  sheet.getRange("A1").values = [[`${team} 능력치 초안 V3`]];
  sheet.getRange("A1").format = {
    fill: "#061B4F",
    font: { bold: true, color: "#FFFFFF", size: 14 },
  };
  const table = makeRows(rows, false);
  writeTable(sheet, 2, 0, table.headers, table.rows);
  sheet.freezePanes.freezeRows(3);
  sheet.freezePanes.freezeColumns(2);
}

const memo = ratings.worksheets.add("산출메모");
setup(memo);
writeTable(memo, 0, 0, ["번호", "내용"], data.notes.map((note, index) => [index + 1, note]));
memo.getRange("B:B").format.columnWidth = 110;
memo.getRange("B:B").format.wrapText = true;

const ratingsPreview = await ratings.render({ sheetName: "요약", autoCrop: "all", scale: 1, format: "png" });
await fs.writeFile(path.join(outputDir, "KBL_4팀_능력치_초안_V3_preview.png"), new Uint8Array(await ratingsPreview.arrayBuffer()));
const ratingsOutput = await SpreadsheetFile.exportXlsx(ratings);
const ratingsPath = path.join(outputDir, "KBL_4팀_능력치_초안_V3.xlsx");
await ratingsOutput.save(ratingsPath);

const formula = Workbook.create();
const guide = formula.worksheets.add("사용법");
const rules = formula.worksheets.add("공식요약");
const grades = formula.worksheets.add("등급기준");
[guide, rules, grades].forEach(setup);
guide.getRange("A1:B1").merge();
guide.getRange("A1").values = [["KBL 능력치 공식 계산기 V3"]];
guide.getRange("A1").format = {
  fill: "#061B4F",
  font: { bold: true, color: "#FFFFFF", size: 16 },
};
writeTable(guide, 2, 0, ["핵심", "내용"], [
  ["정규화", "Min-Max 사용 안 함"],
  ["하한", "표시 능력치 60 미만 제거"],
  ["상한", "90 이상 구간 압축으로 99 빈도 축소"],
  ["덩크", "드라이빙덩크는 스피드/점프/키/윙스팬, 스탠딩덩크는 힘/키/윙스팬/점프/포지션 반영"],
  ["중거리슛", "직접 기록이 없어 추정 중거리득점, FG%, FT%, PTS, 포지션 보정으로 산출"],
]);
writeTable(rules, 0, 0, ["능력치", "V3 기준"], [
  ["근거리슛", "페인트존/림 근처 마무리. 2P%, PP%, PPA, 2PM, 빅맨 보정. 상단 계수 축소"],
  ["중거리슛", "직접 기록 없음. 추정 중거리득점 + FG% + FT% + PTS + 포지션 보정"],
  ["자유투", "FT% 중심, FTA 보조. 기존보다 계수 낮춤"],
  ["드라이빙덩크", "DK/DKA 보조 + 스피드 + 점프력 + 키 + 윙스팬 + 포지션"],
  ["스탠딩덩크", "DK/BLK 보조 + 힘 + 점프력 + 키 + 윙스팬 + 포지션"],
  ["OVR", "포지션별 가중치. 가드는 패스/핸들/외곽수비, 빅맨은 리바운드/인사이드수비/블록 중심"],
]);
rules.getRange("B:B").format.columnWidth = 110;
rules.getRange("B:B").format.wrapText = true;
writeTable(grades, 0, 0, ["등급", "OVR 범위"], [
  ["MVP급", "95+"],
  ["시즌베스트급", "90~95"],
  ["주전라인업급", "80~90"],
  ["로테이션급", "75~80"],
  ["후보급", "70~75"],
  ["예비/신인급", "60~70"],
]);
const formulaPreview = await formula.render({ sheetName: "사용법", autoCrop: "all", scale: 1, format: "png" });
await fs.writeFile(path.join(outputDir, "KBL_능력치_공식계산기_V3_preview.png"), new Uint8Array(await formulaPreview.arrayBuffer()));
const formulaOutput = await SpreadsheetFile.exportXlsx(formula);
const formulaPath = path.join(outputDir, "KBL_능력치_공식계산기_V3.xlsx");
await formulaOutput.save(formulaPath);

console.log(ratingsPath);
console.log(formulaPath);
