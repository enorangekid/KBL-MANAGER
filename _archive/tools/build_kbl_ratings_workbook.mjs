import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "outputs", "kbl_ratings_preview");
const jsonPath = path.join(outputDir, "kbl_4teams_ratings_preview.json");
const outputPath = path.join(outputDir, "KBL_4팀_능력치_초안.xlsx");
const previewPath = path.join(outputDir, "KBL_4팀_능력치_초안_preview.png");

const data = JSON.parse(await fs.readFile(jsonPath, "utf8"));
const workbook = Workbook.create();

const summary = workbook.worksheets.add("요약");
const ratings = workbook.worksheets.add("선수능력치");
const notes = workbook.worksheets.add("산출기준");

function writeTable(sheet, startCell, headers, rows) {
  sheet.getRange(startCell).writeValues([headers, ...rows]);
}

function styleHeader(range) {
  range.format = {
    fill: "#061B4F",
    font: { bold: true, color: "#FFFFFF" },
  };
}

function applyBaseSheetStyle(sheet) {
  sheet.showGridLines = false;
}

applyBaseSheetStyle(summary);
applyBaseSheetStyle(ratings);
applyBaseSheetStyle(notes);

summary.getRange("A1:E1").merge();
summary.getRange("A1").values = [["KBL 4팀 능력치 산출 초안"]];
summary.getRange("A1").format = {
  fill: "#061B4F",
  font: { bold: true, color: "#FFFFFF", size: 16 },
};
summary.getRange("A2:E2").merge();
summary.getRange("A2").values = [[`${data.source} 기록 + ${data.reference} 기준 공식 사용`]];
summary.getRange("A2").format = {
  fill: "#FF5A1F",
  font: { bold: true, color: "#FFFFFF" },
};

const summaryHeaders = ["팀", "선수수", "평균 OVR", "최고 OVR", "최고 선수"];
const summaryRows = data.summary.map((row) => [
  row["팀"],
  row["선수수"],
  row["평균OVR"],
  row["최고OVR"],
  row["최고선수"],
]);
writeTable(summary, "A4", summaryHeaders, summaryRows);
styleHeader(summary.getRange("A4:E4"));
summary.getRange("A4:E8").format.borders = { preset: "inside", style: "thin", color: "#D9DEE8" };
summary.getRange("A4:E8").format.autofitColumns();
summary.freezePanes.freezeRows(4);

const ratingHeaders = [
  "팀", "선수", "생년월일", "국적", "신장", "체중", "윙스팬", "포지션", "GP", "MIN", "OVR",
  ...data.attr16,
  ...data.physical,
];
const ratingRows = data.rows.map((row) => ratingHeaders.map((header) => row[header] ?? ""));
writeTable(ratings, "A1", ratingHeaders, ratingRows);
styleHeader(ratings.getRangeByIndexes(0, 0, 1, ratingHeaders.length));
ratings.getRangeByIndexes(0, 0, ratingRows.length + 1, ratingHeaders.length).format.borders = {
  preset: "inside",
  style: "thin",
  color: "#333842",
};
ratings.getRangeByIndexes(1, 4, ratingRows.length, ratingHeaders.length - 4).format.numberFormat = "0";
ratings.getRangeByIndexes(1, 10, ratingRows.length, ratingHeaders.length - 10).conditionalFormats.add("colorScale", {
  criteria: [
    { type: "lowestValue", color: "#F97316" },
    { type: "percentile", value: 50, color: "#FDE68A" },
    { type: "highestValue", color: "#22C55E" },
  ],
});
ratings.freezePanes.freezeRows(1);
ratings.freezePanes.freezeColumns(2);
ratings.getRangeByIndexes(0, 0, ratingRows.length + 1, ratingHeaders.length).format.autofitColumns();

notes.getRange("A1:D1").merge();
notes.getRange("A1").values = [["산출기준"]];
notes.getRange("A1").format = {
  fill: "#061B4F",
  font: { bold: true, color: "#FFFFFF", size: 14 },
};
const noteRows = data.notes.map((note, index) => [index + 1, note]);
writeTable(notes, "A3", ["번호", "내용"], noteRows);
styleHeader(notes.getRange("A3:B3"));
notes.getRange(`A3:B${noteRows.length + 3}`).format.borders = { preset: "inside", style: "thin", color: "#D9DEE8" };
notes.getRange("A:A").format.columnWidth = 8;
notes.getRange("B:B").format.columnWidth = 90;
notes.getRange("B:B").format.wrapText = true;

const formulaRows = [
  ["근거리슛", "2P% × 0.4 + PP% × 0.4 + PPA × 0.5"],
  ["드라이빙레이업", "2P% × 0.5 + PTS × 0.8 + STL × 1.0"],
  ["드라이빙덩크", "DK × 8 + (DK/DKA) × 30"],
  ["스탠딩덩크", "DK × 6 + BLK × 4"],
  ["포스트컨트롤", "PP% × 0.4 + REB × 1.5 + 2PM × 1.5"],
  ["중거리슛", "중거리추정득점 × 1.5 + FG% × 0.3"],
  ["3점슛", "3P% × 0.6 + 3PA × 2 + 3PM × 3"],
  ["자유투", "FT% × 0.7 + FTA × 1.5"],
  ["패스", "AST × 5 + (AST/TO) × 3 + SAST × 1"],
  ["볼핸들링", "AST × 3 + STL × 3 + (AST/TO) × 4"],
  ["스틸", "STL × 12 + DFL × 6"],
  ["블록", "BLK × 14 + DREB × 1"],
  ["공격리바운드", "OREB × 10"],
  ["수비리바운드", "DREB × 7 + BLK × 2"],
  ["인사이드수비", "BLK × 8 + DREB × 2 + GD × 4"],
  ["외곽수비", "STL × 8 + GD × 5 + DFL × 4"],
];
const formulaStart = noteRows.length + 6;
writeTable(notes, `A${formulaStart}`, ["능력치", "공식"], formulaRows);
styleHeader(notes.getRange(`A${formulaStart}:B${formulaStart}`));
notes.getRange(`A${formulaStart}:B${formulaStart + formulaRows.length}`).format.borders = {
  preset: "inside",
  style: "thin",
  color: "#D9DEE8",
};

const inspect = await workbook.inspect({
  kind: "sheet,table",
  maxChars: 4000,
  tableMaxRows: 5,
  tableMaxCols: 8,
});
console.log(inspect.ndjson);

const preview = await workbook.render({
  sheetName: "요약",
  autoCrop: "all",
  scale: 1,
  format: "png",
});
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);
