#!/usr/bin/env python3
"""Validate flashcard files for correctness."""

import sys
import json
from pathlib import Path
from converter import parse_file

def validate_file(path: str) -> list[dict]:
    errors = []
    try:
        cards = parse_file(path)
    except Exception as e:
        return [{"line": 0, "message": f"Parse error: {e}"}]

    seen_fronts = {}
    for i, card in enumerate(cards):
        line = i + 1
        if not card.get("front", "").strip():
            errors.append({"line": line, "message": f"Card {line}: empty front (question)"})
        if not card.get("back", "").strip():
            errors.append({"line": line, "message": f"Card {line}: empty back (answer)"})
        front = card.get("front", "").strip()
        if front in seen_fronts:
            errors.append({"line": line, "message": f"Card {line}: duplicate front '{front[:30]}' (first seen at card {seen_fronts[front]})"})
        else:
            seen_fronts[front] = line
    return errors

def main():
    if len(sys.argv) != 2:
        print("Usage: python validate.py <file>", file=sys.stderr)
        sys.exit(1)
    path = sys.argv[1]
    errors = validate_file(path)
    print(json.dumps(errors, ensure_ascii=False, indent=2))
    sys.exit(1 if errors else 0)

if __name__ == "__main__":
    main()
