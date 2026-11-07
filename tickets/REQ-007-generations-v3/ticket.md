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

- [ ] `Makefile`, `.github/workflows/ci.yml`, README and AGENTS pin
      `ags-platform` `v1.0.0` / `contracts` `v0.8.0`.
- [ ] `app.tsx` still builds one module-level
      `createAppearance({ configDir: "ags-icme" })`, applies it once in
      `main()` and registers exactly one
      `createAppearanceRefreshHandler(appearance, work)`; no new command,
      handler or direct theme/skin apply is added.
- [ ] The editor refresh returns the v3 work union: deferred during a save,
      deferred (not `busy`) while a show refresh is in flight, fingerprint-
      idempotent, and never clears staging maps, selection or loaded inputs.
- [ ] `layout.ags-icme.root-width` / `root-height` and `style.css` are
      unchanged.
- [ ] Source tests assert the `v1.0.0` / `v0.8.0` pins and the v3
      `appearance-refresh` handler/work result; no test asserts the v2
      `palette-refresh` `{ ok: true }` or `busy` protocol.
- [ ] `make gates` passes on the ticket branch with local overrides, and the
      evidence is recorded in this ticket.
- [ ] The branch merges fast-forward to `main`; annotated tag `v0.5.0` is
      created after the gates; `main` and the tag are pushed.

## Evidence

Evidence is recorded after the implementation and gate run.

## Commits

| Commit | Subject |
| --- | --- |
| this commit | `docs(tickets): open REQ-007 generations v3` |

## Deviations / notes

Pending implementation.

## Status

In progress on `ticket/REQ-007-generations-v3`; worktree
`.worktrees/REQ-007/`, base `0b18b7f` (main, `v0.4.1`).
