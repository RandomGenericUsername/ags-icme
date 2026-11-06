---
id: REQ-004
title: "Consume the ags-platform skin plane"
kind: requirement
status: done
lane: 3
links:
  openspec: none
  bmad: none
worktree: .worktrees/REQ-004/
branch: ticket/REQ-004-skin-consumption
---

# Consume the ags-platform skin plane

## Requirement

Platform v0.8.0 exports `createAppSkin({ configDir })`; the runtime emits
`$XDG_CONFIG_HOME/<configDir>/skin.css` and a shared grouped `skin.json` under
contracts v0.6.0. ICME must consume its app-scoped skin: one module-level
instance with `configDir: "ags-icme"`, applied immediately after the Theme
pointer in `main()`. `style.css` stays the bundled glass fallback. Reload is
the adapter's `skin.css` monitor; no skin-refresh request is added, and the
existing pending-preserving `palette-refresh` handler is unchanged. No
structure, class, gesture, size or behavior changes. Layout tokens are
TSX-owned; none apply to this app in v1.

The runtime skin template for this config dir is
`dotfiles-assets/skins/templates/ags-icme.gtk.css.j2`; this ticket only wires
the consumer side.

## Acceptance

- [x] `app.tsx` has module-level
      `const skin = createAppSkin({ configDir: "ags-icme" })`.
- [x] `main()` calls `theme.apply()` and then `skin.apply()`, in that order.
- [x] The only request handler is the existing
      `createPaletteRefreshHandler`; no skin-refresh request is registered.
- [x] `style.css` remains the bundled glass fallback; selectors, classes,
      gestures, sizes and behavior are unchanged.
- [x] `Makefile` pins platform `v0.8.0` and contracts `v0.6.0`; gates run with
      `AGS_PLATFORM_DEV` / `CONTRACTS_ROOT` overrides.
- [x] A source-level test asserts the theme-then-skin order, `configDir`
      `ags-icme`, one request handler only, and the presence of `style.css`.
- [x] `make gates` passes.
- [x] The next-minor annotated tag is created after a fast-forward merge;
      nothing is pushed.

## Evidence

Implementation commit `e5b1d77` on
`ticket/REQ-004-skin-consumption` (worktree `.worktrees/REQ-004/`); ticket
opened in `261119d`.

- `app.tsx:8` imports `createAppSkin`; `app.tsx:15` builds the one module-level
  instance with `configDir: "ags-icme"`; `main()` applies the Theme pointer at
  `app.tsx:44` and the Skin at `app.tsx:45`, immediately after.
- The only request handler remains `createPaletteRefreshHandler`
  (`app.tsx:38-42`). No skin-refresh request or string exists; skin reload is
  the platform v0.8.0 adapter's `skin.css` monitor.
- `style.css` is unmodified (`git diff --stat 24a453c..HEAD -- style.css` is
  empty) and still the `css: style` fallback (`app.tsx:32`).
- `Makefile:8-9` pins platform `v0.8.0` and contracts `v0.6.0`. CI, README,
  AGENTS and the changelog carry the same tuple.
- Source gate: `tests/app-contract.test.mjs` adds "app.tsx applies the theme
  then the ags-icme skin" and "skin consumption adds no request handler and
  keeps the bundled fallback"; the existing pending-preserving handler
  invariants stay green.
- `make gates` with
  `AGS_PLATFORM_DEV=/home/inumaki/Development/dotfiles/ags-platform`
  `CONTRACTS_ROOT=/home/inumaki/Development/dotfiles/contracts` exited 0 (log
  `/tmp/opencode/icme-verify/gates-req004.log`): 176 `ok` checks across the six
  pure suites plus drift, conformance 15/15, bundle `build/ags-icme.js`
  1084480 bytes, typecheck 0 in-tree errors (28 tolerated `/usr/share/ags/js`,
  0 platform).
- Release: next-minor annotated tag `v0.3.0` on the merged closeout commit;
  nothing is pushed. No GUI/live-session smoke was run.
- Deviation: beyond the Makefile pin the ticket required, CI/README/AGENTS and
  the changelog were refreshed to the same tuple so no stale
  `v0.4.0`/`v0.3.0` claim remains; the pre-existing `Unreleased` changelog
  heading for the already-tagged v0.2.0 was corrected to `v0.2.0`.

Verify:

```sh
AGS_PLATFORM_DEV=/home/inumaki/Development/dotfiles/ags-platform \
  CONTRACTS_ROOT=/home/inumaki/Development/dotfiles/contracts make gates
git show v0.3.0 --stat
```
