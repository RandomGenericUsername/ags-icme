---
id: REQ-001
title: "Extract the icon color mapping editor into the standalone ags-icme repo"
kind: requirement
status: done
lane: 3
links:
  openspec: none
  bmad: none
worktree: none
branch: main
---

# Extract the icon color mapping editor into the standalone ags-icme repo

## Requirement

Create `ags-icme` from the `ags-apps` v0.5.0 `icme/` app, with the repo root as
the app package. Carry the real pending-preserving `palette-refresh` handler,
the v0.5.0 app tests and event-contract drift gate, and the standalone dev
flow with the frozen `templates/ags-app/` fixture. This ticket does not
provision, cut over or push.

## Acceptance

- [x] `app.tsx` is at the repo root; there is no app subdirectory.
- [x] Identity is `app=icme`, `instance=icon-color-mapping-editor`,
      `configDir=ags-icme`, `mode=live`, `holdsUnsavedState=true`, window
      `icme-window`, launcher `icon-color-mapping-editor`, keybind
      “Open icon color mapping editor”.
- [x] `app.manifest.json` is the schema-valid identity tuple and agrees with
      `app.tsx`.
- [x] `palette-refresh` is the real v0.5.0 handler: one JSON-string response,
      deferred during a save, busy during an in-flight refresh,
      fingerprint-idempotent, and it never clears pending edits/selection.
- [x] The v0.5.0 app tests and the event-contract drift gate run and pass.
- [x] `AGENTS.md`, `tickets/LIFECYCLE|INDEX|_template`, worktree guard,
      Makefile, CI, README, tests and `templates/ags-app/` are present and the
      platform template-conformance gate passes.
- [x] Local gates pass: `make test`, `make conformance`, `make drift`,
      `make typecheck`, `make bundle`.
- [x] Annotated tag `v0.1.0` is created after the gates pass; nothing is
      pushed.

## Evidence

- Source: `ags-apps` tag `v0.5.0`, `icme/` (`git archive v0.5.0 icme`), copied
  verbatim for `app.tsx`, `lib/`, `ui/`, `style.css` and the app tests.
- `make gates` → exit 0 (warm run):
  - `make test` → 120 checks across the six v0.5.0 suites: contract 8/8,
    svg 31/31, model 13/13, diff 16/16, templates 41/41,
    icme-saved-smoke 11/11;
  - `make conformance` → 11/11 (`tests/app-contract.test.mjs`), including the
    platform `checkAppRepo` template gate and the manifest identity;
  - `make drift` → 46/46 checks, `all checks passed`
    (`tests/event-contract-drift.mjs`), including the vendored binding body
    matching `contracts/generated/contract.ts` byte-for-byte;
  - `make bundle` → `build/ags-icme.js`, 926332 bytes;
  - `make typecheck` → 0 errors in the ags-icme tree (28 tolerated
    `/usr/share/ags/js` errors, 0 platform errors).
- Pending-preserving evidence: `tests/app-contract.test.mjs` executes source
  invariants over the real handler — `deferred` on `saving()`, `busy` on
  `schemeRefreshing`, fingerprint equality returns `applied` without a
  rebuild, `await refreshShow()`, and neither `refreshEditorPaletteNow` nor
  `refreshShow` touches any staging map, `selection`, `inputs` or `load()`.
  `app.tsx` applies the Theme pointer only when `result.status === "applied"`.
- The manifest schema's `allOf` still makes `mode: restart` invalid when
  `holdsUnsavedState` is true; the conformance gate asserts it for this repo.
- No GUI/live-session smoke was run (explicit instruction): this extraction
  proves the stock-runner and local build gates only.
