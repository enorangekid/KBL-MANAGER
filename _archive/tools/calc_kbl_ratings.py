import json
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
SOURCE = [
    p for p in ROOT.glob("*.xlsx")
    if p.name.endswith("_2.xlsx") and not p.name.startswith("~$")
][0]
REFERENCE = ROOT / "KBL_stat.xlsx"
OUT_DIR = ROOT / "outputs" / "kbl_ratings_preview"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def num(value, default=0.0):
    if pd.isna(value):
        return default
    if isinstance(value, str):
        value = value.strip().replace("%", "")
        if value in ("", "-"):
            return default
        if ":" in value:
            return default
    try:
        return float(value)
    except Exception:
        return default


def safe_div(a, b):
    a = num(a)
    b = num(b)
    return 0.0 if b == 0 else a / b


def norm_pos(pos):
    if pd.isna(pos):
        return ""
    value = str(pos).strip().replace("/", "-").replace(" ", "")
    parts = value.split("-")
    order = ["PG", "SG", "SF", "PF", "C"]
    parts = [part for part in parts if part in order]
    if len(parts) >= 2:
        a, b = parts[0], parts[1]
        if order.index(a) > order.index(b):
            a, b = b, a
        return f"{a}-{b}"
    return parts[0] if parts else value


FALLBACK_POSITION_PROFILE = {
    "PG": {"볼과함께뛰는속도": 88, "스피드": 87, "민첩성": 82, "힘": 34, "점프력": 61, "신장(cm)": 185, "윙스팬(cm)": 190, "체중": 80},
    "PG-SG": {"볼과함께뛰는속도": 80, "스피드": 84, "민첩성": 79, "힘": 36, "점프력": 62, "신장(cm)": 187, "윙스팬(cm)": 193, "체중": 83},
    "SG": {"볼과함께뛰는속도": 70, "스피드": 79, "민첩성": 77, "힘": 41, "점프력": 64, "신장(cm)": 190, "윙스팬(cm)": 194, "체중": 86},
    "SG-SF": {"볼과함께뛰는속도": 68, "스피드": 75, "민첩성": 72, "힘": 52, "점프력": 67, "신장(cm)": 197, "윙스팬(cm)": 204, "체중": 92},
    "SF": {"볼과함께뛰는속도": 66, "스피드": 72, "민첩성": 70, "힘": 61, "점프력": 68, "신장(cm)": 193, "윙스팬(cm)": 198, "체중": 95},
    "SF-PF": {"볼과함께뛰는속도": 59, "스피드": 62, "민첩성": 61, "힘": 72, "점프력": 69, "신장(cm)": 199, "윙스팬(cm)": 205, "체중": 101},
    "PF": {"볼과함께뛰는속도": 53, "스피드": 52, "민첩성": 52, "힘": 84, "점프력": 69, "신장(cm)": 201, "윙스팬(cm)": 210, "체중": 105},
    "PF-C": {"볼과함께뛰는속도": 47, "스피드": 46, "민첩성": 46, "힘": 91, "점프력": 72, "신장(cm)": 203, "윙스팬(cm)": 211, "체중": 109},
    "C": {"볼과함께뛰는속도": 41, "스피드": 40, "민첩성": 41, "힘": 99, "점프력": 76, "신장(cm)": 208, "윙스팬(cm)": 217, "체중": 112},
}


def build_position_profile():
    ref_df = pd.read_excel(REFERENCE, sheet_name=0, header=1)
    ref_df = ref_df.dropna(subset=[ref_df.columns[1]])
    ref_df["포지션_norm"] = ref_df["포지션"].map(norm_pos)
    phys_cols = ["볼과함께뛰는속도", "스피드", "민첩성", "힘", "점프력"]
    body_cols = ["신장(cm)", "윙스팬(cm)"]
    position_profile = {}
    weight_guess = {
        "PG": 80,
        "PG-SG": 83,
        "SG": 86,
        "SG-SF": 92,
        "SF": 95,
        "SF-PF": 101,
        "PF": 105,
        "PF-C": 109,
        "C": 112,
    }
    for pos, group in ref_df.groupby("포지션_norm"):
        if not pos:
            continue
        profile = {}
        for col in phys_cols + body_cols:
            if col in group:
                profile[col] = float(pd.to_numeric(group[col], errors="coerce").median())
        profile["체중"] = weight_guess.get(pos, 95)
        position_profile[pos] = profile
    for key, value in FALLBACK_POSITION_PROFILE.items():
        position_profile.setdefault(key, value)
    return position_profile


