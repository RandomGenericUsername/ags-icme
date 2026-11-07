---
id: REQ-007
title: "Consume Generations v3 and the generation-bound appearance refresh"
kind: requirement
status: in-progress
lane: direct
links:
  openspec: none
  bmad: none
worktree: .worktrees/REQ-007/
branch: ticket/REQ-007-generations-v3
---

# Consume Generations v3 and the generation-bound appearance refresh

## Requirement

Contracts `v0.8.0` / `ags-platform` `v1.0.0` freeze Generations v3: one
immutable `state/generations/<genHash>/` tree behind one `state/current`
pointer, and a generation-bound `appearance-refresh <genHash>` request whose
response MUST name the requested generation. Migrate ICME without changing its
editor behavior:

- Pin `ags-platform` `v1.0.0` / `contracts` `v0.8.0` in the Makefile, CI,
  README, AGENTS and the source pin assertion.
- Keep `createAppearance({ configDir: "ags-icme" })`, `appearance.apply()` in
  `main()`, `createAppearanceRefreshHandler(appearance, work)`, the layout
  tokens and `style.css` unchanged. The adapter now reads
  `current/manifest.json` and `current/appearance/ags-icme.css`; the app needs
  no new command or handler registration.
- Keep the editor work pending-preserving and deferred while a save is in
  progress. The v3 work result union has no `busy` status: an in-flight show
  refresh reports `{ status: "deferred", reason: ... }` instead of the v2
  `{ status: "busy" }`, so the handler still answers with a valid v3 response.
- Update the source tests that asserted the v2 `palette-refresh` protocol
  (`{ ok: true }` / `busy`) to the v3 generation-bound
  `appearance-refresh <genHash>` handler. The frozen `templates/ags-app/`
  scaffold is not part of this app's runtime and stays untouched.
- Gates run locally with `AGS_PLATFORM_DEV` / `CONTRACTS_ROOT` overrides.

## Acceptance

- [x] `Makefile`, `.github/workflows/ci.yml`, README and AGENTS pin
      `ags-platform` `v1.0.0` / `contracts` `v0.8.0`.
- [x] `app.tsx` still builds one module-level
      `createAppearance({ configDir: "ags-icme" })`, applies it once in
      `main()` and registers exactly one
      `createAppearanceRefreshHandler(appearance, work)`; no new command,
      handler or direct theme/skin apply is added.
- [x] The editor refresh returns the v3 work union: deferred during a save,
      deferred (not `busy`) while a show refresh is in flight, fingerprint-
      idempotent, and never clears staging maps, selection or loaded inputs.
- [x] `layout.ags-icme.root-width` / `root-height` and `style.css` are
      unchanged.
- [x] Root source tests assert the `v1.0.0` / `v0.8.0` pins and the v3
      `appearance-refresh` handler/work result; no root test asserts the v2
      `palette-refresh` `{ ok: true }` or `busy` protocol.
- [x] `make gates` passes on the ticket branch with local overrides, and the
      evidence is recorded in this ticket.
- [x] The branch merges fast-forward to `main`; annotated tag `v0.5.0` is
      created after the gates; `main` and the tag are pushed.

## Evidence

Implementation commit `238f127` on
`ticket/REQ-007-generations-v3`; ticket opened in `eb28873` on base `0b18b7f`
(main, `v0.4.1`).

- Pins: `Makefile:10-11` sets `AGS_PLATFORM_VERSION := v1.0.0` and
  `CONTRACTS_VERSION := v0.8.0`; `.github/workflows/ci.yml:11,38-50` checks out
  the same refs. README and AGENTS carry the same tuple.
- `app.tsx:18` is still the one module-level
  `const appearance = createAppearance({ configDir: "ags-icme" })`;
  `app.tsx:51` still calls `appearance.apply()`; `app.tsx:43` still registers
  exactly one `createAppearanceRefreshHandler(appearance, async () => ...)`.
  The app.tsx diff is comments only; no command, handler or apply changed.
