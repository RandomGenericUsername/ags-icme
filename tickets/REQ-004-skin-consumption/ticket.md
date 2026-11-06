---
id: REQ-004
title: "Consume the ags-platform skin plane"
kind: requirement
status: in-progress
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

- [ ] `app.tsx` has module-level
      `const skin = createAppSkin({ configDir: "ags-icme" })`.
- [ ] `main()` calls `theme.apply()` and then `skin.apply()`, in that order.
- [ ] The only request handler is the existing
      `createPaletteRefreshHandler`; no skin-refresh request is registered.
- [ ] `style.css` remains the bundled glass fallback; selectors, classes,
      gestures, sizes and behavior are unchanged.
- [ ] `Makefile` pins platform `v0.8.0` and contracts `v0.6.0`; gates run with
      `AGS_PLATFORM_DEV` / `CONTRACTS_ROOT` overrides.
- [ ] A source-level test asserts the theme-then-skin order, `configDir`
      `ags-icme`, one request handler only, and the presence of `style.css`.
- [ ] `make gates` passes.
- [ ] The next-minor annotated tag is created after a fast-forward merge;
      nothing is pushed.

## Evidence

Evidence: MISSING — run `make gates` after implementation.
