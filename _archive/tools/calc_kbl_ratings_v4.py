import json
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
SOURCE = [p for p in ROOT.glob("*.xlsx") if p.name.endswith("_2.xlsx") and not p.name.startswith("~$")][0]
OUT_DIR = ROOT / "outputs" / "kbl_ratings_v4"
OUT_DIR.mkdir(parents=True, exist_ok=True)

ATTRS = [
    "근거리슛", "드라이빙레이업", "드라이빙덩크", "스탠딩덩크",
    "포스트컨트롤", "중거리슛", "3점슛", "자유투",
    "패스", "볼핸들링", "스틸", "블록",
    "공격리바운드", "수비리바운드", "인사이드수비", "외곽수비",
    "볼과함께뛰는속도", "스피드", "민첩성", "힘", "점프력",
]

OVR_WEIGHTS = {
    "PG": {"패스": 1.9, "볼핸들링": 1.8, "3점슛": 1.25, "자유투": 0.65, "스틸": 1.15, "외곽수비": 1.25, "스피드": 1.15, "민첩성": 1.1, "드라이빙레이업": 0.95, "중거리슛": 0.65, "근거리슛": 0.45, "수비리바운드": 0.25, "인사이드수비": 0.2},
    "SG": {"3점슛": 1.75, "중거리슛": 1.1, "드라이빙레이업": 1.0, "볼핸들링": 1.1, "패스": 0.95, "스틸": 1.05, "외곽수비": 1.2, "스피드": 1.0, "민첩성": 1.0, "자유투": 0.65, "근거리슛": 0.55, "수비리바운드": 0.35},
    "SF": {"3점슛": 1.25, "중거리슛": 0.9, "드라이빙레이업": 0.9, "근거리슛": 0.8, "수비리바운드": 0.8, "스틸": 0.9, "외곽수비": 1.1, "인사이드수비": 0.75, "힘": 0.75, "스피드": 0.8, "점프력": 0.7, "패스": 0.55},
    "PF": {"근거리슛": 1.2, "포스트컨트롤": 1.15, "공격리바운드": 1.15, "수비리바운드": 1.25, "인사이드수비": 1.2, "블록": 0.95, "힘": 1.1, "점프력": 0.75, "중거리슛": 0.65, "3점슛": 0.55, "외곽수비": 0.55, "드라이빙덩크": 0.75},
    "C": {"근거리슛": 1.45, "포스트컨트롤": 1.35, "공격리바운드": 1.25, "수비리바운드": 1.45, "인사이드수비": 1.55, "블록": 1.25, "힘": 1.2, "점프력": 0.75, "스탠딩덩크": 0.9, "드라이빙덩크": 0.65, "패스": 0.35, "3점슛": 0.25, "볼핸들링": 0.2, "외곽수비": 0.35},
}

POSITION_FLOORS = {
    "PG": {"패스": 62, "볼핸들링": 64, "스틸": 52, "외곽수비": 55},
    "SG": {"3점슛": 52, "볼핸들링": 54, "스틸": 50, "외곽수비": 53},
    "SF": {"외곽수비": 50, "수비리바운드": 48, "힘": 52},
    "PF": {"근거리슛": 54, "포스트컨트롤": 52, "공격리바운드": 55, "수비리바운드": 56, "인사이드수비": 56, "블록": 52, "힘": 64},
    "C": {"근거리슛": 58, "포스트컨트롤": 58, "공격리바운드": 60, "수비리바운드": 62, "인사이드수비": 63, "블록": 60, "힘": 72, "스탠딩덩크": 58},
}

PHYSICAL_PROFILE = {
    "PG": {"height": 185, "weight": 80, "wingspan": 190, "speed": 84, "agility": 86, "strength": 44, "jump": 67},
    "SG": {"height": 190, "weight": 86, "wingspan": 196, "speed": 78, "agility": 80, "strength": 53, "jump": 69},
    "SF": {"height": 196, "weight": 94, "wingspan": 203, "speed": 70, "agility": 72, "strength": 64, "jump": 71},
    "PF": {"height": 201, "weight": 103, "wingspan": 210, "speed": 60, "agility": 62, "strength": 77, "jump": 72},
    "C": {"height": 206, "weight": 112, "wingspan": 216, "speed": 50, "agility": 52, "strength": 88, "jump": 73},
}


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


def minute_value(value):
    if pd.isna(value):
        return 0.0
    if isinstance(value, str) and ":" in value:
        minute, second = value.split(":", 1)
        return float(minute) + float(second) / 60
    return num(value)


def rating(value, low=30, high=97):
    if value > 90:
        value = 90 + (value - 90) * 0.45
    return int(round(max(low, min(high, value))))


def ovr_rating(value):
    return int(round(max(60, min(99, value))))


def safe_div(a, b):
    a, b = num(a), num(b)
    return 0 if b == 0 else a / b


