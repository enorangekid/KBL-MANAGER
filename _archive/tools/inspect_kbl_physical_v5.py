import json
from pathlib import Path


data = json.loads(Path("outputs/kbl_ratings_v5/kbl_4teams_ratings_v5.json").read_text(encoding="utf-8"))

for attr in ["점프력", "체력", "스피드", "민첩성", "힘"]:
    vals = [row[attr] for row in data["rows"]]
    print("\n", attr, "min", min(vals), "max", max(vals), "avg", round(sum(vals) / len(vals), 1))
    print("top")
    for row in sorted(data["rows"], key=lambda item: -item[attr])[:8]:
        print(row["팀"], row["선수"], row["포지션"], attr, row[attr], "OVR", row["OVR"], "MIN", row["MIN"])
    print("bottom")
    for row in sorted(data["rows"], key=lambda item: item[attr])[:5]:
        print(row["팀"], row["선수"], row["포지션"], attr, row[attr], "OVR", row["OVR"], "MIN", row["MIN"])
