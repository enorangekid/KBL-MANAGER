import json
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
SOURCE = [
    p for p in ROOT.glob("*.xlsx")
    if p.name.endswith("_2.xlsx") and not p.name.startswith("~$")
][0]
OUT_DIR = ROOT / "outputs" / "kbl_ratings_v3"
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
    "PG": {"패스": 64, "볼핸들링": 65, "스틸": 60, "외곽수비": 62, "스피드": 76, "민첩성": 75},
    "SG": {"3점슛": 60, "볼핸들링": 60, "스틸": 60, "외곽수비": 61, "스피드": 70, "민첩성": 70},
    "SF": {"3점슛": 60, "외곽수비": 61, "인사이드수비": 60, "수비리바운드": 60, "스틸": 60, "힘": 61, "점프력": 62},
    "PF": {"근거리슛": 62, "포스트컨트롤": 62, "공격리바운드": 62, "수비리바운드": 64, "인사이드수비": 64, "블록": 62, "힘": 70, "점프력": 64},
    "C": {"근거리슛": 65, "포스트컨트롤": 65, "공격리바운드": 65, "수비리바운드": 67, "인사이드수비": 68, "블록": 66, "힘": 78, "점프력": 65, "스탠딩덩크": 66},
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


def rating(value, low=60, high=97):
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
    base = {
        "PG": {"speed": 82, "agi": 80, "strength": 44, "jump": 64},
        "SG": {"speed": 76, "agi": 74, "strength": 52, "jump": 65},
        "SF": {"speed": 69, "agi": 68, "strength": 64, "jump": 67},
        "PF": {"speed": 60, "agi": 60, "strength": 76, "jump": 69},
        "C": {"speed": 54, "agi": 54, "strength": 88, "jump": 70},
    }[pos]
    speed = base["speed"] + (195 - height) * 0.12 + (95 - weight) * 0.06
    agi = base["agi"] + (195 - height) * 0.10 + (95 - weight) * 0.05
    with_ball = speed - 2 + (agi - speed) * 0.25
    strength = base["strength"] + (weight - 95) * 0.38 + (height - 195) * 0.09 + (wingspan - 200) * 0.07
    jump = base["jump"] + (wingspan - 200) * 0.15 + (height - 195) * 0.05 - (weight - 95) * 0.04
    return {
        "볼과함께뛰는속도": rating(with_ball),
        "스피드": rating(speed),
        "민첩성": rating(agi),
        "힘": rating(strength),
        "점프력": rating(jump),
    }


def apply_floors(attrs, pos):
    for key, floor in POSITION_FLOORS.get(pos, {}).items():
        attrs[key] = max(attrs.get(key, 60), floor)
    for key in ATTRS:
        attrs[key] = max(attrs.get(key, 60), 60)
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
    dunk_pos_bonus = {"PG": -4, "SG": 0, "SF": 4, "PF": 5, "C": 2}[pos]
    standing_pos_bonus = {"PG": -6, "SG": -3, "SF": 2, "PF": 8, "C": 10}[pos]

    attrs = {
        "근거리슛": rating(39 + two_pct * 0.22 + pp_pct * 0.13 + ppa * 1.15 + two_pm * 1.65 + big_bonus * 0.8),
        "드라이빙레이업": rating(43 + two_pct * 0.33 + pts * 0.9 + stl * 2.4 + (4 if pos in ("PG", "SG", "SF") else 0)),
        "드라이빙덩크": rating(42 + dk * 5.0 + safe_div(dk, dka) * 10 + phys["스피드"] * 0.18 + phys["점프력"] * 0.32 + max(0, size_bonus) * 0.40 + dunk_pos_bonus),
        "스탠딩덩크": rating(40 + dk * 4.0 + blk * 4.0 + phys["힘"] * 0.25 + phys["점프력"] * 0.22 + max(0, size_bonus) * 0.70 + standing_pos_bonus),
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
    weighted = sum(attrs.get(attr, 60) * weight for attr, weight in weights.items()) / sum(weights.values())
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
    if ovr >= 60:
        return "예비/신인급"
    return "육성/저기록"


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
        "method": "position_weighted_v3_no_minmax",
        "notes": [
            "Min-Max 정규화를 사용하지 않음.",
            "모든 표시 능력치는 60 미만으로 내려가지 않게 조정함.",
            "99 빈도를 줄이기 위해 90 이상 구간은 완만하게 압축함.",
            "근거리슛은 페인트존/림 근처 마무리로 보고 2P%, PP%, PPA, 2PM, 빅맨 보정을 사용하되 상단을 낮춤.",
            "중거리슛은 KBL 기본 기록에서 직접 분리하기 어려워 추정 중거리득점, FG%, FT%, PTS, 포지션 보정으로 산출함.",
            "드라이빙덩크는 DK/DKA 표본 의존도를 낮추고 스피드, 점프력, 포지션, 키, 윙스팬을 함께 반영함.",
            "스탠딩덩크는 포지션, 힘, 키, 윙스팬, 점프력, 블록을 중심으로 보정함.",
            "자유투는 기존보다 계수를 낮춰 99 빈도를 줄임.",
            "현재능력~더티플레이 히든 구간은 계산하지 않음.",
        ],
        "summary": summary,
        "rows": all_rows,
        "rows_by_team": rows_by_team,
        "attrs": ATTRS,
    }
    out = OUT_DIR / "kbl_4teams_ratings_v3.json"
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(out)
    for item in summary:
        print(item)
    print("top 15")
    for row in all_rows[:15]:
        print(row["팀"], row["선수"], row["포지션"], row["OVR"], row["등급"])


if __name__ == "__main__":
    main()
