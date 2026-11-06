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

- [x] `app.tsx` imports `createAppearance` and builds one module-level
      `createAppearance({ configDir: "ags-icme" })`; `main()` calls
      `appearance.apply()`.
- [x] `app.tsx` no longer imports or calls `theme.apply()` or `skin.apply()`.
- [x] The request handler is
      `createAppearanceRefreshHandler(appearance, work)`; `work` awaits
      `refreshEditorPalette()` and returns its `deferred`/`busy`/`applied`
      result unchanged, with no `theme.apply()` call.
- [x] Exactly one request handler and the same `palette-refresh` protocol
      remain; no new request command is added.
- [x] `layout.ags-icme.root-width` / `root-height` drive the window size with
      `960` / `600` fallbacks instead of the hard-coded literals.
- [x] `style.css` is unchanged and still passed to `app.start({ css })`; no
      structure, class or gesture change, no ITR/template/model logic or
      mapping change, and no behavior change beyond the requested root-size
      token read.
- [x] `Makefile`, CI and the pin assertion target `ags-platform` `v0.9.0` and
      `contracts` `v0.7.0`; local overrides are recorded.
- [x] Source tests assert the Appearance apply/configDir/handler, no
      theme/skin calls, the layout tokens and the retained `style.css`
      fallback.
- [x] `make gates` passes on the ticket branch.
- [x] The branch merges fast-forward to `main`, the next minor annotated tag is
      created after the gates, and nothing is pushed.

## Evidence

Implementation commit `b103f8b` on
`ticket/REQ-005-appearance-migration`; ticket opened in `3f7d0dd`.

- `app.tsx:8-10` imports the platform Appearance adapter, the v2 refresh
  helper and the editor entry points. `app.tsx:17` is the one module-level
  `const appearance = createAppearance({ configDir: "ags-icme" })`.
- `app.tsx:42-45` registers
  `createAppearanceRefreshHandler(appearance, async () => { const result =
  await refreshEditorPalette(); return result; })`; the returned
  `deferred`/`busy`/`applied` result is unchanged and there is no
  `theme.apply()` or `skin.apply()`.
- `app.tsx:49-52` applies the whole appearance once in `main()` and passes the
  same instance to the one window: `EditorWindow(monitor, appearance)`.
- `ui/EditorWindow.tsx:6` imports the pure `Appearance` type;
  `:84` accepts the instance; `:88-89` reads
  `layout.ags-icme.root-width` (`960`) and `root-height` (`600`);
  `:619-620` feeds them to the window size with `.peek()`.
- Source gates: `tests/app-contract.test.mjs:236-337` asserts the
  v0.9.0/v0.7.0 pins, the `ags-icme` Appearance configDir and `main()` apply,
  the absence of theme/skin applies, the v2 handler, the layout tokens and the
  retained `style.css` fallback. `tests/event-contract-drift.mjs:258-276`
  asserts the v2 handler, the whole-appearance apply, the Appearance import
  and the absence of direct theme/skin application.
- Pins: `Makefile:9-10` sets `AGS_PLATFORM_VERSION := v0.9.0` and
  `CONTRACTS_VERSION := v0.7.0`; `.github/workflows/ci.yml:11,38-50` checks out
  the same refs. README, AGENTS and the changelog carry the same tuple.
- Unchanged surfaces: `git diff --quiet ce09a46..HEAD -- style.css`,
  `-- templates` and `-- lib` all exit 0. `style.css` is still imported at
  `app.tsx:3` and passed as `css: style` at `app.tsx:31`. No ITR, template,
  model or mapping file is in the diff.
- `make gates` with
  `AGS_PLATFORM_DEV=/home/inumaki/Development/dotfiles/ags-platform` and
  `CONTRACTS_ROOT=/home/inumaki/Development/dotfiles/contracts` exited 0 (log
  `/tmp/opencode/icme-req005/gates-final.log`): all six pure suites green
  (contract, svg, model, diff, templates, palette + publisher smoke),
  conformance 16/16, drift `all checks passed`, bundle
  `build/ags-icme.js` 1124708 bytes, typecheck 0 in-tree errors (28 tolerated
  `/usr/share/ags/js`, 0 platform).
- Local checkouts used by the gates: `ags-platform`
  `git describe --tags --exact-match` → `v0.9.0`; `contracts` → `v0.7.0`.
- Release: the next minor after `v0.3.0`, annotated tag `v0.4.0`, is created
  on the merged closeout commit after the gates; nothing is pushed.

Verify:

```sh
rg -n 'createAppearance|createAppearanceRefreshHandler|appearance\.apply|appearance\.value' app.tsx ui/EditorWindow.tsx
AGS_PLATFORM_DEV=/home/inumaki/Development/dotfiles/ags-platform \
  CONTRACTS_ROOT=/home/inumaki/Development/dotfiles/contracts make gates
git show v0.4.0 --stat
```

## Commits

| Commit | Subject |
| --- | --- |
| `3f7d0dd` | `docs(tickets): open REQ-005 appearance migration` |
| `b103f8b` | `feat(REQ-005): migrate ICME to the v2 appearance plane` |
| this closeout commit | `docs(REQ-005): record appearance migration evidence and close ticket` |

## Deviations / notes

- The only visible geometry change is the requested token substitution: the
  window default size now reads the `960x600` `layout.ags-icme` tokens instead
  of the previous `1280x800` literals. No structure, class or gesture changed.
- Worktree-local `@girs/`, `env.d.ts` and `node_modules/` links were used for
  the local typecheck/bundle gates and are gitignored; no fetched platform,
  generated binding or bundle output is committed. The `templates/ags-app/`
  scaffold is untouched.
- README, AGENTS and the changelog were refreshed to the same v0.9.0/v0.7.0
  tuple so no stale v0.8.0/v0.6.0 claim remains outside the historical
  changelog entries and closed tickets.
- No live GUI session was run; the bundle and typecheck gates prove the
  Appearance adapter/accessor wiring resolves, and the source gates pin the
  behavior.

## Status

Complete on `ticket/REQ-005-appearance-migration`; worktree
`.worktrees/REQ-005/`, base `ce09a46` (main, `v0.3.0`). The branch is
fast-forward merged to `main` and tagged `v0.4.0`; existing tags are not moved
and nothing is pushed.
