# Changelog

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
