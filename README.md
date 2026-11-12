# ags-icme

Standalone AGS icon color mapping editor (ICME). Authoring-time GUI for
recoloring icon templates by editing `color_mappings`. Click a shape → pick a
palette swatch → save. The repo root **is** the app package.

| Field | Value |
| --- | --- |
| Repo | `ags-icme` |
| App id | `icme` |
| AGS instance | `icon-color-mapping-editor` |
| Config dir | `ags-icme` |
| Window | `icon-color-mapping-editor-window` |
| Launcher | `icon-color-mapping-editor` |
| Keybind description | Open icon color mapping editor (SUPER+I) |
| Manifest mode | `live` (`holdsUnsavedState: true`) |

`app.manifest.json` is the single identity source. The runtime discovers the
deployed config link, requires `manifest.instance == app.tsx instanceName ==
ags list`, and requires `manifest.configDir == the deployed link basename`.
`holdsUnsavedState: true` means a restart would discard staged edits; this app
must stay `live` and preserve pending work across palette refresh.

The canonical specification lives in
`dotfiles-v3/openspec/changes/add-icon-color-mapping-editor/`;
`tests/fixtures/substitution.json` is the preview-fidelity contract.

## Thin platform consumer

This app depends on `ags-platform`, `contracts` (generated binding) and
`dotfiles` (the manifest it edits), never on another app (AD-1):

- **Events (consumer)** — `wallpaper.state` is consumed through the one shared
  event client (`ags-platform/adapters/event-bus`, AD-5) when needed; palette
  application is runtime-driven (see below).
- **Events (publisher)** — a successful save publishes `icme.saved { path }`.
  The topic and payload type come from the VENDORED generated binding
  (`lib/generated/contract.ts`, pinned to the `contracts` artifact) and the
  `Emit` method name from the shared client (`lib/icme-saved.ts` is the pure
  shape; `lib/icme-saved-gio.ts` is the Gio seam).
- **Theming** — the `palette.v1` role/hex map comes from the `Theme` provider
  (`ags-platform/adapters/theme`, AD-13): `theme.palette()` for the token list
  and previews, `theme.subscribe()` for live change notification. ICME never
  reads `colors.yaml` directly.
- **Appearance** — palette, skin and mode are applied as one composed
  generation through the app-scoped Generations v3 Appearance consumer
  (`ags-platform/adapters/appearance`) with
  `createAppearance({ configDir: "ags-icme" })`. It reads only
  `$XDG_STATE_HOME/dotfiles/current/manifest.json` and
  `current/appearance/ags-icme.css` behind the single repointed `current` hop.
  `app.tsx` calls `appearance.apply()` in `main()`. `style.css` stays the
  bundled glass fallback when the appearance artifacts are absent; the
  adapter's monitor reloads a committed generation, and `app.tsx` registers the
  generation-bound `appearance-refresh <genHash>` handler for the runtime's
  direct trigger. Layout tokens are TSX-owned; the window size reads
  `layout.ags-icme.root-width` / `root-height`.
- **Icons** — this app has no `icon-registry.ts` copy: it renders icon
  templates from disk through `itr`, so the platform `IconProvider` does not
  apply.

## Inputs

The authoring model is **repo-authoritative**: the editor edits the dotfiles
repo manifest (`dotfiles/config/icon-template-color-scheme-mappings/`) whenever a
checkout is detectable — via `ICME_REPO_ROOT` (set by the provisioned launcher)
or a working-directory ancestor walk — and bootstrap converges the manifest into
the spine on every run. On machines without a checkout it edits the spine copy
(`~/.local/share/dotfiles/icon-mappings/`) instead. `ICME_ICONS_YAML`,
`ICME_TEMPLATE_ROOT` and `ICME_REPO_ROOT` override the resolution. The color
scheme itself is never a path input: ITR resolves it from its own settings and
the editor reads roles from the platform Theme provider. The editor never
touches `generated/` or runs `itr render`;
rendered icons refresh on the next wallpaper/theme run as usual.

## Live appearance refresh

The runtime deliberately never restarts this instance on a wallpaper set (its
config dir `ags-icme` is in `AgsReloader.DEFAULT_SKIP_CONFIG_DIRS`). Instead it
invokes the frozen Generations v3 command:

```sh
ags request appearance-refresh <genHash> -i icon-color-mapping-editor
```

`app.tsx` registers the platform's
`createAppearanceRefreshHandler(appearance, work)` around
`refreshEditorPalette()` from `ui/EditorWindow.tsx`. The helper resolves and
installs the requested generation (palette, skin and mode) before the editor
work, and answers only `{"applied":"<genHash>"}`,
`{"deferred":"reason","genHash":"<genHash>"}` or
`{"failed":"reason","retryable":bool,"genHash":"<genHash>"}`. The editor also
subscribes through `theme.subscribe()` for its role/hex map, so the chrome and
token list follow a palette change without a restart. The direct request path:

