---
id: REQ-006
title: "Restore the pre-v2 window default size fallback"
kind: requirement
status: in-progress
lane: direct
links:
  openspec: none
  bmad: none
worktree: .worktrees/REQ-006/
branch: ticket/REQ-006-layout-default-size
---

# Restore the pre-v2 window default size fallback

## Requirement

v0.4.0 replaced the window default size `1280x800` with the `layout.ags-icme`
tokens and set the source fallbacks to `960x600` (derived from the `style.css`
minimums). That changed behavior when the appearance token is missing. The
assets manifest is being corrected to `1280x800` (`dotfiles-assets` v0.12.2),
so the source fallbacks must match the pre-v2 defaults again:

- `ui/EditorWindow.tsx` keeps reading
  `layout.ags-icme.root-width` / `root-height` through the Appearance
  accessors, but the fallbacks become `1280` and `800`.
- A missing appearance generation therefore keeps today's pre-v2 default size;
  the corrected manifest token yields the same `1280x800`.
- No other behavior, class or structure changes. Platform/contracts pins are
  unchanged (no assets tag is referenced in this repo).

## Acceptance

- [ ] `ui/EditorWindow.tsx` reads `layout.ags-icme.root-width` with fallback
      `1280` and `layout.ags-icme.root-height` with fallback `800`, still fed
      to `default_width` / `default_height` through `.peek()`.
- [ ] No class, structure or other behavior change; `style.css`, `app.tsx`,
      `lib/` and wiring are untouched.
- [ ] The source conformance test asserts the `1280` / `800` fallbacks.
- [ ] Internal pins are unchanged because no assets tag is referenced.
- [ ] `make gates` passes on the ticket branch with local overrides.
- [ ] The branch merges fast-forward to `main`, annotated tag `v0.4.1` is
      created after the gates, and nothing is pushed.
