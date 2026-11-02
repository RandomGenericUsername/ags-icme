---
id: BUG-001
title: "ICME window identity mismatch and stale palette UI"
kind: bug
status: done
lane: 3
links:
  openspec: none
  bmad: none
worktree: .worktrees/BUG-001/
branch: ticket/BUG-001-window-identity-stale-palette
severity: high
repro: "icon-color-mapping-editor; icon-color-mapping-editor; tail -n 20 ~/.local/state/ags/icon-color-mapping-editor.log"
observed: "The second launcher invocation logs `no window registered with name \"icon-color-mapping-editor-window\"`; the editor window is registered as `icme-window`."
expected: "Both invocations toggle the one registered window, with no `no window registered` line in the log."
---

# ICME: window identity mismatch + stale palette UI

**Unblocked 2026-11-01.** The architecture prerequisite landed: ags-platform
v0.4.0 (REQ-013 Phase A) exposes the `palette.v1` role provider and its change
subscription. This ticket is the consumer migration; the semantic chrome/token
migration is split into companion REQ-003.

## Evidence

- `ags-icme/ui/EditorWindow.tsx:575` named the window `icme-window` and
  `EditorWindow.tsx:416` looked it up as `icme-window`. Launcher logs showed
  `no window registered with name "icon-color-mapping-editor-window"`
  (`~/.local/state/ags/icon-color-mapping-editor.log`, 2026-10-30 09:45).
- The provisioned launcher probes `${INSTANCE}-window` first
  (`dotfiles-provision/ansible/roles/ags_apps_units/templates/ags-app-launcher.j2`),
  so the manifest-instance convention is `<instance>-window`; the `icme-window`
  spelling was the outlier.
- The editor read `~/.local/state/dotfiles/current/colors.yaml` through
  `lib/inputs.ts` and refreshed only on a hand-rolled path/mtime fingerprint,
  so its token picker and preview went stale independently of the platform
  Theme provider that already repaints the chrome.
- `appearance-ledger.json` records `icon-color-mapping-editor` as `applied`,
  while the user observes unchanged colors across wallpaper changes.
- Not palette similarity: tpr palettes are distinct (`#b9c3ff` vs `#ffb59a`
  primaries; current palette `f39c2add…`), and the emitted
  `colors.gtk.css` defines `color_foreground`/`color_00..15`.
- Process observed running while the palette advanced; the app applies
  `~/.config/ags/colors.css` at startup and exposes a palette-refresh handler,
  so the stale UI is a lifecycle/refresh defect, not a producer defect.

## Requirement

- One window name everywhere: `icon-color-mapping-editor-window`
  (`<instance>-window`) in the source, CSS, docs and conformance gate; the
  provisioned launcher already probes this spelling first.
- Palette updates are driven by the ags-platform v0.4.0 provider
  (`theme.palette()` for the role/hex map and `theme.subscribe()` for change
  notification), not a local `colors.yaml` read or a path/mtime fingerprint.
- No direct `colors.yaml` reads remain in ICME; it consumes the provider.
- The editor's token list is the `palette.v1` role list (50 Material roles +
  `on_backdrop`), never legacy `colorN`.
- `itr mapping` shell-outs and the YAML write path remain; previews resolve
  against the provider's roles/hex.

## Acceptance

- [x] Window identity matches across launcher, manifest, and source; toggle
      focuses the existing window twice in a row.
- [x] Changing palette (the two cached palettes) with ICME open updates its
      chrome and token list without restart.
- [x] Live verification recorded for both palettes (dark and light-ish cache
      entries), without changing the user's wallpaper.

## Fix / evidence

Implementation commit `1669900` on
`ticket/BUG-001-window-identity-stale-palette` (worktree `.worktrees/BUG-001/`).

- **Window name decision:** `icon-color-mapping-editor-window`
  (`<instance>-window`). `ui/EditorWindow.tsx` now exports one `WINDOW_NAME`,
  uses it for `name={WINDOW_NAME}` and `app.get_window(WINDOW_NAME)`, and
  `style.css` selects `window#icon-color-mapping-editor-window`.
  **No cross-repo launcher change is required**: the provisioned launcher
  already probes `"${INSTANCE}-window"` first. Its comment still calls
  `icme-window` the icon editor's window
  (`dotfiles-provision/ansible/roles/ags_apps_units/templates/ags-app-launcher.j2`);
  that comment should be updated in its own repo when convenient. The installed
  launcher in this session has the same already-working probe.
- **Provider migration:** `ui/EditorWindow.tsx` uses `theme.palette().roles` and
  `theme.subscribe()`; `lib/inputs.ts` no longer resolves or fingerprints a
  palette path; `lib/itr.ts` no longer passes `--color-scheme`. The role map is
  passed to Preview / TokenPicker / SelectionPanel / TemplatesTab, so previews
  and pickers resolve through the provider. `lib/palette.ts` owns the role list,
  fingerprint and token resolution.
- **Live toggle:** isolated branch instance (temp `XDG_*`, palette A). Two
  consecutive `ags toggle icon-color-mapping-editor-window -i
  icon-color-mapping-editor` calls succeeded; the log has **zero**
  `no window registered` lines (only the pre-existing AT-SPI Gtk-CRITICAL).
- **Live palette propagation:** the temp `current/colors.yaml` symlink was
  repointed from cached palette A (`primary #b9c3ff`, `surface #121318`) to
  cached palette B (`primary #fcb974`, `surface #19120c`) with the window open.
  Chrome and token hexes repainted with no restart; `ags request
  palette-refresh verification -i icon-color-mapping-editor` answered
  `{"ok":true}`.
- Screenshots: `/tmp/opencode/icme-verify/before.png` (main/legacy chrome +
  `colorN` grid), `/tmp/opencode/icme-verify/after-A.png` (roles, palette A),
  `/tmp/opencode/icme-verify/after-B.png` (same instance after repoint, palette
  B). The user's wallpaper and `~/.local/state/dotfiles/current/colors.yaml`
  were not changed (both instances used a temp state tree; the live link still
  points at `c4fa1eb…`).
- Regression gate: `tests/app-contract.test.mjs` asserts the
  `<instance>-window` name, `theme.palette()` + `theme.subscribe()`, no direct
  palette artifact read, and zero legacy `@color_*` in the stylesheet.
- Gates: `make gates` exit 0 (`/tmp/opencode/icme-verify/gates.log`):
  six pure suites + palette 10/10, conformance 13/13, drift 46/46, bundle
  965852 bytes, typecheck 0 in-tree errors.

## Evidence / Verify

- Verify: `icme` toggle twice; tail
  `~/.local/state/ags/icon-color-mapping-editor.log`; compare token colors
  before/after a palette repoint (symlink swap over the cached palette entries
  in an isolated instance).
- Regression gate: `tests/app-contract.test.mjs` asserts the
  `<instance>-window` name and the provider-only source invariants.
