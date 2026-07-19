import json
from pathlib import Path


data = json.loads(Path("outputs/kbl_ratings_v2/kbl_4teams_ratings_v2.json").read_text(encoding="utf-8"))
attrs = data["attrs"]

print("99 frequency")
for attr in attrs:
    vals = [row[attr] for row in data["rows"]]
    print(attr, vals.count(99), "min", min(vals), "max", max(vals), "avg", round(sum(vals) / len(vals), 1))

print("\nTop shooting attrs")
for attr in ["근거리슛", "중거리슛", "자유투", "3점슛"]:
    print("\n", attr)
    for row in sorted(data["rows"], key=lambda item: -item[attr])[:15]:
        print(row["팀"], row["선수"], row["포지션"], attr, row[attr], "OVR", row["OVR"])

print("\nPlayers with attrs below 60")
for row in data["rows"]:
    lows = [attr for attr in attrs if row[attr] < 60]
    if lows:
        print(row["팀"], row["선수"], "OVR", row["OVR"], len(lows), lows[:10])
