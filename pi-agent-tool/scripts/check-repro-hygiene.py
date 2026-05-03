#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    p = ROOT / path
    return p.read_text(errors="ignore") if p.exists() else ""


def pycache_status() -> str:
    result = subprocess.run(
        ["git", "status", "--porcelain=v1", "--", "scripts/__pycache__"],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    return result.stdout.strip()


def write_markdown(path: Path, metrics: dict[str, int]) -> None:
    lines = [
        "# Repro Hygiene Audit",
        "",
        "Purpose: keep the eval runner reproducible. Earlier scorer runs used `python -m py_compile`, which writes Python bytecode caches and can dirty the worktree. The scorer now syntax-checks Python scripts by compiling source in memory instead.",
        "",
        "## Hygiene checks",
        "",
        "| Check | Value | Meaning |",
        "|---|---:|---|",
        f"| hygiene rows | {metrics['repro_hygiene_rows']} | Five reproducibility checks are enforced. |",
        f"| check-script glob | {metrics['repro_hygiene_python_glob']} | `autoresearch.sh` syntax-checks `scripts/check-*.py` dynamically. |",
        f"| no py_compile | {metrics['repro_hygiene_no_py_compile']} | The scorer no longer calls `python -m py_compile`. |",
        f"| in-memory compile | {metrics['repro_hygiene_compile_in_memory']} | Python syntax is checked with `compile(..., 'exec')`. |",
        f"| pycache clean | {metrics['repro_hygiene_pycache_clean']} | `scripts/__pycache__` has no dirty/untracked status after the check. |",
        f"| verified | {metrics['repro_hygiene_verified']} | All hygiene checks passed. |",
        "",
        "## Interpretation",
        "",
        "- Running `./autoresearch.sh` should no longer create or modify local `scripts/__pycache__` files.",
        "- New `scripts/check-*.py` helpers are picked up automatically by the in-memory syntax check, so future audit scripts do not need a hardcoded py-compile list.",
        "",
    ]
    path.write_text("\n".join(lines))


def main() -> int:
    scorer = read("autoresearch.sh")
    status = pycache_status()
    metrics = {
        "repro_hygiene_rows": 5,
        "repro_hygiene_python_glob": int("python_scripts=(scripts/check-*.py)" in scorer),
        "repro_hygiene_no_py_compile": int("-m py_compile" not in scorer and "python3 -m py_compile" not in scorer),
        "repro_hygiene_compile_in_memory": int('compile(Path(filename).read_text(), filename, "exec")' in scorer),
        "repro_hygiene_pycache_clean": int(status == ""),
    }
    verified = int(all(metrics.values()))
    metrics["repro_hygiene_verified"] = verified
    write_markdown(ROOT / "repro-hygiene.md", metrics)
    for key, value in metrics.items():
        print(f"{key}={value}")
    return 0 if verified else 1


if __name__ == "__main__":
    raise SystemExit(main())
