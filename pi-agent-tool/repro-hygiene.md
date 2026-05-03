# Repro Hygiene Audit

Purpose: keep the eval runner reproducible. Earlier scorer runs used `python -m py_compile`, which writes Python bytecode caches and can dirty the worktree. The scorer now syntax-checks Python scripts by compiling source in memory instead.

## Hygiene checks

| Check | Value | Meaning |
|---|---:|---|
| hygiene rows | 5 | Five reproducibility checks are enforced. |
| check-script glob | 1 | `autoresearch.sh` syntax-checks `scripts/check-*.py` dynamically. |
| no py_compile | 1 | The scorer no longer calls `python -m py_compile`. |
| in-memory compile | 1 | Python syntax is checked with `compile(..., 'exec')`. |
| pycache clean | 1 | `scripts/__pycache__` has no dirty/untracked status after the check. |
| verified | 1 | All hygiene checks passed. |

## Interpretation

- Running `./autoresearch.sh` should no longer create or modify local `scripts/__pycache__` files.
- New `scripts/check-*.py` helpers are picked up automatically by the in-memory syntax check, so future audit scripts do not need a hardcoded py-compile list.