def calculate():
    team_indices = [0, 1, 2, 3]
    workbook = pd.ExcelFile(SOURCE)
    position_profile = build_position_profile()
    rows = []
    stat_cols = [
        "PTS", "2PM", "2PA", "2P%", "3PM", "3PA", "3P%", "FGM", "FGA", "FG%",
        "FTM", "FTA", "FT%", "OREB", "DREB", "REB", "AST", "STL", "BLK", "GD",
        "DK", "DKA", "TO", "PF", "PP", "PPA", "PP%", "+/-", "DD2", "TD3", "SAST", "DFL",
    ]
    for idx in team_indices:
        team = workbook.sheet_names[idx]
        df = pd.read_excel(SOURCE, sheet_name=idx)
        for _, record in df.iterrows():
            if pd.isna(record.get("선수")):
                continue
            vals = {col: num(record.get(col)) for col in stat_cols}
            middle_est = max(0.0, vals["PTS"] - vals["2PM"] * 2 - vals["3PM"] * 3 - vals["FTM"])
            raw = {
                "근거리슛": vals["2P%"] * 0.4 + vals["PP%"] * 0.4 + vals["PPA"] * 0.5,
                "드라이빙레이업": vals["2P%"] * 0.5 + vals["PTS"] * 0.8 + vals["STL"],
                "드라이빙덩크": vals["DK"] * 8 + safe_div(vals["DK"], vals["DKA"]) * 30,
                "스탠딩덩크": vals["DK"] * 6 + vals["BLK"] * 4,
                "포스트컨트롤": vals["PP%"] * 0.4 + vals["REB"] * 1.5 + vals["2PM"] * 1.5,
                "중거리슛": middle_est * 1.5 + vals["FG%"] * 0.3,
                "3점슛": vals["3P%"] * 0.6 + vals["3PA"] * 2 + vals["3PM"] * 3,
                "자유투": vals["FT%"] * 0.7 + vals["FTA"] * 1.5,
                "패스": vals["AST"] * 5 + safe_div(vals["AST"], vals["TO"]) * 3 + vals["SAST"],
                "볼핸들링": vals["AST"] * 3 + vals["STL"] * 3 + safe_div(vals["AST"], vals["TO"]) * 4,
                "스틸": vals["STL"] * 12 + vals["DFL"] * 6,
                "블록": vals["BLK"] * 14 + vals["DREB"],
                "공격리바운드": vals["OREB"] * 10,
                "수비리바운드": vals["DREB"] * 7 + vals["BLK"] * 2,
                "인사이드수비": vals["BLK"] * 8 + vals["DREB"] * 2 + vals["GD"] * 4,
                "외곽수비": vals["STL"] * 8 + vals["GD"] * 5 + vals["DFL"] * 4,
            }
            birthday = record.get("생년월일")
            if pd.isna(birthday):
                birthday_text = ""
            elif isinstance(birthday, str):
                birthday_text = birthday
            else:
                birthday_text = str(pd.to_datetime(birthday).date())
            rows.append({
                "팀": team,
                "선수": str(record.get("선수")).strip(),
                "생년월일": birthday_text,
                "국적": "" if pd.isna(record.get("국적")) else str(record.get("국적")),
                "신장": num(record.get("신장")),
                "체중": num(record.get("체중")),
                "윙스팬": num(record.get("윙스팬")),
                "포지션": "" if pd.isna(record.get("포지션")) else str(record.get("포지션")),
                "포지션정규화": norm_pos(record.get("포지션")),
                "GP": num(record.get("GP")),
                "MIN": "" if pd.isna(record.get("MIN")) else str(record.get("MIN")),
                "_raw": raw,
            })

    attr16 = [
        "근거리슛", "드라이빙레이업", "드라이빙덩크", "스탠딩덩크",
        "포스트컨트롤", "중거리슛", "3점슛", "자유투",
        "패스", "볼핸들링", "스틸", "블록",
        "공격리바운드", "수비리바운드", "인사이드수비", "외곽수비",
    ]
    mins = {attr: min(row["_raw"][attr] for row in rows) for attr in attr16}
    maxs = {attr: max(row["_raw"][attr] for row in rows) for attr in attr16}

    def scale(value, attr):
        mn, mx = mins[attr], maxs[attr]
        if mx == mn:
            return 30
        return int(round(max(30, min(99, ((value - mn) / (mx - mn)) * 99))))

    def clamp_rating(value):
        return int(round(max(30, min(99, value))))

    output_rows = []
    for row in rows:
        record_attrs = {attr: scale(row["_raw"][attr], attr) for attr in attr16}
        profile = position_profile.get(
            row["포지션정규화"],
            FALLBACK_POSITION_PROFILE.get(row["포지션정규화"], FALLBACK_POSITION_PROFILE["SG-SF"]),
        )
        height = row["신장"]
        weight = row["체중"]
        wingspan = row["윙스팬"]
        profile_height = profile.get("신장(cm)", height or 195)
        profile_weight = profile.get("체중", weight or 95)
        profile_wingspan = profile.get("윙스팬(cm)", wingspan or 200)
        physical = {
            "볼과함께뛰는속도": clamp_rating(profile.get("볼과함께뛰는속도", 60) + (profile_height - height) * 0.18 + (profile_weight - weight) * 0.10),
            "스피드": clamp_rating(profile.get("스피드", 60) + (profile_height - height) * 0.22 + (profile_weight - weight) * 0.12),
            "민첩성": clamp_rating(profile.get("민첩성", 60) + (profile_height - height) * 0.18 + (profile_weight - weight) * 0.10),
            "힘": clamp_rating(profile.get("힘", 60) + (weight - profile_weight) * 0.55 + (height - profile_height) * 0.12 + (wingspan - profile_wingspan) * 0.08),
            "점프력": clamp_rating(profile.get("점프력", 65) + (wingspan - profile_wingspan) * 0.24 + (height - profile_height) * 0.08 - (weight - profile_weight) * 0.08),
        }
        overall = int(round(sum(record_attrs[attr] for attr in attr16) / len(attr16)))
        output = {key: value for key, value in row.items() if key != "_raw"}
        output.update(record_attrs)
        output["OVR"] = overall
        output.update(physical)
        output_rows.append(output)

    team_order = {workbook.sheet_names[idx]: idx for idx in team_indices}
    output_rows.sort(key=lambda item: (team_order.get(item["팀"], 99), -item["OVR"], item["선수"]))
    summary = []
    for idx in team_indices:
        team = workbook.sheet_names[idx]
        team_rows = [row for row in output_rows if row["팀"] == team]
        summary.append({
            "팀": team,
            "선수수": len(team_rows),
            "평균OVR": round(sum(row["OVR"] for row in team_rows) / len(team_rows), 1) if team_rows else 0,
            "최고OVR": max((row["OVR"] for row in team_rows), default=0),
            "최고선수": max(team_rows, key=lambda row: row["OVR"])["선수"] if team_rows else "",
        })

    return {
        "source": SOURCE.name,
        "reference": REFERENCE.name,
        "notes": [
            "현재능력~더티플레이 구간은 히든 데이터로 보고 산출 대상에서 제외함.",
            "기록 기반 16개 능력치는 KBL_stat.xlsx 능력치 공식 시트의 공식을 적용함.",
            "정규화는 현재 초안이 완성된 4개 팀 선수 풀 기준 Min-Max 0~99, 최소 30 보장으로 처리함.",
            "SAST/DFL 누락값은 0으로 처리함.",
            "OVR은 KBL_stat 공식처럼 기록 기반 16개 능력치의 단순 평균임.",
            "피지컬 5개는 KBL_stat 전체 능력치 시트의 포지션별 기준값에 신장/체중/윙스팬 보정을 더한 임시값임.",
        ],
        "attr16": attr16,
        "physical": ["볼과함께뛰는속도", "스피드", "민첩성", "힘", "점프력"],
        "summary": summary,
        "rows": output_rows,
    }


if __name__ == "__main__":
    result = calculate()
    output_path = OUT_DIR / "kbl_4teams_ratings_preview.json"
    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(output_path)
    print("players", len(result["rows"]))
    for summary_row in result["summary"]:
        print(summary_row)
    print("top 12")
    for row in sorted(result["rows"], key=lambda item: -item["OVR"])[:12]:
        print(row["팀"], row["선수"], row["포지션"], row["OVR"])