1. returns `deferred` while a save is in progress and `deferred` (with a
   reason) while another show refresh is in flight (never a concurrent
   rebuild);
2. compares the provider role/hex fingerprint; an unchanged palette is a no-op
   that still reports `applied`;
3. otherwise reloads the show (`mappingShow`) and swaps it in;
4. installs the requested generation first; the app work only advances the
   applied generation when it returns `applied`.

Pending edits are preserved: `refreshShow()` never clears the staging maps,
the current selection or the loaded inputs. The handler answers with exactly
one JSON-encoded string naming the requested `genHash`, via
`ags-platform/ports/appearance-refresh`. A wallpaper change never restarts the
process.

## Editing flow

Picks never write to disk. They accumulate in a pending set (keyed by group,
variant-or-null, placeholder) with a live YAML diff sourced from
`itr mapping set --dry-run --diff`. **Save mappings** applies each edit
through `itr mapping set` / `set-default`, publishes `icme.saved`, and reloads;
a failed save keeps the pending edits. **Revert** discards them. Saving is
blocked when `icons.yaml` or `defaults.yaml` changed on disk since load — reload
first.

Scopes: *Whole group* writes `<group>.color_mappings` (default),
*This variant only* adds a `variants[].color_mappings` override, *All icons*
retargets `defaults.yaml` and names the groups shadowing the placeholder.

## Local development

The program tuple is `ags-platform` `v1.1.0` (Generations v3 Appearance
consumer with the required `surface.window` role) / `contracts`
`v0.12.0` (generation + appearance token vocabulary plus the host-defaults,
format-aware-consumer and window-role vocabulary) / `dotfiles-assets`. Those
tags are local-only in this run; the local gates use a gitignored symlink under
`.dev/`.

```sh
ln -s ../../../ags-platform .dev/ags-platform/v1.1.0   # or use AGS_PLATFORM_DEV
make test          # pure unit tests (Node only)
make conformance   # manifest + handler + template gate
make drift         # shared event client <-> contracts drift gate
make typecheck     # LOCAL desktop stack: ags + GIR declarations
make bundle        # LOCAL: `ags bundle app.tsx build/ags-icme.js`
make gates         # all of the above
```

`make test`, `make conformance` and `make drift` are the stock-runner gates.
Typecheck is local and authoritative; CI deliberately has no self-hosted job
(AD-19/AD-23).

Run the app from this checkout:

```sh
ICME_REPO_ROOT=/path/to/dotfiles-v3 ags run -d .
```

## Repo layout

```text
app.tsx                     AGS entry point (instance icon-color-mapping-editor)
app.manifest.json           identity tuple
style.css                   icme-* classes (token-bound chrome)
lib/model.ts                pure selection/pending model (node-tested)
lib/svg.ts                  template parsing + preview painting (pure)
lib/templates.ts            template edit model (pure)
lib/diff.ts                 YAML diff rendering (pure)
lib/substitute.ts           display-only {{PLACEHOLDER}} substitution (pure)
lib/inputs.ts               repo/spine input resolution (GJS)
lib/itr.ts                  typed `itr mapping ...` CLI wrapper (GJS)
lib/icme-saved.ts           pure `icme.saved` emit shape (generated binding)
lib/icme-saved-gio.ts       hub `Emit` transport (GJS)
lib/generated/contract.ts   VENDORED generated event contract (pinned)
ui/                         EditorWindow + panels
tests/                      pure library suites, publisher smoke, drift,
                            manifest/handler/template conformance
tickets/                    LIFECYCLE, INDEX, _template, this repo's tickets
scripts/worktree-guard.sh
templates/ags-app/          frozen copyable template for the next app repo
.github/workflows/ci.yml    stock-runner CI (make ci)
```

## Creating the next app repo

Copy `templates/ags-app/` to the new repo root, fill the placeholders declared
in `templates/ags-app/template.json`, then run `make test` and
`make conformance`. No generator is required. Keep the template frozen per
release (AD-33).

## Consumer surfaces

`dotfiles-v3` owns the app list; `dotfiles-provision` installs the tag and
links `config/ags-icme`; `dotfiles-assets` owns the keybind described as
**Open icon color mapping editor** (SUPER+I) and the
`icon-color-mapping-editor` launcher. This repo does not provision or edit
those repos; it proves only the app-side contract.

## Known divergence

Python `\w` matches Unicode word characters while the TypeScript `/\w/` is
ASCII-only. Placeholder names are `COLOR_*` ASCII by vocabulary convention, so
the substitution contract holds for all real inputs.
