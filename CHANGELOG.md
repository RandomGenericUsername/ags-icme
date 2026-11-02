# Changelog

## Unreleased — BUG-001 / REQ-003

- Standardize the window name on the manifest-instance convention:
  `icon-color-mapping-editor-window` (registered, looked up in `app.get_window`
  and selected in `style.css`). The provisioned launcher already probes this
  spelling first, so toggling works without a cross-repo launcher change.
- Consume the ags-platform v0.4.0 Theme provider: `theme.palette()` supplies
  the `palette.v1` role/hex map and `theme.subscribe()` drives live updates.
  All direct `colors.yaml` reads and the app-local path/mtime fingerprint are
  gone. `itr mapping` shell-outs and the YAML write path are unchanged.
- The token picker and vocabulary mini picker list the 51 `palette.v1` roles
  (50 Material roles + `on_backdrop`), never legacy `colorN`; previews resolve
  through the provider's roles.
- Migrate the chrome stylesheet from legacy `@color_*` tokens to roles:
  ink `@on_surface`, panels `@surface*`, actions `@primary`/`@on_primary`,
  attention `@tertiary`, muted `@on_surface_variant`, errors `@error`. Alpha,
  geometry and selectors are unchanged.

## v0.1.0 — 2026-10-27

- Extract the icon color mapping editor from `ags-apps` v0.5.0 into the
  standalone `ags-icme` repo (repo root is the app package).
- Keep the identity tuple: app `icme`, instance `icon-color-mapping-editor`,
  config dir `ags-icme`, window `icme-window`, launcher
  `icon-color-mapping-editor`, keybind “Open icon color mapping editor”.
  Mode is `live` with `holdsUnsavedState: true`.
- Carry the real v0.5.0 pending-preserving `palette-refresh` handler:
  `createPaletteRefreshHandler` + `refreshEditorPalette()`, deferred during a
  save, busy during an in-flight refresh, fingerprint-idempotent, staging maps
  and selection preserved, Theme pointer applied only on convergence.
- Add the standalone dev flow (`AGENTS.md`, tickets, worktree guard, Makefile,
  CI, tests, `templates/ags-app/`) and the manifest/handler/template
  conformance gate.
- Copy the v0.5.0 app tests (substitution contract, SVG, model, diff,
  templates, `icme.saved` smoke) and the event-contract drift gate.
- Pin the local-only v0.3.0 `ags-platform`/`contracts` tuple via `.dev/`.
