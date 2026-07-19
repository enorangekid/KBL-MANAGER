import json
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
SOURCE = [
    p for p in ROOT.glob("*.xlsx")
    if p.name.endswith("_2.xlsx") and not p.name.startswith("~$")
][0]
OUT_DIR = ROOT / "outputs" / "kbl_ratings_v2"
OUT_DIR.mkdir(parents=True, exist_ok=True)


ATTRS = [
    "근거리슛", "드라이빙레이업", "드라이빙덩크", "스탠딩덩크",
    "포스트컨트롤", "중거리슛", "3점슛", "자유투",
    "패스", "볼핸들링", "스틸", "블록",
    "공격리바운드", "수비리바운드", "인사이드수비", "외곽수비",
    "볼과함께뛰는속도", "스피드", "민첩성", "힘", "점프력",
]

OVR_WEIGHTS = {
    "PG": {
        "패스": 1.9, "볼핸들링": 1.8, "3점슛": 1.25, "자유투": 0.8,
        "스틸": 1.15, "외곽수비": 1.25, "스피드": 1.15, "민첩성": 1.1,
        "드라이빙레이업": 0.95, "중거리슛": 0.65, "근거리슛": 0.45,
        "수비리바운드": 0.25, "인사이드수비": 0.2,
    },
    "SG": {
        "3점슛": 1.75, "중거리슛": 1.1, "드라이빙레이업": 1.0,
        "볼핸들링": 1.1, "패스": 0.95, "스틸": 1.05, "외곽수비": 1.2,
        "스피드": 1.0, "민첩성": 1.0, "자유투": 0.85,
        "근거리슛": 0.55, "수비리바운드": 0.35,
    },
    "SF": {
        "3점슛": 1.25, "중거리슛": 0.9, "드라이빙레이업": 0.9,
        "근거리슛": 0.8, "수비리바운드": 0.8, "스틸": 0.9,
        "외곽수비": 1.1, "인사이드수비": 0.75, "힘": 0.75,
        "스피드": 0.8, "점프력": 0.7, "패스": 0.55,
    },
    "PF": {
        "근거리슛": 1.2, "포스트컨트롤": 1.15, "공격리바운드": 1.15,
        "수비리바운드": 1.25, "인사이드수비": 1.2, "블록": 0.95,
        "힘": 1.1, "점프력": 0.75, "중거리슛": 0.65, "3점슛": 0.55,
        "외곽수비": 0.55, "드라이빙덩크": 0.75,
    },
    "C": {
        "근거리슛": 1.45, "포스트컨트롤": 1.35, "공격리바운드": 1.25,
        "수비리바운드": 1.45, "인사이드수비": 1.55, "블록": 1.25,
        "힘": 1.2, "점프력": 0.75, "스탠딩덩크": 0.9,
        "드라이빙덩크": 0.65, "패스": 0.35, "3점슛": 0.25,
        "볼핸들링": 0.2, "외곽수비": 0.35,
    },
}

