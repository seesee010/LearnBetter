#!/usr/bin/env python3
"""Convert flashcard files between formats: .mL, .json, .yaml, .toml, .csv"""

import sys
import json
import csv
import tomllib
from pathlib import Path

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False

# ---------- Parsers ----------

def parse_ml(path: str) -> list[dict]:
    cards = []
    content = Path(path).read_text(encoding="utf-8")
    lines = content.splitlines()
    if not lines or lines[0].strip() != ".mL":
        raise ValueError("File must start with '.mL'")
    in_block = False
    current_front = None
    current_back = None
    for line in lines[1:]:
        stripped = line.strip()
        if stripped == "--0--":
            in_block = True
            current_front = None
            current_back = None
        elif stripped == "--;--":
            if current_front and current_back:
                cards.append({"front": current_front, "back": current_back, "tags": []})
            in_block = False
        elif in_block:
            if stripped.startswith("F:"):
                if current_front is not None and current_back is not None:
                    cards.append({"front": current_front, "back": current_back, "tags": []})
                    current_back = None
                current_front = stripped[2:].strip()
            elif stripped.startswith("A:"):
                current_back = stripped[2:].strip()
    return cards

def parse_json(path: str) -> list[dict]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return [{"front": c["front"], "back": c["back"], "tags": c.get("tags", [])} for c in data["cards"]]

def parse_yaml(path: str) -> list[dict]:
    if not HAS_YAML:
        raise ImportError("PyYAML not installed. Run: pip install pyyaml")
    data = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    return [{"front": c["front"], "back": c["back"], "tags": c.get("tags", [])} for c in data["cards"]]

def parse_toml(path: str) -> list[dict]:
    data = tomllib.loads(Path(path).read_text(encoding="utf-8"))
    return [{"front": c["front"], "back": c["back"], "tags": c.get("tags", [])} for c in data["cards"]]

def parse_csv(path: str) -> list[dict]:
    cards = []
    with open(path, encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) < 2:
                continue
            front, back = row[0].strip(), row[1].strip()
            if not front or not back:
                continue
            tags = [t.strip() for t in row[2].split(",")] if len(row) > 2 and row[2].strip() else []
            cards.append({"front": front, "back": back, "tags": tags})
    return cards

def parse_file(path: str) -> list[dict]:
    ext = Path(path).suffix.lower()
    parsers = {".ml": parse_ml, ".json": parse_json, ".yaml": parse_yaml, ".yml": parse_yaml, ".toml": parse_toml, ".csv": parse_csv}
    if ext not in parsers:
        raise ValueError(f"Unsupported format: {ext}")
    return parsers[ext](path)

# ---------- Writers ----------

def write_ml(cards: list[dict], path: str) -> None:
    lines = [".mL", "--0--"]
    for card in cards:
        lines.append(f"F: {card['front']}")
        lines.append(f"A: {card['back']}")
    lines.append("--;--")
    Path(path).write_text("\n".join(lines) + "\n", encoding="utf-8")

def write_json(cards: list[dict], path: str) -> None:
    Path(path).write_text(json.dumps({"cards": cards}, ensure_ascii=False, indent=2), encoding="utf-8")

def write_yaml(cards: list[dict], path: str) -> None:
    if not HAS_YAML:
        raise ImportError("PyYAML not installed. Run: pip install pyyaml")
    Path(path).write_text(yaml.dump({"cards": cards}, allow_unicode=True, default_flow_style=False), encoding="utf-8")

def write_toml(cards: list[dict], path: str) -> None:
    # Manual TOML writer (no tomli_w needed)
    lines = []
    for card in cards:
        lines.append("[[cards]]")
        lines.append(f'front = {json.dumps(card["front"])}')
        lines.append(f'back = {json.dumps(card["back"])}')
        if card.get("tags"):
            tags_str = "[" + ", ".join(json.dumps(t) for t in card["tags"]) + "]"
            lines.append(f"tags = {tags_str}")
        lines.append("")
    Path(path).write_text("\n".join(lines), encoding="utf-8")

def write_csv(cards: list[dict], path: str) -> None:
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        for card in cards:
            tags_str = ",".join(card.get("tags", []))
            writer.writerow([card["front"], card["back"], tags_str])

def write_file(cards: list[dict], path: str) -> None:
    ext = Path(path).suffix.lower()
    writers = {".ml": write_ml, ".json": write_json, ".yaml": write_yaml, ".yml": write_yaml, ".toml": write_toml, ".csv": write_csv}
    if ext not in writers:
        raise ValueError(f"Unsupported output format: {ext}")
    writers[ext](cards, path)

# ---------- CLI ----------

def main():
    if len(sys.argv) != 3:
        print("Usage: python converter.py <input_file> <output_file>", file=sys.stderr)
        sys.exit(1)
    input_path, output_path = sys.argv[1], sys.argv[2]
    try:
        cards = parse_file(input_path)
        write_file(cards, output_path)
        print(f"Converted {len(cards)} cards: {input_path} -> {output_path}")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
