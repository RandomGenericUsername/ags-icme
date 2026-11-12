---
id: OPS-002
title: "Bump the local dev pins to ags-platform v1.1.0 / contracts v0.12.0"
kind: ops-task
status: done
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

Implementation commit `5764eb8` on `ticket/OPS-002-dev-pin-parity`; ticket
opened in `0bdb175` on base `2a2b281` (main, `v0.5.1`).

- Pins: `Makefile:12-13` sets `AGS_PLATFORM_VERSION := v1.1.0` and
  `CONTRACTS_VERSION := v0.12.0` (comment and help path updated at
  `:3-9,35,106`); `.github/workflows/ci.yml:11,38-39,45,50` checks out
  `ags-platform` at `v1.1.0` under `.dev/ags-platform/v1.1.0` and `contracts`
  at `v0.12.0`. `tests/app-contract.test.mjs:216,237-241` asserts the
  `v1.1.0` / `v0.12.0` pins. README (`:126-129,134`), AGENTS (`:64`) and
  CHANGELOG (`:3-12`) carry the same tuple.
- Local checkouts used by the gates:
  `ags-platform` `git describe --tags --exact-match` → `v1.1.0`; `contracts` →
  `v0.12.0`.
- Unchanged surfaces: `git diff --quiet 2a2b281..HEAD -- lib ui style.css
  templates` exits 0. The only `app.tsx` change is the one-line header comment
  naming the contracts pin (`app.tsx:4`); no behavior changed.
- `make gates` with
  `AGS_PLATFORM_DEV=/home/inumaki/Development/dotfiles/ags-platform` and
  `CONTRACTS_ROOT=/home/inumaki/Development/dotfiles/contracts` exited 0 (log
  `/tmp/opencode/icme-ops002/gates-final.log`):
  - all 7 pure suites green (contract, svg, model, diff, templates,
    icme-saved-smoke, palette);
  - conformance 16/16 pass, 0 fail, 0 skipped;
  - drift 49 `ok` checks, `all checks passed`;
  - bundle `build/ags-icme.js` 1187108 bytes;
  - typecheck 0 in-tree errors (28 tolerated `/usr/share/ags/js`, 0
    ags-platform).
- The first fresh-worktree run (`gates-first.log`) failed only at
  `typecheck: platform link missing` because `deps` ran `npm install` after
  `platform-dev` and pruned `node_modules/ags-platform`; the rerun with the
  toolchain installed passed. No source or gate definition changed.
- Release: annotated tag `v0.5.2` on the merged closeout commit after the
  gates; `main` plus the tag are pushed. Existing tags are not moved.

Verify:

```sh
rg -n 'v1\.1\.0|v0\.12\.0' Makefile .github/workflows/ci.yml \
  tests/app-contract.test.mjs README.md AGENTS.md
git diff --quiet 2a2b281..HEAD -- lib ui style.css templates
AGS_PLATFORM_DEV=/home/inumaki/Development/dotfiles/ags-platform \
  CONTRACTS_ROOT=/home/inumaki/Development/dotfiles/contracts make gates
git show v0.5.2 --stat
```

## Commits

| Commit | Subject |
| --- | --- |
| `0bdb175` | `docs(OPS-002): open dev-pin parity ticket` |
| `5764eb8` | `chore(OPS-002): bump local dev pins to ags-platform v1.1.0 and contracts v0.12.0` |
| this closeout commit | `docs(OPS-002): record dev-pin parity evidence and close ticket` |

## Deviations / notes

- `app.tsx:4` is a comment-only update so the header does not claim the old
  contracts version; no executable line changed and `lib/`, `ui/`,
  `style.css` and `templates/` are untouched.
- Historical version references in earlier tickets and CHANGELOG entries are
  kept as history and are not rewritten.
- `templates/ags-app/` is the frozen copyable scaffold and is untouched; it
  does not declare this app's tuple.
- Worktree-local `@girs/`, `env.d.ts`, `tsconfig.json`, `node_modules/` and
  `build/` output are gitignored and not committed. No live GUI apply was run.

## Status

Complete on `ticket/OPS-002-dev-pin-parity`; worktree `.worktrees/OPS-002/`,
base `2a2b281` (main, `v0.5.1`). The branch is fast-forward merged to `main`,
annotated tag `v0.5.2` is created on the merged closeout commit after the
gates, and `main` plus the tag are pushed. Existing tags are not moved.
