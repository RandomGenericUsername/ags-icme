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

Implementation commit `4ee7135` on `ticket/OPS-001-dev-pin-parity`; ticket
opened in `32dcc69` on base `49fd1ea` (main, `v0.5.0`).

- Pins: `Makefile:11-12` sets `AGS_PLATFORM_VERSION := v1.0.1` and
  `CONTRACTS_VERSION := v0.8.0` (comment and help path updated at `:3-10,34`);
  `.github/workflows/ci.yml:11,38-39,50` checks out `ags-platform` at
  `v1.0.1` under `.dev/ags-platform/v1.0.1` and keeps `contracts` at `v0.8.0`
  (`:45`). `tests/app-contract.test.mjs:237-241` asserts the `v1.0.1` /
  `v0.8.0` pins. README (`:126-128,133`), AGENTS (`:64`) and CHANGELOG
  (`:3-9`) carry the same tuple.
- Local checkouts used by the gates:
  `ags-platform` `git describe --tags --exact-match` → `v1.0.1`; `contracts` →
  `v0.8.0`.
- Unchanged surfaces: `git diff --quiet 49fd1ea..HEAD -- app.tsx lib ui
  style.css templates` exits 0. The implementation diff touches only
  `.github/workflows/ci.yml`, `AGENTS.md`, `CHANGELOG.md`, `Makefile`,
  `README.md` and `tests/app-contract.test.mjs`.
- `make gates` with
  `AGS_PLATFORM_DEV=/home/inumaki/Development/dotfiles/ags-platform` and
  `CONTRACTS_ROOT=/home/inumaki/Development/dotfiles/contracts` exited 0 (log
  `/tmp/opencode/icme-ops001/gates-final.log`):
  - all 7 pure suites green (contract, svg, model, diff, templates,
    icme-saved-smoke, palette);
  - conformance 16/16 pass, 0 fail, 0 skipped;
  - drift 49 `ok` checks, `all checks passed`;
  - bundle `build/ags-icme.js` 1184100 bytes;
  - typecheck 0 in-tree errors (28 tolerated `/usr/share/ags/js`, 0
    ags-platform).
- The first fresh-worktree run failed only at `typecheck: platform link
  missing` because `deps` ran `npm install` after `platform-dev` and pruned
  `node_modules/ags-platform`; the rerun with the toolchain installed passed.
  No source or gate definition changed.
- Release: annotated tag `v0.5.1` on the merged closeout commit after the
  gates; `main` plus the tag are pushed. Existing tags are not moved.

Verify:

```sh
rg -n 'v1\.0\.1|v0\.8\.0' Makefile .github/workflows/ci.yml \
  tests/app-contract.test.mjs README.md AGENTS.md
git diff --quiet 49fd1ea..HEAD -- app.tsx lib ui style.css templates
AGS_PLATFORM_DEV=/home/inumaki/Development/dotfiles/ags-platform \
  CONTRACTS_ROOT=/home/inumaki/Development/dotfiles/contracts make gates
git show v0.5.1 --stat
```

## Commits

| Commit | Subject |
| --- | --- |
| `32dcc69` | `docs(OPS-001): open dev-pin parity ticket` |
| `4ee7135` | `chore(OPS-001): bump local ags-platform pin to v1.0.1` |
| this closeout commit | `docs(OPS-001): record dev-pin parity evidence and close ticket` |

## Deviations / notes

- `templates/ags-app/` is the frozen copyable scaffold and is untouched; it
  does not declare this app's tuple.
- Historical `v1.0.0` references in `tickets/REQ-007-generations-v3/ticket.md`
  and the older CHANGELOG entries are kept as history and are not rewritten.
- Worktree-local `@girs/`, `env.d.ts`, `node_modules/` and `build/` output are
  gitignored and not committed. No live GUI apply was run.

## Status

Complete on `ticket/OPS-001-dev-pin-parity`; worktree `.worktrees/OPS-001/`,
base `49fd1ea` (main, `v0.5.0`). The branch is fast-forward merged to `main`,
annotated tag `v0.5.1` is created on the merged closeout commit after the
gates, and `main` plus the tag are pushed. Existing tags are not moved.
