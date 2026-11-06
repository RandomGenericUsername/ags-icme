---
id: REQ-005
title: "Migrate ICME to the v2 Appearance plane"
kind: requirement
status: in-progress
lane: 3
links:
  openspec: none
  bmad: none
worktree: .worktrees/REQ-005/
branch: ticket/REQ-005-appearance-migration
---

# Migrate ICME to the v2 Appearance plane

## Requirement

Contracts `v0.7.0` / `ags-platform` `v0.9.0` replace the split Theme + Skin
pair with one composed Appearance generation behind the single
`$XDG_STATE_HOME/dotfiles/current/appearance` hop. Migrate ICME without a
redesign:

- `app.tsx` declares one module-level
  `const appearance = createAppearance({ configDir: "ags-icme" })` and
  `main()` calls `appearance.apply()` instead of `theme.apply()` /
  `skin.apply()`.
- The `requestHandler` becomes
  `createAppearanceRefreshHandler(appearance, work)`. The platform helper
  re-applies the whole appearance first; `work` keeps the existing
  pending-preserving `refreshEditorPalette()` result handling, so a save in
  progress still answers `deferred` and an in-flight show refresh still answers
  `busy`. No new request command is added.
- The window size request reads the TSX-owned layout tokens
  `layout.ags-icme.root-width` (fallback `960`) and `layout.ags-icme.root-height`
  (fallback `600`) through the Appearance accessors instead of literals.
- `style.css` remains the bundled glass fallback. Structure, class names,
  gestures, the ITR/template/model logic and mappings are unchanged.
- Local pins move to `ags-platform` `v0.9.0` / `contracts` `v0.7.0`; gates run
  with local checkout overrides.

## Acceptance

- [ ] `app.tsx` imports `createAppearance` and builds one module-level
      `createAppearance({ configDir: "ags-icme" })`; `main()` calls
      `appearance.apply()`.
- [ ] `app.tsx` no longer imports or calls `theme.apply()` or `skin.apply()`.
- [ ] The request handler is
      `createAppearanceRefreshHandler(appearance, work)`; `work` awaits
      `refreshEditorPalette()` and returns its `deferred`/`busy`/`applied`
      result unchanged, with no `theme.apply()` call.
- [ ] Exactly one request handler and the same `palette-refresh` protocol
      remain; no new request command is added.
- [ ] `layout.ags-icme.root-width` / `root-height` drive the window size with
      `960` / `600` fallbacks instead of literals.
- [ ] `style.css` is unchanged and still passed to `app.start({ css })`; no
      structure, class, gesture or behavior change, and no ITR/template/model
      logic or mapping change.
- [ ] `Makefile`, CI and the pin assertion target `ags-platform` `v0.9.0` and
      `contracts` `v0.7.0`; local overrides are recorded.
- [ ] Source tests assert the Appearance apply/configDir/handler, no
      theme/skin calls, the layout tokens and the retained `style.css`
      fallback.
- [ ] `make gates` passes on the ticket branch.
- [ ] The branch merges fast-forward to `main`, the next minor annotated tag is
      created after the gates, and nothing is pushed.

## Evidence

Pending: implementation, gate log, commits and release tag.

## Commits

| Commit | Subject |
| --- | --- |
| this planning commit | `docs(tickets): open REQ-005 appearance migration` |

## Status

In progress on `ticket/REQ-005-appearance-migration`, worktree
`.worktrees/REQ-005/`, base `ce09a46` (main, `v0.3.0`).
