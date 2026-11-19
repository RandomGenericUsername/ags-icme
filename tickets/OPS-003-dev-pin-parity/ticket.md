---
id: OPS-003
title: "Bump the local dev pin to ags-platform v1.2.0"
kind: ops-task
status: in-progress
lane: direct
links:
  openspec: none
  bmad: none
worktree: .worktrees/OPS-003/
branch: ticket/OPS-003-dev-pin-parity-v120
---

# Bump the local dev pin to ags-platform v1.2.0

> `ops-task` MAY be read as `chore` (Shortcut mapping); the file MUST still declare `kind: ops-task`.
> An `ops-task` SHALL NOT declare a `parent:`. Trivial ops tasks may skip OpenSpec/BMAD ceremony but never skip git discipline (main-clean check + worktree + ticket branch).

## Work

Dev-pin parity only: align this app's local dev/test/CI `ags-platform` pin
with the composition tuple, moving from `v1.1.0` to `v1.2.0` (the
media-controls/settings icon-registry release). `contracts` stays at `v0.12.0`;
the composition tuple becomes `ags-platform v1.2.0 / contracts v0.12.0`.

- `Makefile`: `AGS_PLATFORM_VERSION := v1.2.0`, plus the comment/help text that
  names `v1.1.0` and the `.dev/ags-platform/v1.1.0` example.
- `.github/workflows/ci.yml`: the tuple comment, `ref: v1.2.0`,
  `path: .dev/ags-platform/v1.2.0` and the `test -f` assertion.
- `README.md`: the local-development tuple text and the symlink example.
- `AGENTS.md`: the program tuple line.
- `tests/app-contract.test.mjs`: the pin assertion test name and regex.
- `CHANGELOG.md`: a `## v0.6.1 — 2026-11-19` entry stating this is a dev-pin
  parity release only.
- Out of scope: app code, `lib/`, `ui/`, `style.css`, the edit-target feature,
  `contracts`, lane policy and `templates/ags-app/`. No live apply.

## Done-when

The repo pins `ags-platform` `v1.2.0` / `contracts` `v0.12.0` everywhere it
declares the tuple, `make test`, `make conformance`, `make drift`, `make bundle`
and the local typecheck pass, and the branch fast-forwards to `main` behind
annotated tag `v0.6.1` on the final close commit.

## Evidence

MISSING — fill in after the gates.

## Commits

| Commit | Subject |
| --- | --- |
| this commit | `docs(OPS-003): open dev-pin parity ticket` |

## Deviations / notes

- None yet.

## Status

In progress on `ticket/OPS-003-dev-pin-parity-v120`; worktree
`.worktrees/OPS-003/`, base `09ade7a` (main, `v0.6.0`).