def primary_pos(pos):
    if pd.isna(pos):
        return "SG"
    order = ["PG", "SG", "SF", "PF", "C"]
    parts = str(pos).replace("/", "-").replace(" ", "").split("-")
    parts = [part for part in parts if part in order]
    return parts[0] if parts else "SG"


def physical(pos, height, weight, wingspan):
    p = PHYSICAL_PROFILE[pos]
    height_diff = height - p["height"]
    weight_diff = weight - p["weight"]
    wingspan_diff = wingspan - p["wingspan"]

    speed = p["speed"] - height_diff * 0.18 - weight_diff * 0.23 + max(0, -height_diff) * 0.08
    agility = p["agility"] - height_diff * 0.16 - weight_diff * 0.25 + max(0, -height_diff) * 0.10
    strength = p["strength"] + weight_diff * 0.58 + height_diff * 0.16 + wingspan_diff * 0.10
    jump = p["jump"] + wingspan_diff * 0.18 + height_diff * 0.05 - weight_diff * 0.13
    with_ball = speed * 0.62 + agility * 0.38

    return {
        "볼과함께뛰는속도": rating(with_ball - (3 if pos in ("PF", "C") else 1 if pos == "SF" else 0), 30, 95),
        "스피드": rating(speed, 30, 95),
        "민첩성": rating(agility, 30, 95),
        "힘": rating(strength, 30, 97),
        "점프력": rating(jump, 30, 95),
    }


def apply_floors(attrs, pos):
    for key, floor in POSITION_FLOORS.get(pos, {}).items():
        attrs[key] = max(attrs.get(key, 30), floor)
    return attrs


def calc_attrs(row):
    pos = primary_pos(row.get("포지션"))
    height, weight, wingspan = num(row.get("신장"), 195), num(row.get("체중"), 95), num(row.get("윙스팬"), 200)
    pts, two_pm, two_pct = num(row.get("PTS")), num(row.get("2PM")), num(row.get("2P%"))
    three_pm, three_pa, three_pct = num(row.get("3PM")), num(row.get("3PA")), num(row.get("3P%"))
    ftm, fta, ft_pct = num(row.get("FTM")), num(row.get("FTA")), num(row.get("FT%"))
    oreb, dreb, reb = num(row.get("OREB")), num(row.get("DREB")), num(row.get("REB"))
    ast, stl, blk = num(row.get("AST")), num(row.get("STL")), num(row.get("BLK"))
    gd, dk, dka, to = num(row.get("GD")), num(row.get("DK")), num(row.get("DKA")), num(row.get("TO"))
    pp, ppa, pp_pct = num(row.get("PP")), num(row.get("PPA")), num(row.get("PP%"))
    sast, dfl = num(row.get("SAST")), num(row.get("DFL"))
    minutes = minute_value(row.get("MIN"))
    mid_est = max(0, pts - two_pm * 2 - three_pm * 3 - ftm)
    size_bonus = (height - 195) * 0.45 + (wingspan - 200) * 0.28
    guard_bonus = 6 if pos in ("PG", "SG") else 0
    big_bonus = 7 if pos in ("PF", "C") else 0
    phys = physical(pos, height, weight, wingspan)
    dunk_pos_bonus = {"PG": -7, "SG": -2, "SF": 4, "PF": 7, "C": 5}[pos]
    standing_pos_bonus = {"PG": -12, "SG": -7, "SF": 0, "PF": 10, "C": 14}[pos]

    attrs = {
        "근거리슛": rating(39 + two_pct * 0.22 + pp_pct * 0.13 + ppa * 1.15 + two_pm * 1.65 + big_bonus * 0.8),
        "드라이빙레이업": rating(43 + two_pct * 0.33 + pts * 0.9 + stl * 2.4 + (4 if pos in ("PG", "SG", "SF") else 0)),
        "드라이빙덩크": rating(34 + dk * 5.0 + safe_div(dk, dka) * 10 + phys["스피드"] * 0.22 + phys["점프력"] * 0.38 + max(0, size_bonus) * 0.38 + dunk_pos_bonus),
        "스탠딩덩크": rating(30 + dk * 4.0 + blk * 4.0 + phys["힘"] * 0.34 + phys["점프력"] * 0.24 + max(0, size_bonus) * 0.78 + standing_pos_bonus),
        "포스트컨트롤": rating(38 + pp_pct * 0.21 + pp * 1.1 + reb * 1.6 + two_pm * 1.8 + big_bonus),
        "중거리슛": rating(45 + mid_est * 2.7 + num(row.get("FG%")) * 0.16 + ft_pct * 0.07 + pts * 0.18 + (3 if pos in ("PG", "SG", "SF") else 0)),
        "3점슛": rating(38 + three_pct * 0.55 + three_pm * 5.8 + three_pa * 1.35 + (3 if pos in ("PG", "SG", "SF") else 0)),
        "자유투": rating(42 + ft_pct * 0.46 + fta * 0.75),
        "패스": rating(42 + ast * 8.0 + safe_div(ast, to) * 4.0 + sast * 1.5 + (8 if pos == "PG" else 3 if pos == "SG" else 0)),
        "볼핸들링": rating(43 + ast * 4.2 + safe_div(ast, to) * 5.5 + stl * 3.0 + guard_bonus),
        "스틸": rating(45 + stl * 11.0 + dfl * 2.6 + gd * 1.2 + guard_bonus),
        "블록": rating(35 + blk * 14.0 + dreb * 1.0 + size_bonus * 0.5 + big_bonus),
        "공격리바운드": rating(36 + oreb * 9.0 + reb * 0.7 + size_bonus * 0.5 + big_bonus),
        "수비리바운드": rating(38 + dreb * 6.5 + blk * 1.7 + size_bonus * 0.40 + big_bonus),
        "인사이드수비": rating(38 + blk * 8.5 + dreb * 2.0 + gd * 2.7 + size_bonus * 0.45 + big_bonus),
        "외곽수비": rating(43 + stl * 8.0 + gd * 3.5 + dfl * 2.6 + guard_bonus + (3 if pos == "SF" else 0)),
    }
    attrs.update(phys)
    attrs = apply_floors(attrs, pos)
    usage = min(8, max(0, (minutes - 10) * 0.28)) + min(3, max(0, num(row.get("GP")) - 20) * 0.05)
    return pos, attrs, usage


