---
id: OPS-003
title: "Bump the local dev pin to ags-platform v1.2.0"
kind: ops-task
status: done
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

Implementation commit `184f873` on `ticket/OPS-003-dev-pin-parity-v120`;
ticket opened in `d697723` on base `09ade7a` (main, `v0.6.0`).

- Pins: `Makefile:3-13` sets `AGS_PLATFORM_VERSION := v1.2.0` and keeps
  `CONTRACTS_VERSION := v0.12.0` (comment and help path updated at `:4,11,35`);
  `.github/workflows/ci.yml:11,38-39,50` checks out `ags-platform` at
  `v1.2.0` under `.dev/ags-platform/v1.2.0` and `contracts` at `v0.12.0`.
  `tests/app-contract.test.mjs:240-242` asserts the `v1.2.0` / `v0.12.0` pins.
  README (`:134-136,142`), AGENTS (`:64`) and CHANGELOG (`:3-11`) carry the
  same tuple.
- Local platform checkout used by the gates:
  `git -C ../ags-platform describe --tags --exact-match` → `v1.2.0`
  (`.dev/ags-platform/v1.2.0` symlinks to it). The `contracts` pin is unchanged
  at `v0.12.0`; the local checkout passed to the gates describes
  `v0.13.0-1-gd7d95d3` and is used read-only.
- Unchanged surfaces: `git diff --quiet -- lib ui style.css templates app.tsx`
  exits 0. No app code, edit-target feature or contracts change.
- `make test` exited 0 (suites `contract svg model diff templates
  icme-saved-smoke palette targets` all green).
- `make conformance CONTRACTS_ROOT=/home/inumaki/Development/dotfiles/contracts`
  → 16 tests, 16 pass, 0 fail, 0 skipped; the pin assertion reports
  “the Makefile pins the v1.2.0 appearance provider and v0.12.0 contracts”.
- `make drift CONTRACTS_ROOT=/home/inumaki/Development/dotfiles/contracts` →
  all checks `ok`, `all checks passed`.
- `make bundle` → `OK: build/ags-icme.js (1193496 bytes)`.
- Typecheck without installing: temporarily copied `@girs/` + `env.d.ts` from
  the main checkout and symlinked `node_modules/ags`/`gnim` from
  `/usr/share/ags/js`, then ran the main checkout's
  `node_modules/.bin/tsc --noEmit -p tsconfig.app.json` and applied the
  Makefile filter: 28 tolerated `/usr/share/ags/js` errors, 0 ags-platform,
  0 other, 0 in the ags-icme tree. Temp artifacts were removed and
  `git status --porcelain` was byte-identical before and after setup.
- Release: annotated tag `v0.6.1` on the merged closeout commit after the
  gates; `main` plus the tag are pushed. `v0.6.0` is not moved.

Verify:

```sh
rg -n 'v1\.2\.0|v0\.12\.0' Makefile .github/workflows/ci.yml \
  tests/app-contract.test.mjs README.md AGENTS.md
git diff --quiet 09ade7a..HEAD -- lib ui style.css templates app.tsx
CONTRACTS_ROOT=/home/inumaki/Development/dotfiles/contracts make test \
  conformance drift bundle
git show v0.6.1 --stat
```

## Commits

| Commit | Subject |
| --- | --- |
| `d697723` | `docs(OPS-003): open dev-pin parity ticket` |
| `184f873` | `chore(OPS-003): bump dev pin to ags-platform v1.2.0` |
| this closeout commit | `docs(OPS-003): record dev-pin parity evidence and close ticket` |

## Deviations / notes

- Historical version references in earlier tickets and CHANGELOG entries are
  kept as history and are not rewritten.
- `templates/ags-app/` is the frozen copyable scaffold and is untouched; it
  does not declare this app's tuple.
- Worktree-local `@girs/`, `env.d.ts`, `tsconfig.json`, `node_modules/`,
  `.dev/` and `build/` output are gitignored and not committed. No live GUI
  apply was run.
- Unlike `v0.6.0`, the `v0.6.1` tag is created on this final close commit
  rather than on the release commit.

## Status

Complete on `ticket/OPS-003-dev-pin-parity-v120`; worktree
`.worktrees/OPS-003/`, base `09ade7a` (main, `v0.6.0`). The branch is
fast-forward merged to `main`, annotated tag `v0.6.1` is created on the merged
closeout commit after the gates, and `main` plus the tag are pushed. Existing
tags, including `v0.6.0`, are not moved.
