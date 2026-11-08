---
id: OPS-001
title: "Bump the local ags-platform pin from v1.0.0 to v1.0.1"
kind: ops-task
status: in-progress
lane: direct
links:
  openspec: none
  bmad: none
worktree: .worktrees/OPS-001/
branch: ticket/OPS-001-dev-pin-parity
---

# Bump the local ags-platform pin from v1.0.0 to v1.0.1

> `ops-task` MAY be read as `chore` (Shortcut mapping); the file MUST still declare `kind: ops-task`.
> An `ops-task` SHALL NOT declare a `parent:`. Trivial ops tasks may skip OpenSpec/BMAD ceremony but never skip git discipline (main-clean check + worktree + ticket branch).

## Work

Dev-pin parity only: move this app's local `ags-platform` pin from `v1.0.0`
to `v1.0.1` (the BUG-002 appearance CSS hex-literal validation patch) while
keeping `contracts` at `v0.8.0`.

- `Makefile`: `AGS_PLATFORM_VERSION := v1.0.1` and the matching help/local-dev
  comments.
- `.github/workflows/ci.yml`: check out `ags-platform` at `ref: v1.0.1` under
  `.dev/ags-platform/v1.0.1` and assert that path.
- `tests/app-contract.test.mjs`: the pin assertion expects `v1.0.1`.
- `README.md`, `AGENTS.md`, `CHANGELOG.md`: record the `v1.0.1` tuple and the
  v0.5.1 release note.
- Out of scope: app code, handler/ack behavior, deferred-save logic,
  `style.css`, layout tokens, lane policy and `templates/ags-app/`. No live
  apply.

## Done-when

The repo pins `ags-platform` `v1.0.1` / `contracts` `v0.8.0` everywhere it
declares the tuple, `make gates` passes locally, and the branch fast-forwards
to `main` behind annotated tag `v0.5.1`.

## Evidence

Pending implementation.

## Commits

| Commit | Subject |
| --- | --- |
| this commit | `docs(OPS-001): open dev-pin parity ticket` |
| pending | `chore(OPS-001): bump local ags-platform pin to v1.0.1` |
| pending | `docs(OPS-001): record dev-pin parity evidence and close ticket` |

## Status

In progress on `ticket/OPS-001-dev-pin-parity`, worktree `.worktrees/OPS-001/`,
base `49fd1ea` (main, `v0.5.0`).
