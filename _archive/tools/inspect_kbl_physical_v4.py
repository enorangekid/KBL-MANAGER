import json
from pathlib import Path


data = json.loads(Path("outputs/kbl_ratings_v4/kbl_4teams_ratings_v4.json").read_text(encoding="utf-8"))

for attr in ["스피드", "민첩성", "힘", "점프력", "볼과함께뛰는속도"]:
    vals = [row[attr] for row in data["rows"]]
    print("\n", attr, "min", min(vals), "max", max(vals), "avg", round(sum(vals) / len(vals), 1))
    print("top")
    for row in sorted(data["rows"], key=lambda item: -item[attr])[:8]:
        print(row["팀"], row["선수"], row["포지션"], attr, row[attr], "체격", row["신장"], row["체중"], row["윙스팬"])
    print("bottom")
    for row in sorted(data["rows"], key=lambda item: item[attr])[:5]:
        print(row["팀"], row["선수"], row["포지션"], attr, row[attr], "체격", row["신장"], row["체중"], row["윙스팬"])
