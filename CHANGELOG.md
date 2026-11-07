# Changelog

## v0.5.0 — 2026-11-07

- Consume Generations v3: `ags-platform` v1.0.0 / `contracts` v0.8.0. The
  app-scoped Appearance consumer now reads only
  `$XDG_STATE_HOME/dotfiles/current/manifest.json` and
  `current/appearance/ags-icme.css`; `createAppearance({ configDir:
  "ags-icme" })` and `appearance.apply()` are unchanged.
- The runtime refresh is the generation-bound
  `appearance-refresh <genHash>` protocol. `createAppearanceRefreshHandler`
  still wraps the editor work and answers exactly one JSON string naming the
  requested generation; the v2 `palette-refresh` `{ ok: true }` ack is gone.
- Preserve the deferred-save behavior. The v3 work union has no `busy` status,
  so an in-flight show refresh now returns `deferred` with a reason instead of
  `busy`. Pending edits, selection, loaded inputs, the layout tokens and
  `style.css` are unchanged.
- Pin the local tuple to `ags-platform` v1.0.0 / `contracts` v0.8.0 and update
  the source gates that asserted the v2 `palette-refresh` protocol.

## v0.4.1 — 2026-11-06

- Restore the `ui/EditorWindow.tsx` default-size fallbacks to the pre-v2
  `1280x800`. The `layout.ags-icme.root-width` / `root-height` tokens are still
  read, and the corrected `dotfiles-assets` v0.12.2 manifest supplies the same
  `1280x800`; a missing appearance generation no longer shrinks the window to
  the `960x600` CSS minimums. No other behavior, class or structure changed.

## v0.4.0 — 2026-11-06

- Consume the ags-platform v0.9.0 unified Appearance plane
  (contracts v0.7.0): one module-level
  `createAppearance({ configDir: "ags-icme" })` is applied in `main()`,
  installing the runtime-composed palette + skin + mode sheet from the single
  `current/appearance` hop. The split `theme.apply()` / `skin.apply()` startup
  pair is gone; `style.css` stays the bundled glass fallback.
- Replace the palette-refresh wrapper with
  `createAppearanceRefreshHandler(appearance, work)`. The platform re-applies
  the whole appearance first and the app work preserves the editor's
  `deferred`/`busy`/`applied` result, pending edits, selection and loaded
  inputs. No new request command is added.
- Read the window size from the TSX-owned layout tokens
  `layout.ags-icme.root-width` (960) / `root-height` (600) instead of literals.
- Pin the local tuple to `ags-platform` v0.9.0 / `contracts` v0.7.0.

## v0.3.0 — 2026-11-05

- Consume the ags-platform v0.8.0 app-scoped Skin plane:
  `createAppSkin({ configDir: "ags-icme" })` is applied immediately after
  `theme.apply()` in `main()`, reading
  `$XDG_CONFIG_HOME/ags-icme/skin.css` composed over the shared palette and
  token map. `style.css` stays the bundled glass fallback; the adapter monitor
  reloads the skin, so the existing pending-preserving `palette-refresh`
  handler and all structure/behavior are unchanged.
- Pin the local tuple to `ags-platform` v0.8.0 / `contracts` v0.6.0.

## v0.2.0 — 2026-11-01

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
