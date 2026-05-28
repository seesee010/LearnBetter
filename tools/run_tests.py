#!/usr/bin/env python3
"""Orchestrate running all test suites and report results."""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent

def run_suite(name: str, cmd: list[str], cwd: str) -> tuple[bool, str]:
    try:
        result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=300)
        passed = result.returncode == 0
        output = result.stdout + result.stderr
        return passed, output
    except subprocess.TimeoutExpired:
        return False, "TIMEOUT after 300s"
    except Exception as e:
        return False, f"Failed to run: {e}"

def main():
    print("=" * 60)
    print("Learn++ Test Suite Runner")
    print("=" * 60)

    results = []

    # Python tests
    print("\n[1/3] Running Python tests (pytest)...")
    ok, out = run_suite("Python", [sys.executable, "-m", "pytest", "tools/tests/", "-v"], str(ROOT))
    results.append(("Python (pytest)", ok, out))
    print("  PASS" if ok else "  FAIL")

    # Rust tests
    print("\n[2/3] Running Rust tests (cargo test)...")
    ok, out = run_suite("Rust", ["cargo", "+stable-x86_64-pc-windows-gnu", "test", "--manifest-path", "src-tauri/Cargo.toml", "--target", "x86_64-pc-windows-gnu", "--lib"], str(ROOT))
    results.append(("Rust (cargo test)", ok, out))
    print("  PASS" if ok else "  FAIL")

    # Frontend tests
    print("\n[3/3] Running Frontend tests (vitest)...")
    ok, out = run_suite("Frontend", ["npm", "run", "test"], str(ROOT))
    results.append(("Frontend (vitest)", ok, out))
    print("  PASS" if ok else "  FAIL")

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    all_passed = True
    for name, passed, _ in results:
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {name}")
        if not passed:
            all_passed = False

    print("=" * 60)
    if all_passed:
        print("All test suites passed!")
    else:
        print("Some test suites failed. See output above.")

    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
