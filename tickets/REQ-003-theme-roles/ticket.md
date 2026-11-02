---
id: REQ-003
title: "Migrate ICME chrome and token list to palette.v1 roles"
kind: requirement
status: in-progress
lane: 3
links:
  openspec: none
  bmad: none
worktree: .worktrees/BUG-001/
branch: ticket/BUG-001-window-identity-stale-palette
---

# Migrate ICME chrome and token list to palette.v1 roles

## Requirement

The icon color mapping editor authors the desktop palette, so its own chrome
and pickers must be role-native. This is the Phase B consumer migration enabled
by ags-platform v0.4.0 (REQ-013 Phase A), companion to BUG-001.

Two layers:

1. **Chrome CSS** — every legacy `@color_*` reference in `style.css` becomes a
   `palette.v1` role reference, preserving alpha, geometry and selectors.
2. **Token model** — the token picker, the vocabulary-default mini picker and
   the previews use the platform provider's role/hex map
   (`theme.palette().roles`), and the offered tokens are exactly
   `PALETTE_V1_ROLES` (50 Material roles + `on_backdrop`). Legacy `colorN`
   tokens are never offered.

The `itr mapping` shell-outs and the YAML write path are unchanged. The runtime
`palette-refresh` request stays the trigger; pending edits, selection and
loaded inputs survive a refresh.

## Acceptance

- [ ] `rg -n '@color_' . --glob '*.css' --glob '*.ts' --glob '*.tsx' --glob '!node_modules' --glob '!build'` returns zero.
- [ ] Chrome roles by intent: ink `@on_surface`; panels `@surface` /
      `@surface_container*`; accent/actions `@primary` / `@on_primary`;
      attention `@tertiary`; muted `@on_surface_variant`; errors `@error*`.
      Alpha, geometry and selectors keep their existing shape.
- [ ] `rg -n 'current/colors.yaml|colors\.yaml'` finds no direct read in app
      source; only provider calls remain. Any fixture is justified explicitly.
- [ ] Token picker and mini picker iterate `PALETTE_V1_ROLES`, not `colorN`.
- [ ] Previews resolve mappings through the provider's role/hex map.
- [ ] Platform pin is `v0.4.0`; contracts stays `v0.3.0`.
- [ ] `make gates` passes; screenshots of chrome + token picker before/after are
      recorded (isolated instance; the live ICME is not disturbed).

## Evidence

- Implementation commit on `ticket/BUG-001-window-identity-stale-palette`.
