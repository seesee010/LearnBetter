#!/usr/bin/env python3
"""Import CSV/TSV files into JSON flashcard format."""

import sys
import csv
import json
from pathlib import Path

def looks_like_header(row: list[str]) -> bool:
    if not row:
        return False
    first = row[0].strip().lower()
    return first in {"front", "question", "q", "term", "word"}

def import_file(input_path: str, output_path: str) -> int:
    ext = Path(input_path).suffix.lower()
    delimiter = "\t" if ext == ".tsv" else ","

    cards = []
    with open(input_path, encoding="utf-8", newline="") as f:
        reader = csv.reader(f, delimiter=delimiter)
        rows = list(reader)

    start = 1 if rows and looks_like_header(rows[0]) else 0

    for row in rows[start:]:
        if len(row) < 2:
            continue
        front, back = row[0].strip(), row[1].strip()
        if not front or not back:
            continue
        tags = [t.strip() for t in row[2].split(",") if t.strip()] if len(row) > 2 and row[2].strip() else []
        cards.append({"front": front, "back": back, "tags": tags})

    out = {"cards": cards}
    Path(output_path).write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    return len(cards)

def main():
    if len(sys.argv) != 3:
        print("Usage: python importer.py <input.csv|.tsv> <output.json>", file=sys.stderr)
        sys.exit(1)
    input_path, output_path = sys.argv[1], sys.argv[2]
    try:
        count = import_file(input_path, output_path)
        print(f"Imported {count} cards to {output_path}")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
