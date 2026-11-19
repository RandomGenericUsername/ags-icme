---
id: REQ-008
title: "Replace manual ICME path pickers with an installed/repo edit-target dropdown"
kind: requirement
status: done
lane: 3
links:
  openspec: none
  bmad: none
worktree: .worktrees/REQ-008/
branch: ticket/REQ-008-edit-targets
---

# Replace manual ICME path pickers with an installed/repo edit-target dropdown

## Requirement

The editor must resolve its own two input targets instead of asking the
operator to type paths:

- `installed` — the seeded spine under the user data dir:
  `<spineHome>/icon-templates` and `<spineHome>/icon-mappings/icons.yaml`.
- `repo` — a `dotfiles-assets` checkout (`<root>/icons/templates`,
  `<root>/icons/mappings/icons.yaml`) or the legacy dotfiles-v3 composition
  root (`<root>/dotfiles/assets/icon-templates`,
  `<root>/dotfiles/config/icon-template-color-scheme-mappings/icons.yaml`).

The Inputs panel offers only a target dropdown (no manual path entry) and
shows the resolved paths as read-only labels. Repo detection is first valid
win over: `DOTFILES_DEV_INPUTS_ROOT`, `ICME_REPO_ROOT`, a cwd ancestor walk,
the sibling `<cwd parent>/dotfiles-assets`, then the legacy sibling
`<cwd parent>/dotfiles-v3`. A fresh session defaults to `repo` when a checkout
is detected, otherwise `installed`.

The existing switching behavior is preserved: choosing another target discards
the loaded show (and therefore any pending edits), and the dropdown is locked
while any pending edit exists. There is no live apply or copy action between
targets; a repo target is only written by saving/committing/deploying.

Scope: no tag, release or merge in this ticket. Changes stay on the feature
branch until the operator approves shipping.

## Acceptance

- [x] `lib/targets.ts` is a pure module exporting `installedPaths`,
      `repoPaths`, `legacyRepoPaths` and `preferredTarget` over the two
      documented directory layouts, with single-slash joining.
- [x] `lib/inputs.ts` detects the repo target in the documented order
      (`DOTFILES_DEV_INPUTS_ROOT`, `ICME_REPO_ROOT`, cwd ancestor,
      `dotfiles-assets` sibling, legacy `dotfiles-v3` sibling) and exposes
      `resolveTargets()` / `resolveInputs()` with `defaultTarget` set to
      `repo` when detected, else `installed`.
- [x] `ui/InputsPanel.tsx` renders a single edit-target dropdown (repo option
      only when a checkout is detected) and read-only resolved path rows; it
      has no manual path entry widget.
- [x] Switching targets in `ui/EditorWindow.tsx` reloads inputs for the chosen
      target and discards pending edits; the dropdown is insensitive while
      `pendingCount() > 0`. No live apply/copy action is added.
- [x] `style.css` styles the target dropdown and read-only path labels
      consistently with the existing input rows.
- [x] `tests/targets.mjs` covers both layouts, trailing-slash joining, the
      legacy layout and the installed/repo default; `make test` includes it.
- [x] `make test` passes with the `targets` suite registered.

## Evidence

Independent review pass from `.worktrees/REQ-008/` on 2026-11-12. All commands
were executed from scratch in this worktree; nothing was committed.

- `make test` — **exit 0**. All suites agree; `tests/targets.mjs` is registered
  via `TEST_SUITES` and reports 7 passing cases (`installed paths`, `repo
  paths`, trailing slash, no doubled slash, legacy layout, installed default,
  repo default) ending `target cases agree`.
- `make conformance CONTRACTS_ROOT=/home/inumaki/Development/dotfiles/contracts`
  — **exit 0**, 16/16 tests pass, including `the manifest agrees with app.tsx,
  the window and the stylesheet`, the platform template gate and the appearance
  refresh invariants. The manifest/window/styles test now asserts the
  dropdown/read-only Inputs panel (`Gtk.DropDown` present; no
  `Gtk.FileChooser`/`choosePath`/`onDialogOpenChange`).
- `make drift CONTRACTS_ROOT=/home/inumaki/Development/dotfiles/contracts` —
  **exit 0**, `all checks passed` (shared client, vendored binding, `icme.saved`
  payload and publisher, palette provider).
- `make bundle` — **exit 0**, `OK: build/ags-icme.js (1193496 bytes)`.
- Typecheck without installing/regenerating: copied `@girs/` and `env.d.ts`
  from the main checkout, symlinked `node_modules/ags` ->
  `/usr/share/ags/js` and `node_modules/gnim` ->
  `/usr/share/ags/js/node_modules/gnim`, then ran
  `/home/inumaki/Development/dotfiles/ags-icme/node_modules/.bin/tsc --noEmit
  -p tsconfig.app.json`. Raw tsc exit 2 with 28 errors, **all** under
  `/usr/share/ags/js/`. Applying the Makefile filter: `ours (app.tsx|lib/|ui/|
  env.d.ts)=0`, `other=0`, `ags-platform=0` — effective **pass, 0 errors in
  the ags-icme tree**. Temporary `@girs/`, `env.d.ts` and symlinks removed
  afterward.
- `git status --short` after the typecheck setup/teardown is byte-identical to
  before it; the diff touches only `Makefile` (TEST_SUITES line), `README.md`,
  `lib/inputs.ts`, `tests/app-contract.test.mjs`, `style.css`,
  `tickets/INDEX.md`, `ui/EditorWindow.tsx`, `ui/InputsPanel.tsx`, plus the
  untracked `lib/targets.ts`, `tests/targets.mjs` and this ticket. No
  `installer.pin`, CHANGELOG, package/version metadata or pin changes.

## Release and deploy evidence

Shipped 2026-11-19.

- `v0.6.0` release commit `056626c` (`docs(REQ-008): release v0.6.0`).
- Annotated tag `v0.6.0` created on that commit and pushed to `origin`;
  `git rev-parse v0.6.0^{}` resolves to `056626cdc908f32198f538a9e635144f792cc3ed`.
  The tag was not moved or recreated.
- Composition pin: dotfiles-v3 REQ-133 (`apps.yaml` and
  `FINAL_APP_RELEASES`) pins ags-icme `v0.6.0`, release commit `ad07f1ea`.
- Provision/apply installed `v0.6.0` into the spine:
  `~/.local/share/dotfiles/apps/icme/pinned` contains `v0.6.0`, and the
  spine links resolve to `apps/icme/v0.6.0`.
- `dotfiles-provision verify --expected-engine-tag v0.1.95` — **exit 0**:
  `ok=343 changed=2 unreachable=0 failed=0 skipped=46`.
- `dotfiles-runtime doctor` — **exit 0**: desktop clean (28 items), watch
  health ok, palette v1 conforming, supervision ok.
- The editor is running live; `ags list` includes
  `icon-color-mapping-editor`.
- Note on the deploy run: apply's own final summary was not captured because
  the 900s harness cutoff ended the run while it was already in the trailing
  verify role. No final summary was printed by apply; the standalone verify
  above is the authoritative check and passed.

## Status

Done. Released as `v0.6.0` on `main` and deployed through composition
REQ-133 (dotfiles-v3 `v0.2.6`).