POSITION_FLOORS = {
    "PG": {"패스": 62, "볼핸들링": 64, "스틸": 55, "외곽수비": 57, "스피드": 76, "민첩성": 75, "수비리바운드": 42, "인사이드수비": 40, "블록": 32},
    "SG": {"3점슛": 55, "볼핸들링": 55, "스틸": 53, "외곽수비": 55, "스피드": 70, "민첩성": 70, "수비리바운드": 44, "인사이드수비": 42},
    "SF": {"3점슛": 48, "외곽수비": 53, "인사이드수비": 49, "수비리바운드": 50, "스틸": 50, "힘": 58, "점프력": 60},
    "PF": {"근거리슛": 55, "포스트컨트롤": 54, "공격리바운드": 55, "수비리바운드": 58, "인사이드수비": 58, "블록": 54, "힘": 70, "점프력": 62},
    "C": {"근거리슛": 60, "포스트컨트롤": 60, "공격리바운드": 60, "수비리바운드": 63, "인사이드수비": 65, "블록": 62, "힘": 78, "점프력": 64, "스탠딩덩크": 55},
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


def clamp(value, low=30, high=99):
    return int(round(max(low, min(high, value))))


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


def apply_floors(attrs, pos):
    for key, floor in POSITION_FLOORS.get(pos, {}).items():
        attrs[key] = max(attrs.get(key, 30), floor)
    return attrs


def physical(pos, height, weight, wingspan):
    base = {
        "PG": {"speed": 82, "agi": 80, "strength": 38, "jump": 62},
        "SG": {"speed": 76, "agi": 74, "strength": 48, "jump": 64},
        "SF": {"speed": 69, "agi": 68, "strength": 62, "jump": 66},
        "PF": {"speed": 58, "agi": 58, "strength": 76, "jump": 68},
        "C": {"speed": 45, "agi": 46, "strength": 88, "jump": 70},
    }[pos]
    speed = base["speed"] + (195 - height) * 0.18 + (95 - weight) * 0.09
    agi = base["agi"] + (195 - height) * 0.15 + (95 - weight) * 0.08
    with_ball = speed - 2 + (agi - speed) * 0.25
    strength = base["strength"] + (weight - 95) * 0.42 + (height - 195) * 0.10 + (wingspan - 200) * 0.08
    jump = base["jump"] + (wingspan - 200) * 0.18 + (height - 195) * 0.06 - (weight - 95) * 0.05
    return {
        "볼과함께뛰는속도": clamp(with_ball),
        "스피드": clamp(speed),
        "민첩성": clamp(agi),
        "힘": clamp(strength),
        "점프력": clamp(jump),
    }


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

    attrs = {
        "근거리슛": clamp(42 + two_pct * 0.32 + pp_pct * 0.20 + ppa * 2.0 + two_pm * 3.0 + big_bonus),
        "드라이빙레이업": clamp(43 + two_pct * 0.35 + pts * 1.0 + stl * 3.0 + (4 if pos in ("PG", "SG", "SF") else 0)),
        "드라이빙덩크": clamp(33 + dk * 9 + safe_div(dk, dka) * 18 + size_bonus * 0.8),
        "스탠딩덩크": clamp(34 + dk * 7 + blk * 8 + size_bonus + big_bonus),
        "포스트컨트롤": clamp(38 + pp_pct * 0.25 + pp * 1.5 + reb * 2.0 + two_pm * 2.3 + big_bonus),
        "중거리슛": clamp(39 + mid_est * 5.0 + num(row.get("FG%")) * 0.35 + pts * 0.35),
        "3점슛": clamp(38 + three_pct * 0.58 + three_pm * 6.5 + three_pa * 1.6 + (3 if pos in ("PG", "SG", "SF") else 0)),
        "자유투": clamp(36 + ft_pct * 0.70 + fta * 1.6),
        "패스": clamp(42 + ast * 8.5 + safe_div(ast, to) * 4.5 + sast * 1.8 + (8 if pos == "PG" else 3 if pos == "SG" else 0)),
        "볼핸들링": clamp(43 + ast * 4.5 + safe_div(ast, to) * 6.0 + stl * 3.5 + guard_bonus),
        "스틸": clamp(45 + stl * 13.0 + dfl * 3.0 + gd * 1.4 + guard_bonus),
        "블록": clamp(35 + blk * 17.0 + dreb * 1.2 + size_bonus * 0.6 + big_bonus),
        "공격리바운드": clamp(36 + oreb * 11.0 + reb * 0.8 + size_bonus * 0.6 + big_bonus),
        "수비리바운드": clamp(38 + dreb * 7.5 + blk * 2.0 + size_bonus * 0.45 + big_bonus),
        "인사이드수비": clamp(38 + blk * 10.5 + dreb * 2.3 + gd * 3.2 + size_bonus * 0.55 + big_bonus),
        "외곽수비": clamp(43 + stl * 9.0 + gd * 4.0 + dfl * 3.0 + guard_bonus + (3 if pos == "SF" else 0)),
    }
    attrs.update(physical(pos, height, weight, wingspan))
    attrs = apply_floors(attrs, pos)
    usage = min(8, max(0, (minutes - 10) * 0.28)) + min(3, max(0, num(row.get("GP")) - 20) * 0.05)
    return pos, attrs, usage


def ovr_for(attrs, pos, usage):
    weights = OVR_WEIGHTS[pos]
    weighted = sum(attrs.get(attr, 50) * weight for attr, weight in weights.items()) / sum(weights.values())
    return clamp(weighted + usage, 30, 99)


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
        "method": "position_weighted_v2_no_minmax",
        "notes": [
            "Min-Max 정규화를 사용하지 않음.",
            "기록 기반 점수에 포지션 기본값, 포지션 바닥값, 신체 보정, 출전시간 신뢰도 보정을 적용함.",
            "OVR은 포지션별 가중치로 계산함. 센터는 리바운드/인사이드수비/블록/포스트, 가드는 패스/볼핸들링/외곽수비/스틸 비중이 높음.",
            "현재능력~더티플레이 히든 구간은 계산하지 않음.",
            "목표 밴드: 95+ MVP급, 90~95 시즌베스트급, 80~90 주전라인업급, 75~80 로테이션급, 70~75 후보급, 60~70 예비/신인급.",
        ],
        "summary": summary,
        "rows": all_rows,
        "rows_by_team": rows_by_team,
        "attrs": ATTRS,
    }
    out = OUT_DIR / "kbl_4teams_ratings_v2.json"
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(out)
    for item in summary:
        print(item)
    print("top 15")
    for row in all_rows[:15]:
        print(row["팀"], row["선수"], row["포지션"], row["OVR"], row["등급"])


if __name__ == "__main__":
    main()