- `ui/EditorWindow.tsx:7,78-81` imports and returns the platform v3
  `AppearanceRefreshWorkResult`; `:214-228` keeps the save defer
  (`{ status: "deferred", reason: "a save is in progress" }`), defers an
  in-flight show refresh with a reason (no v3-invalid `busy`), keeps the
  fingerprint no-op, and only swaps the show via `refreshShow()`.
- Source gates: `tests/app-contract.test.mjs:237-240` asserts the `v1.0.0` /
  `v0.8.0` pins; `:319-351` asserts the v3 handler/work result and rejects
  `status: "busy"`; `tests/event-contract-drift.mjs:259` names the v3 handler.
  No root test asserts the v2 `{ ok: true }` or `busy` protocol.
- Unchanged surfaces: `git diff --quiet eb28873..HEAD -- style.css` and
  `git diff --quiet eb28873..HEAD -- lib templates` both exit 0. The layout
  tokens remain at `ui/EditorWindow.tsx:89-90` and feed
  `default_width` / `default_height` at `:623-624`.
- `make gates` with
  `AGS_PLATFORM_DEV=/home/inumaki/Development/dotfiles/ags-platform` and
  `CONTRACTS_ROOT=/home/inumaki/Development/dotfiles/contracts` exited 0 (log
  `/tmp/opencode/icme-req007/gates-final.log`): all seven pure suites green
  (contract, svg, model, diff, templates, icme-saved-smoke, palette),
  conformance 16/16, drift `all checks passed`, bundle
  `build/ags-icme.js` 1181024 bytes, typecheck 0 in-tree errors (28 tolerated
  `/usr/share/ags/js`, 0 platform).
- Local checkouts used by the gates:
  `ags-platform` `git describe --tags --exact-match` → `v1.0.0`; `contracts` →
  `v0.8.0`.
- Release: the next minor after `v0.4.1`, annotated tag `v0.5.0`, is created
  on the merged closeout commit after the gates; `main` and the tag are pushed.

Verify:

```sh
rg -n 'v1\.0\.0|v0\.8\.0' Makefile .github/workflows/ci.yml tests/app-contract.test.mjs
rg -n 'createAppearance|createAppearanceRefreshHandler|appearance\.apply' app.tsx
rg -n 'AppearanceRefreshWorkResult|a show refresh is in progress' ui/EditorWindow.tsx
AGS_PLATFORM_DEV=/home/inumaki/Development/dotfiles/ags-platform \
  CONTRACTS_ROOT=/home/inumaki/Development/dotfiles/contracts make gates
git show v0.5.0 --stat
```

## Commits

| Commit | Subject |
| --- | --- |
| `eb28873` | `docs(tickets): open REQ-007 generations v3` |
| `238f127` | `feat(REQ-007): consume generations v3 appearance plane` |
| this closeout commit | `docs(REQ-007): record generations v3 evidence and close ticket` |

## Deviations / notes

- The v3 work result union has no `busy` status. The save defer is unchanged,
  but the editor's own in-flight show-refresh guard now returns
  `{ status: "deferred", reason: "a show refresh is in progress" }`; the
  platform handler still answers `deferred:"busy"` for its own overlapping
  requests. No editor state or surface changed.
- `templates/ags-app/` is the frozen copyable scaffold (README "keep the
  template frozen per release", AD-33), not this app's runtime. It still
  carries its v1 `palette-refresh` example; the app's root source tests are the
  ones updated to v3.
- The first local `make gates` run fetched TypeScript into the fresh worktree,
  pruning the `ags-platform` link created by the earlier `platform-dev` step;
  the rerun with the toolchain installed (`gates-final.log`) passed. No source
  or gate definition changed.
- Worktree-local `@girs/`, `env.d.ts`, `node_modules/` and `build/` output are
  gitignored and not committed.
- No live GUI session was run; the source conformance gate, bundle and
  typecheck pin the v3 handler/work wiring.

## Status

Complete on `ticket/REQ-007-generations-v3`; worktree `.worktrees/REQ-007/`,
base `0b18b7f` (main, `v0.4.1`). The branch is fast-forward merged to `main`,
annotated tag `v0.5.0` is created on the merged closeout commit after the
gates, and `main` plus the tag are pushed. Existing tags are not moved.
