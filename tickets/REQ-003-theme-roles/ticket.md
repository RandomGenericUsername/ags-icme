---
id: REQ-003
title: "Migrate ICME chrome and token list to palette.v1 roles"
kind: requirement
status: done
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

- [x] `rg -n '@color_' . --glob '*.css' --glob '*.ts' --glob '*.tsx' --glob '!node_modules' --glob '!build'` returns zero.
- [x] Chrome roles by intent: ink `@on_surface`; panels `@surface` /
      `@surface_container*`; accent/actions `@primary` / `@on_primary`;
      attention `@tertiary`; muted `@on_surface_variant`; errors `@error*`.
      Alpha, geometry and selectors keep their existing shape.
- [x] `rg -n 'current/colors.yaml|colors\.yaml'` finds no direct read in app
      source; only provider calls remain. Any fixture is justified explicitly.
- [x] Token picker and mini picker iterate `PALETTE_V1_ROLES`, not `colorN`.
- [x] Previews resolve mappings through the provider's role/hex map.
- [x] Platform pin is `v0.4.0`; contracts stays `v0.3.0`.
- [x] `make gates` passes; screenshots of chrome + token picker before/after are
      recorded (isolated instance; the live ICME is not disturbed).

## Evidence

Implementation commit `1669900` on
`ticket/BUG-001-window-identity-stale-palette`; detailed live evidence is on
BUG-001.

- `rg -n '@color_' . --glob '*.css' --glob '*.ts' --glob '*.tsx'
  --glob '!node_modules' --glob '!build'` → **0 matches**. The frozen
  `templates/ags-app/style.css` was migrated too (`@on_surface`), so the gate
  covers the next app as well.
- `rg -n 'current/colors.yaml|colors\.yaml' . --glob '!node_modules'
  --glob '!build' --glob '!.git'` → only prose in `README.md`, `AGENTS.md`,
  `CHANGELOG.md` and the two tickets; **no app source match**. The test that
  asserts absence is itself the only other mention.
- Role mapping: `@color_foreground → @on_surface`, `@color_00 → @surface`,
  `@color_01 → @surface_container`, `@color_03/@color_04 → @tertiary`,
  `@color_06/@color_10 → @primary`, `@color_07 → @surface_container_high`,
  `@color_08 → @error`, `@color_background → @on_primary`,
  `@color_15 → @on_surface_variant`. Alpha/geometry/selectors unchanged.
- Token model: `lib/palette.ts` re-exports `PALETTE_V1_ROLES` as `ROLE_TOKENS`;
  `TokenPicker` renders the 51 roles, `SelectionPanel`'s mini grid filters the
  same list, and `TemplatesTab` uses it too. `tests/palette.mjs` pins 51 roles,
  `on_backdrop`, no `colorN`, and role/hex resolution.
- Previews: `Preview` takes the provider role map instead of
  `MappingShow.palette`; the current-token label resolves via
  `resolveTokenHex(token, palette())`.
- Pin: `Makefile`/CI `AGS_PLATFORM_VERSION := v0.4.0`, contracts `v0.3.0`.
- `make gates` exit 0 (log `/tmp/opencode/icme-verify/gates.log`): test suites
  all green including `palette cases agree`, conformance 13/13, drift 46/46,
  bundle 965852 bytes, typecheck 0 in-tree errors.
- Screenshots: `/tmp/opencode/icme-verify/before.png`,
  `/tmp/opencode/icme-verify/after-A.png`,
  `/tmp/opencode/icme-verify/after-B.png`.