def ovr_for(attrs, pos, usage):
    weights = OVR_WEIGHTS[pos]
    weighted = sum(attrs.get(attr, 50) * weight for attr, weight in weights.items()) / sum(weights.values())
    return ovr_rating(weighted + usage)


def grade(ovr):
    if ovr >= 95:
        return "MVP급"
    if ovr >= 90:
        return "시즌베스트급"
    if ovr >= 80:
        return "주전라인업급"
    if ovr >= 75:
        return "로테이션급"
    if ovr >= 70:
        return "후보급"
    return "예비/신인급"


def main():
    workbook = pd.ExcelFile(SOURCE)
    team_names = workbook.sheet_names[:4]
    rows_by_team = {}
    all_rows = []
    for team in team_names:
        df = pd.read_excel(SOURCE, sheet_name=team)
        team_rows = []
        for _, row in df.iterrows():
            if pd.isna(row.get("선수")):
                continue
            pos, attrs, usage = calc_attrs(row)
            ovr = ovr_for(attrs, pos, usage)
            output = {
                "팀": team,
                "선수": str(row.get("선수")).strip(),
                "포지션": "" if pd.isna(row.get("포지션")) else str(row.get("포지션")),
                "주포지션": pos,
                "신장": num(row.get("신장")),
                "체중": num(row.get("체중")),
                "윙스팬": num(row.get("윙스팬")),
                "GP": num(row.get("GP")),
                "MIN": "" if pd.isna(row.get("MIN")) else str(row.get("MIN")),
                "OVR": ovr,
                "등급": grade(ovr),
                **attrs,
            }
            team_rows.append(output)
            all_rows.append(output)
        team_rows.sort(key=lambda item: (-item["OVR"], item["선수"]))
        rows_by_team[team] = team_rows
    all_rows.sort(key=lambda item: (-item["OVR"], item["팀"], item["선수"]))
    summary = []
    for team, rows in rows_by_team.items():
        summary.append({
            "팀": team,
            "선수수": len(rows),
            "평균OVR": round(sum(row["OVR"] for row in rows) / len(rows), 1),
            "최고OVR": rows[0]["OVR"],
            "최고선수": rows[0]["선수"],
        })
    result = {
        "source": SOURCE.name,
        "method": "position_weighted_v4_physical_rebalance",
        "notes": [
            "피지컬 산출식을 포지션별 기준 체형 기반으로 재정비함.",
            "스피드/민첩성은 포지션 기본값에서 키와 체중이 늘수록 감점함.",
            "힘은 체중, 키, 윙스팬이 늘수록 상승함.",
            "점프력은 윙스팬과 키가 늘수록 상승하고, 체중이 늘수록 감점함.",
            "볼과함께뛰는속도는 스피드와 민첩성을 섞고, 포워드/센터는 드리블 속도 감점을 적용함.",
            "개별 능력치 최소 60 강제 보정은 제거함. OVR만 60 밑으로 내려가지 않게 유지함.",
        ],
        "summary": summary,
        "rows": all_rows,
        "rows_by_team": rows_by_team,
        "attrs": ATTRS,
    }
    out = OUT_DIR / "kbl_4teams_ratings_v4.json"
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(out)
    for item in summary:
        print(item)
    print("top 15")
    for row in all_rows[:15]:
        print(row["팀"], row["선수"], row["포지션"], row["OVR"], row["등급"])


if __name__ == "__main__":
    main()
