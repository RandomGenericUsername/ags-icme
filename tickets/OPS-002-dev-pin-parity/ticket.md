---
id: OPS-002
title: "Bump the local dev pins to ags-platform v1.1.0 / contracts v0.12.0"
kind: ops-task
status: in-progress
lane: direct
links:
  openspec: none
  bmad: none
worktree: .worktrees/OPS-002/
branch: ticket/OPS-002-dev-pin-parity
---

# Bump the local dev pins to ags-platform v1.1.0 / contracts v0.12.0

> `ops-task` MAY be read as `chore` (Shortcut mapping); the file MUST still declare `kind: ops-task`.
> An `ops-task` SHALL NOT declare a `parent:`. Trivial ops tasks may skip OpenSpec/BMAD ceremony but never skip git discipline (main-clean check + worktree + ticket branch).

## Work

Dev-pin parity only: move this app's local `ags-platform` pin from `v1.0.1`
to `v1.1.0` (the REQ-020 required `surface.window` role) and `contracts`
from `v0.8.0` to `v0.12.0` (the REQ-017..REQ-020 host-defaults,
format-aware-consumer, host-rectangle-radii and window-role vocabulary).

- `Makefile`: `AGS_PLATFORM_VERSION := v1.1.0`,
  `CONTRACTS_VERSION := v0.12.0` and the matching comment/help/local-dev path.
- `.github/workflows/ci.yml`: check out `ags-platform` at `ref: v1.1.0` under
  `.dev/ags-platform/v1.1.0`, `contracts` at `ref: v0.12.0`, and assert those
  paths.
- `tests/app-contract.test.mjs`: the pin and contracts-schema assertions
  expect `v1.1.0` / `v0.12.0`.
- `README.md`, `AGENTS.md`, `CHANGELOG.md`: record the `v1.1.0` / `v0.12.0`
  tuple and the `v0.5.2` patch release note.
- Out of scope: app code, UI behavior, handler/ack behavior, deferred-save
  logic, `style.css`, layout tokens, lane policy and `templates/ags-app/`. No
  live apply.

## Done-when

The repo pins `ags-platform` `v1.1.0` / `contracts` `v0.12.0` everywhere it
declares the tuple, `make gates` passes locally, and the branch fast-forwards
to `main` behind annotated tag `v0.5.2`.

## Evidence

Ticket opened on base `2a2b281` (main, `v0.5.1`) in worktree
`.worktrees/OPS-002/`, branch `ticket/OPS-002-dev-pin-parity`. Evidence is
recorded in the closeout commit after the gates.

Verify:

```sh
rg -n 'v1\.1\.0|v0\.12\.0' Makefile .github/workflows/ci.yml \
  tests/app-contract.test.mjs README.md AGENTS.md
git diff --quiet 2a2b281..HEAD -- app.tsx lib ui style.css templates
AGS_PLATFORM_DEV=/home/inumaki/Development/dotfiles/ags-platform \
  CONTRACTS_ROOT=/home/inumaki/Development/dotfiles/contracts make gates
git show v0.5.2 --stat
```

## Commits

| Commit | Subject |
| --- | --- |
| this commit | `docs(OPS-002): open dev-pin parity ticket` |

## Deviations / notes

- Historical version references in earlier tickets and CHANGELOG entries are
  kept as history and are not rewritten.

## Status

In progress on `ticket/OPS-002-dev-pin-parity`; worktree `.worktrees/OPS-002/`,
base `2a2b281` (main, `v0.5.1`).
