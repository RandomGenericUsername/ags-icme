---
id: BUG-001
title: "ICME window identity mismatch and stale palette UI"
kind: bug
status: blocked
lane: 3
links:
  openspec: none
  bmad: none
worktree: none
branch: none
severity: high
---

# ICME: window identity mismatch + stale palette UI

**Status: blocked by design decision (2026-10-30).** No hotfix, no workaround.
ICME is not the priority: the priority is a sound vocabulary/provider
architecture (dotfiles-runtime REQ-006/REQ-007, ags-platform REQ-013). This
ticket is fixed as part of the consumer migration, not before it.

## Evidence

- `ags-icme/ui/EditorWindow.tsx:575` names the window `icme-window`;
  `EditorWindow.tsx:416` looks it up as `icme-window`. Launcher logs show
  `no window registered with name "icon-color-mapping-editor-window"`
  (`~/.local/state/ags/icon-color-mapping-editor.log`, 2026-10-30 09:45).
- `appearance-ledger.json` records `icon-color-mapping-editor` as `applied`,
  while the user observes unchanged colors across wallpaper changes.
- Not palette similarity: tpr palettes are distinct (`#b9c3ff` vs `#ffb59a`
  primaries; current palette `f39c2add…`), and the emitted
  `colors.gtk.css` defines `color_foreground`/`color_00..15`.
- Process observed running while the palette advanced; the app applies
  `~/.config/ags/colors.css` at startup and exposes a palette-refresh handler,
  so the stale UI is a lifecycle/refresh defect, not a producer defect.

## Requirement (when unblocked)

- One window name everywhere (launcher/toggle/manifest instance agree).
- Palette updates are driven by the ags-platform provider subscription
  (REQ-013), not a local handler; the editor token list re-reads the palette.
- No direct `colors.yaml` reads remain in ICME; it consumes the provider.

## Acceptance

- [ ] Window identity matches across launcher, manifest, and source; toggle
      focuses the existing window.
- [ ] Changing wallpaper with ICME open updates its chrome and token list
      without restart.
- [ ] Live verification recorded for dark and light wallpapers.

## Evidence / Verify

- Verify: `icme` toggle twice; tail
  `~/.local/state/ags/icon-color-mapping-editor.log`; compare token colors
  before/after `dotfiles-runtime wallpaper set`.
