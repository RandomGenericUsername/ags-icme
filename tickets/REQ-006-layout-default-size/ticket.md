---
id: REQ-006
title: "Restore the pre-v2 window default size fallback"
kind: requirement
status: done
lane: direct
links:
  openspec: none
  bmad: none
worktree: .worktrees/REQ-006/
branch: ticket/REQ-006-layout-default-size
---

# Restore the pre-v2 window default size fallback

## Requirement

v0.4.0 replaced the window default size `1280x800` with the `layout.ags-icme`
tokens and set the source fallbacks to `960x600` (derived from the `style.css`
minimums). That changed behavior when the appearance token is missing. The
assets manifest is being corrected to `1280x800` (`dotfiles-assets` v0.12.2),
so the source fallbacks must match the pre-v2 defaults again:

- `ui/EditorWindow.tsx` keeps reading
  `layout.ags-icme.root-width` / `root-height` through the Appearance
  accessors, but the fallbacks become `1280` and `800`.
- A missing appearance generation therefore keeps today's pre-v2 default size;
  the corrected manifest token yields the same `1280x800`.
- No other behavior, class or structure changes. Platform/contracts pins are
  unchanged (no assets tag is referenced in this repo).

## Acceptance

- [x] `ui/EditorWindow.tsx` reads `layout.ags-icme.root-width` with fallback
      `1280` and `layout.ags-icme.root-height` with fallback `800`, still fed
      to `default_width` / `default_height` through `.peek()`.
- [x] No class, structure or other behavior change; `style.css`, `app.tsx`,
      `lib/` and wiring are untouched.
- [x] The source conformance test asserts the `1280` / `800` fallbacks.
- [x] Internal pins are unchanged because no assets tag is referenced.
- [x] `make gates` passes on the ticket branch with local overrides.
- [x] The branch merges fast-forward to `main`, annotated tag `v0.4.1` is
      created after the gates, and nothing is pushed.

## Evidence

Implementation commit `e92c43e` on
`ticket/REQ-006-layout-default-size`; ticket opened in `566f213` on base
`94f1ebd` (main, `v0.4.0`).

- `ui/EditorWindow.tsx:85-90` keeps the TSX-owned tokens and restores the
  fallbacks: `appearance.value("layout.ags-icme.root-width", 1280)` and
  `appearance.value("layout.ags-icme.root-height", 800)`.
- `ui/EditorWindow.tsx:620-621` still feeds those values to
  `default_width={rootWidth.peek()}` / `default_height={rootHeight.peek()}`.
- `tests/app-contract.test.mjs:299-314` asserts the `1280` / `800` fallbacks
  (and still rejects hard-coded `default_width={1280}` /
  `default_height={800}`); conformance passed 16/16.
- Unchanged surfaces: `git diff --quiet 94f1ebd..HEAD -- style.css app.tsx
  lib templates` exits 0 (no class, structure, wiring or logic change).
- Pins: `Makefile:9-10` still sets `AGS_PLATFORM_VERSION := v0.9.0` and
  `CONTRACTS_VERSION := v0.7.0`; no `dotfiles-assets` tag is referenced in the
  repo, so no internal pin changed. Local checkouts used by the gates:
  `ags-platform` → `v0.9.0`, `contracts` → `v0.7.0`.
- `make gates` with
  `AGS_PLATFORM_DEV=/home/inumaki/Development/dotfiles/ags-platform` and
  `CONTRACTS_ROOT=/home/inumaki/Development/dotfiles/contracts` exited 0 (log
  `/tmp/opencode/icme-req006/gates-final.log`): all seven pure suites green
  (contract, svg, model, diff, templates, icme-saved-smoke, palette),
  conformance 16/16, drift `all checks passed`, bundle
  `build/ags-icme.js` 1124788 bytes, typecheck 0 in-tree errors (28 tolerated
  `/usr/share/ags/js`, 0 platform).
- Resulting default size when the manifest token and the fallback agree:
  `1280x800`.
- Release: the patch after `v0.4.0`, annotated tag `v0.4.1`, is created on the
  merged closeout commit after the gates; nothing is pushed.

Verify:

```sh
rg -n 'root-width|root-height|default_width|default_height' ui/EditorWindow.tsx
AGS_PLATFORM_DEV=/home/inumaki/Development/dotfiles/ags-platform \
  CONTRACTS_ROOT=/home/inumaki/Development/dotfiles/contracts make gates
git show v0.4.1 --stat
```

## Commits

| Commit | Subject |
| --- | --- |
| `566f213` | `docs(tickets): open REQ-006 layout default size` |
| `e92c43e` | `fix(REQ-006): restore pre-v2 window default size fallback` |
| this closeout commit | `docs(REQ-006): record layout default size evidence and close ticket` |

## Deviations / notes

- The first local `make gates` run fetched TypeScript into a fresh worktree
  `node_modules/`, which pruned the `ags-platform` link that the earlier
  `platform-dev` step had created; the rerun with the toolchain already
  installed (`gates-final.log`) passed. No source or gate definition changed.
- Worktree-local `@girs/`, `env.d.ts`, `node_modules/` and `build/` output are
  gitignored and not committed.
- No live GUI session was run; the source conformance test and typecheck pin
  the token/fallback read and the unchanged window props.

## Status

Complete on `ticket/REQ-006-layout-default-size`; worktree
`.worktrees/REQ-006/`, base `94f1ebd` (main, `v0.4.0`). The branch is
fast-forward merged to `main` and tagged `v0.4.1`; existing tags are not moved
and nothing is pushed.
