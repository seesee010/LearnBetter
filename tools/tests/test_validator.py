"""Tests for validate.py"""
import json
import pytest
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from validate import validate_file
from converter import write_json, write_ml

VALID_CARDS = [
    {"front": "Q1", "back": "A1", "tags": []},
    {"front": "Q2", "back": "A2", "tags": []},
]

def test_valid_json_no_errors(tmp_path):
    f = tmp_path / "test.json"
    write_json(VALID_CARDS, str(f))
    errors = validate_file(str(f))
    assert errors == []

def test_valid_ml_no_errors(tmp_path):
    f = tmp_path / "test.mL"
    write_ml(VALID_CARDS, str(f))
    errors = validate_file(str(f))
    assert errors == []

def test_empty_front_detected(tmp_path):
    cards = [{"front": "", "back": "A1", "tags": []}]
    f = tmp_path / "test.json"
    write_json(cards, str(f))
    errors = validate_file(str(f))
    assert any("empty front" in e["message"] for e in errors)

def test_empty_back_detected(tmp_path):
    cards = [{"front": "Q1", "back": "", "tags": []}]
    f = tmp_path / "test.json"
    write_json(cards, str(f))
    errors = validate_file(str(f))
    assert any("empty back" in e["message"] for e in errors)

def test_duplicate_front_detected(tmp_path):
    cards = [
        {"front": "Same question", "back": "A1", "tags": []},
        {"front": "Same question", "back": "A2", "tags": []},
    ]
    f = tmp_path / "test.json"
    write_json(cards, str(f))
    errors = validate_file(str(f))
    assert any("duplicate" in e["message"].lower() for e in errors)

def test_invalid_file_returns_parse_error(tmp_path):
    f = tmp_path / "test.json"
    f.write_text("this is not json{{{", encoding="utf-8")
    errors = validate_file(str(f))
    assert len(errors) > 0
    assert any("Parse error" in e["message"] or "error" in e["message"].lower() for e in errors)

def test_multiple_errors_reported(tmp_path):
    cards = [
        {"front": "", "back": "", "tags": []},
        {"front": "", "back": "A2", "tags": []},
    ]
    f = tmp_path / "test.json"
    write_json(cards, str(f))
    errors = validate_file(str(f))
    assert len(errors) >= 2
