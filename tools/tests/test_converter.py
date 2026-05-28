"""Tests for converter.py"""
import json
import pytest
import tempfile
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from converter import (
    parse_ml, parse_json, parse_yaml, parse_toml, parse_csv,
    write_ml, write_json, write_yaml, write_toml, write_csv,
    parse_file, write_file
)

SAMPLE_CARDS = [
    {"front": "What is 2+2?", "back": "4", "tags": []},
    {"front": "Capital of France?", "back": "Paris", "tags": ["geography"]},
    {"front": "Hello in German?", "back": "Hallo", "tags": ["language", "german"]},
]

# --- .mL ---

def test_parse_ml_valid(tmp_path):
    f = tmp_path / "test.mL"
    f.write_text(".mL\n--0--\nF: Q1\nA: A1\nF: Q2\nA: A2\n--;--\n", encoding="utf-8")
    cards = parse_ml(str(f))
    assert len(cards) == 2
    assert cards[0]["front"] == "Q1"
    assert cards[1]["back"] == "A2"

def test_parse_ml_multiple_blocks(tmp_path):
    f = tmp_path / "test.mL"
    f.write_text(".mL\n--0--\nF: Q1\nA: A1\n--;--\n--0--\nF: Q2\nA: A2\n--;--\n", encoding="utf-8")
    cards = parse_ml(str(f))
    assert len(cards) == 2

def test_parse_ml_invalid_header(tmp_path):
    f = tmp_path / "test.mL"
    f.write_text("not_ml\nF: Q\nA: A\n", encoding="utf-8")
    with pytest.raises(ValueError, match="must start with"):
        parse_ml(str(f))

def test_parse_ml_special_chars(tmp_path):
    f = tmp_path / "test.mL"
    f.write_text(".mL\n--0--\nF: Was ist 2+2?\nA: Das Ergebnis ist 4!\n--;--\n", encoding="utf-8")
    cards = parse_ml(str(f))
    assert cards[0]["front"] == "Was ist 2+2?"
    assert "4" in cards[0]["back"]

# --- JSON ---

def test_parse_json_valid(tmp_path):
    f = tmp_path / "test.json"
    data = {"cards": [{"front": "Q1", "back": "A1"}, {"front": "Q2", "back": "A2", "tags": ["math"]}]}
    f.write_text(json.dumps(data), encoding="utf-8")
    cards = parse_json(str(f))
    assert len(cards) == 2
    assert cards[1]["tags"] == ["math"]

def test_parse_json_missing_tags_defaults(tmp_path):
    f = tmp_path / "test.json"
    f.write_text('{"cards":[{"front":"Q","back":"A"}]}', encoding="utf-8")
    cards = parse_json(str(f))
    assert cards[0]["tags"] == []

# --- YAML ---

def test_parse_yaml_valid(tmp_path):
    pytest.importorskip("yaml")
    f = tmp_path / "test.yaml"
    f.write_text("cards:\n  - front: Q1\n    back: A1\n  - front: Q2\n    back: A2\n    tags: [math]\n", encoding="utf-8")
    cards = parse_yaml(str(f))
    assert len(cards) == 2
    assert cards[1]["tags"] == ["math"]

# --- TOML ---

def test_parse_toml_valid(tmp_path):
    f = tmp_path / "test.toml"
    f.write_text('[[cards]]\nfront = "Q1"\nback = "A1"\n\n[[cards]]\nfront = "Q2"\nback = "A2"\ntags = ["geo"]\n', encoding="utf-8")
    cards = parse_toml(str(f))
    assert len(cards) == 2
    assert cards[1]["tags"] == ["geo"]

# --- CSV ---

def test_parse_csv_valid(tmp_path):
    f = tmp_path / "test.csv"
    f.write_text("Q1,A1\nQ2,A2,tag1\nQ3,A3,\"t1,t2\"\n", encoding="utf-8")
    cards = parse_csv(str(f))
    assert len(cards) == 3
    assert cards[1]["tags"] == ["tag1"]

def test_parse_csv_skips_empty(tmp_path):
    f = tmp_path / "test.csv"
    f.write_text("Q1,A1\n,\nQ2,A2\n", encoding="utf-8")
    cards = parse_csv(str(f))
    assert len(cards) == 2

# --- Round-trip tests ---

def test_roundtrip_ml_to_json(tmp_path):
    src = tmp_path / "src.mL"
    src.write_text(".mL\n--0--\nF: Q1\nA: A1\nF: Q2\nA: A2\n--;--\n", encoding="utf-8")
    cards_in = parse_ml(str(src))

    dst = tmp_path / "dst.json"
    write_json(cards_in, str(dst))
    cards_out = parse_json(str(dst))

    assert len(cards_in) == len(cards_out)
    assert cards_in[0]["front"] == cards_out[0]["front"]
    assert cards_in[0]["back"] == cards_out[0]["back"]

def test_roundtrip_json_to_yaml(tmp_path):
    pytest.importorskip("yaml")
    src = tmp_path / "src.json"
    write_json(SAMPLE_CARDS, str(src))
    cards_in = parse_json(str(src))

    dst = tmp_path / "dst.yaml"
    write_yaml(cards_in, str(dst))
    cards_out = parse_yaml(str(dst))

    assert len(cards_in) == len(cards_out)
    for c_in, c_out in zip(cards_in, cards_out):
        assert c_in["front"] == c_out["front"]
        assert c_in["back"] == c_out["back"]

def test_roundtrip_json_to_toml(tmp_path):
    src = tmp_path / "src.json"
    write_json(SAMPLE_CARDS, str(src))
    cards_in = parse_json(str(src))

    dst = tmp_path / "dst.toml"
    write_toml(cards_in, str(dst))
    cards_out = parse_toml(str(dst))

    assert len(cards_in) == len(cards_out)
    assert cards_in[0]["front"] == cards_out[0]["front"]

def test_roundtrip_json_to_ml(tmp_path):
    src = tmp_path / "src.json"
    write_json(SAMPLE_CARDS, str(src))
    cards_in = parse_json(str(src))

    dst = tmp_path / "dst.mL"
    write_ml(cards_in, str(dst))
    cards_out = parse_ml(str(dst))

    assert len(cards_in) == len(cards_out)
    assert cards_in[0]["front"] == cards_out[0]["front"]

def test_special_characters_preserved(tmp_path):
    cards = [{"front": "Ü, Ö, Ä, ß", "back": "German umlauts", "tags": []}]
    dst = tmp_path / "test.json"
    write_json(cards, str(dst))
    result = parse_json(str(dst))
    assert result[0]["front"] == "Ü, Ö, Ä, ß"
