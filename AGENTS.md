# AGENTS.md — ags-icme operating contract

Canonical agent instructions for this repo. Claude (`CLAUDE.md` symlinks here),
OpenCode and every BMAD/OpenSpec skill must follow this.

## 1. Evidence rule (hard requirement)

No suggestion "in the air". Every technical claim, recommendation or design
decision carries testable evidence: a file path + line range, a commit SHA, a
URL + quoted section, or an executed command with its result.

Format: non-trivial claims get `Evidence:` and `Verify:` lines. If evidence
does not exist yet, write `Evidence: MISSING — run <X>` and do not present the
claim as fact. Prefer executed output over recalled text.

## 2. What this repo is

`ags-icme` is the standalone icon color mapping editor (ICME), extracted from
`ags-apps` v0.5.0. The repo root is the app package: `app.tsx` lives at the
root, never in a subdirectory.

Identity is single-valued and enforced by `app.manifest.json`:

```text
app=icme  instance=icon-color-mapping-editor  configDir=ags-icme
mode=live  holdsUnsavedState=true
```

- Window: `icon-color-mapping-editor-window` (`<instance>-window`); launcher:
  `icon-color-mapping-editor`; keybind description: “Open icon color mapping
  editor” (SUPER+I).
- `holdsUnsavedState: true` is load-bearing: a restart would discard staged
  mapping/template edits, so this app must NEVER be declared `mode: restart`.
- No app imports another app. Depend on `ags-platform` (and `contracts` at test
  time only), never on a sibling app repo.
- The runtime is the only palette-refresh trigger. Do not subscribe to
  `wallpaper.state` for palette application and do not invent a palette event.

## 3. Ticket flow

All work starts as a ticket in `tickets/` (`_template/`, vocab + rollup in
`INDEX.md`, flow in `LIFECYCLE.md`). App-local work is ticketed here; cross-app
program work stays in `ags-apps` until archive.

Never work on main: `scripts/worktree-guard.sh check-clean` before starting and
`scripts/worktree-guard.sh create <id> <slug>` to branch + worktree. Record
`worktree=` and `branch=` in the ticket. Keep changes small, verifiable and
committable; never mix planning edits with implementation in one turn.

## 4. Local gates vs stock CI

**Local is authoritative for typecheck.** CI runs only stock-runner jobs
(`ubuntu-latest`): `make test`, `make conformance` and `make drift`. There is
no self-hosted runner and no CI secret dependency.

- `make test` — pure unit tests (the v0.5.0 library suites + publisher smoke).
- `make conformance` — manifest identity, live handler and template gate.
- `make drift` — shared event client + vendored binding against `contracts`.
- `make typecheck` — LOCAL: needs `ags` on PATH plus GIR/Astal; generates
  machine-specific `@girs/` and `env.d.ts` (gitignored).
- `make bundle` — LOCAL: `ags bundle app.tsx build/ags-icme.js`.
- `make gates` — all of the above.

The program tuple is `ags-platform` v0.4.0 / `contracts` / `dotfiles-assets`
v0.3.0, local-only in this run. `.dev/` is gitignored; never commit a fetched platform,
`node_modules/`, `@girs/`, generated `tsconfig.json` or bundle output.

## 5. Release

Releases are immutable annotated tags (`v0.1.0`, …). A published tag is never
moved. Installed tags are read-only; writable state lives under XDG paths, never
inside the tag. Tag only after `make gates` passes, and record the evidence in
the release ticket.

## 6. Palette-refresh invariants

The editor consumes the platform Theme provider (`theme.palette()` for the
`palette.v1` role/hex map and `theme.subscribe()` for change notification); it
never reads `colors.yaml` itself. The runtime `palette-refresh` handler is
registered in `app.tsx` through the platform's
`createPaletteRefreshHandler` and calls `refreshEditorPalette()` from
`ui/EditorWindow.tsx`. It is pending-preserving by construction:

- exactly one JSON-string response per request, through the platform helper;
- `deferred` while a save is in progress, `busy` while a show refresh is in
  flight — never a concurrent rebuild;
- `refreshShow()` swaps the loaded show only; the staging maps (`pending`,
  `vocabPending`, `templatePending`, `newPlaceholders`, `manifestPendings`),
  selection and loaded inputs are never cleared by a refresh;
- the Theme pointer is re-applied only when the refresh actually converges
  (`status === "applied"`);
- fingerprint-idempotent: an unchanged scheme fingerprint is a no-op that still
  reports `applied`.

`make conformance` asserts these source invariants and the platform
`checkAppRepo` template gate. Do not weaken them to make a test pass.
