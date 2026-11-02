import { Astal, Gdk, Gtk } from "ags/gtk4";
import app from "ags/gtk4/app";
import GLib from "gi://GLib?version=2.0";
import { createEffect, createState } from "ags";
import { theme } from "ags-platform/adapters/theme";
import type { PaletteRefreshResult } from "ags-platform/ports/palette-refresh";
import {
  manifestRegister,
  mappingSet,
  mappingSetDefault,
  mappingShow,
  templateSetPlaceholder,
  type MappingShow,
} from "../lib/itr";
import {
  defaultsPathFor,
  mtimeOf,
  resolveInputs,
  type EditorInputs,
} from "../lib/inputs";
import {
  paletteFingerprint,
  resolveTokenHex,
  type RoleMap,
} from "../lib/palette";
// The ONE shared event client (spine AD-5): the app-local `lib/event-bus*.ts`
// copies are gone. The editor publishes `icme.saved` through the generated
// binding; palette changes arrive through the runtime `palette-refresh`
// command, not `wallpaper.state` (AD-27).
import { publishIcmeSaved } from "../lib/icme-saved-gio";
import type {
  PendingEdit,
  Scope,
  ShapeSelection,
  VocabularyPendingEdit,
} from "../lib/model";
import { resolveToken, upsertPending } from "../lib/model";
import { templatePendingKey, type ManifestPending, type TemplatePendingEdit } from "../lib/templates";
import { extractShapes } from "../lib/svg";
import { DiffPane } from "./DiffPane";
import { GroupTree } from "./GroupTree";
import { InputsPanel } from "./InputsPanel";
import { Preview } from "./Preview";
import { ScopeSwitch } from "./ScopeSwitch";
import { SelectionPanel, type CurrentToken } from "./SelectionPanel";
import { TokenPicker } from "./TokenPicker";

/**
 * The manifest-instance convention: the window is `<instance>-window`, the
 * same spelling the provisioned launcher probes first. The source, CSS and
 * conformance gate all use this one constant so a lookup can never drift from
 * the registered name again.
 */
export const WINDOW_NAME = "icon-color-mapping-editor-window";

/**
 * The provider's current role map. `theme.palette()` fails closed when the
 * runtime artifact is missing/malformed; an empty map keeps the editor usable
 * (previews show the unresolved hatch) without falling back to a direct read.
 */
function providerRoles(): RoleMap {
  try {
    return theme.palette().roles;
  } catch {
    return {};
  }
}

// Shell window hosting the editor. Owns session state, pending edits, and the
// save pipeline. One centered overlay window on the given monitor (same
// layer-shell pattern as the capture dialog).
/**
 * Editor palette refresher, registered by the one editor window and called
 * from the app-level `palette-refresh` handler. It never clears the staging
 * maps, so pending edits and the current selection survive a refresh.
 */
let refreshPalette: (() => Promise<PaletteRefreshResult>) | null = null;

export function refreshEditorPalette(): Promise<PaletteRefreshResult> {
  return refreshPalette?.() ?? Promise.resolve({ status: "applied" });
}

export function EditorWindow(gdkmonitor: Gdk.Monitor) {
  const [show, setShow] = createState<MappingShow | null>(null);
  const [loadError, setLoadError] = createState<string | null>(null);
  const [inputs, setInputs] = createState<EditorInputs>(resolveInputs());
  // The typed role map is the provider's, not a snapshot parsed from the
  // show. The platform adapter owns which artifact is current.
  const [palette, setPalette] = createState<RoleMap>(providerRoles());
  const [groupName, setGroupName] = createState("");
  const [activeVariant, setActiveVariant] = createState("");
  const [selection, setSelection] = createState<ShapeSelection | null>(null);
  const [scope, setScope] = createState<Scope>("group");
  const [pending, setPending] = createState<ReadonlyMap<string, PendingEdit>>(new Map());
  const [vocabPending, setVocabPending] = createState<
    ReadonlyMap<string, VocabularyPendingEdit>
  >(new Map());
  const [showGroup, setShowGroup] = createState(true);
  const [barBackground, setBarBackground] = createState(false);
  const [currentToken, setCurrentToken] = createState<CurrentToken | null>(null);
  const [saving, setSaving] = createState(false);
  const [saveError, setSaveError] = createState<string | null>(null);
  const [stale, setStale] = createState(false);
  const [inspectorMode, setInspectorMode] = createState<"mapping" | "template">("mapping");
  const [templatePending, setTemplatePending] = createState<
    ReadonlyMap<string, TemplatePendingEdit>
  >(new Map());
  const [newPlaceholders, setNewPlaceholders] = createState<ReadonlyMap<string, string>>(
    new Map(),
  );
  const [manifestPendings, setManifestPendings] = createState<ReadonlyArray<ManifestPending>>(
    [],
  );
  const templateMtimes = new Map<string, number | null>();
  let loadedMtimes: { icons: number | null; defaults: number | null } = {
    icons: null,
    defaults: null,
  };

  function snapshotMtimes(next: EditorInputs): void {
    loadedMtimes = {
      icons: mtimeOf(next.iconsYaml),
      defaults: mtimeOf(defaultsPathFor(next.iconsYaml)),
    };
  }

  async function refreshShow(): Promise<void> {
    const next = inputs();
    const loaded = await mappingShow({
      iconsYaml: next.iconsYaml,
      templateDir: next.templateRoot,
    });
    setShow(loaded);
    setLoadError(null);
    snapshotMtimes(next);
    const group = loaded.groups.find((g) => g.group === groupName()) ?? loaded.groups[0];
    if (group) {
      setGroupName(group.group);
      const view =
        group.variants.find((v) => v.variant === activeVariant()) ?? group.variants[0];
      if (view) setActiveVariant(view.variant);
    }
  }

  // Provider-palette baseline: the role/hex fingerprint, not a file path. An
  // unchanged palette is a no-op; an additive role change still counts.
  let paletteFp = paletteFingerprint(palette());
  let schemeRefreshing = false;

  function load(next: EditorInputs): void {
    setInputs(next);
    setShow(null);
    setLoadError(null);
    setSelection(null);
    setPending(new Map());
    setVocabPending(new Map());
    setTemplatePending(new Map());
    setNewPlaceholders(new Map());
    setManifestPendings([]);
    templateMtimes.clear();
    setSaveError(null);
    setStale(false);
    refreshShow().catch((error: unknown) => setLoadError(String(error)));
  }

  function totalPending(): number {
    return (
      pending().size +
      vocabPending().size +
      templatePending().size +
      newPlaceholders().size +
      manifestPendings().length
    );
  }

  function stageTemplate(edit: TemplatePendingEdit): void {
    const next = new Map(templatePending());
    next.set(templatePendingKey(edit.templatePath, edit.shapeId), edit);
    setTemplatePending(next);
    templateMtimes.set(edit.templatePath, mtimeOf(edit.templatePath));
  }

  function stageNewPlaceholder(name: string, token: string): void {
    const next = new Map(newPlaceholders());
    next.set(name, token);
    setNewPlaceholders(next);
  }

  function stageManifest(entry: ManifestPending): void {
    setManifestPendings([...manifestPendings(), entry]);
  }

  load(resolveInputs());

  // Follow the provider palette on every invocation: the window's `map`
  // handler (below) re-reads the role map (the source of truth), so a
  // wallpaper switch made while the editor was hidden cannot leave stale
  // colors on the next SUPER+I toggle. No background polling. Pending edits
  // are preserved: only the palette accessor changes here.

  // Runtime palette refresh (AD-27). The editor no longer follows
  // `wallpaper.state` for palette; that event is progress/status only. The
  // provider subscription below is the primary update path; this handler keeps
  // the protocol's deferred/busy contract for the runtime's direct trigger.
  async function refreshEditorPaletteNow(): Promise<PaletteRefreshResult> {
    if (saving()) return { status: "deferred", reason: "a save is in progress" };
    if (schemeRefreshing) return { status: "busy" };
    try {
      const roles = providerRoles();
      const fp = paletteFingerprint(roles);
      if (fp === paletteFp) return { status: "applied" };
      paletteFp = fp;
      schemeRefreshing = true;
      setPalette(roles);
      await refreshShow();
      return { status: "applied" };
    } finally {
      schemeRefreshing = false;
    }
  }

  refreshPalette = refreshEditorPaletteNow;

  // Provider change notification: the adapter has already reloaded + applied
  // the composed CSS, so the chrome is current before this runs. Updating the
  // role map repaints every token swatch and preview without a shell-out or a
  // restart. The listener never touches the staging maps or the selection.
  theme.subscribe((next) => {
    paletteFp = paletteFingerprint(next.roles);
    setPalette(next.roles);
  });

  function pick(token: string): void {
    const sel = selection();
    // A bare shape has no placeholder to retarget; picks are inert until one
    // is assigned in the Shape Placeholder pane.
    if (!sel || sel.placeholder === null) return;
    if (scope() === "vocabulary") {
      const next = new Map(vocabPending());
      next.set(sel.placeholder, { placeholder: sel.placeholder, token });
      setVocabPending(next);
    } else {
      setPending(
        upsertPending(pending(), {
          group: groupName(),
          variant: scope() === "variant" ? sel.variantName : null,
          placeholder: sel.placeholder,
          token,
        }),
      );
    }
  }

  async function save(): Promise<void> {
    if (saving() || totalPending() === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      const next = inputs();
      const fresh = {
        icons: mtimeOf(next.iconsYaml),
        defaults: mtimeOf(defaultsPathFor(next.iconsYaml)),
      };
      if (
        fresh.icons !== loadedMtimes.icons ||
        fresh.defaults !== loadedMtimes.defaults
      ) {
        setStale(true);
        setSaveError(
          "icons.yaml or defaults.yaml changed on disk since load. Reload to continue.",
        );
        return;
      }
      // Stale template files block save (mtime guard, same as icons/defaults).
      for (const path of templateMtimes.keys()) {
        if (mtimeOf(path) !== templateMtimes.get(path)) {
          setStale(true);
          setSaveError(`A template file changed on disk since load: ${path}. Reload to continue.`);
          return;
        }
      }
      // 1. Template writes.
      for (const edit of templatePending().values()) {
        await templateSetPlaceholder(edit.templatePath, edit.shapeId, edit.newPlaceholder);
      }
      // 2. Vocabulary defaults for new placeholders.
      for (const [name, token] of newPlaceholders()) {
        await mappingSetDefault({
          defaultsYaml: defaultsPathFor(next.iconsYaml),
          manifestYaml: next.iconsYaml,
          placeholder: name,
          token,
        });
      }
      // 3. Manifest registration for brand-new files.
      for (const entry of manifestPendings()) {
        await manifestRegister({
          manifestYaml: entry.manifestPath,
          group: entry.group,
          variant: entry.variant,
          template: entry.template,
          output: entry.output,
        });
      }
      // 4. Mapping writes.
      for (const edit of pending().values()) {
        await mappingSet({
          iconsYaml: next.iconsYaml,
          group: edit.group,
          placeholder: edit.placeholder,
          token: edit.token,
          variant: edit.variant ?? undefined,
        });
      }
      for (const edit of vocabPending().values()) {
        await mappingSetDefault({
          defaultsYaml: defaultsPathFor(next.iconsYaml),
          manifestYaml: next.iconsYaml,
          placeholder: edit.placeholder,
          token: edit.token,
        });
      }
      setPending(new Map());
      setVocabPending(new Map());
      setTemplatePending(new Map());
      setNewPlaceholders(new Map());
      setManifestPendings([]);
      templateMtimes.clear();
      // Publish the domain event at the meaningful moment (save), not on
      // exit; the hub forwards it to consumers (Phase 5, 5-4).
      publishIcmeSaved(next.iconsYaml);
      // Never triggers a render: sources only, generated icons refresh on the
      // next wallpaper/theme run.
      await refreshShow();
    } catch (error: unknown) {
      // Pending state is retained so nothing is lost.
      setSaveError(String(error));
    } finally {
      setSaving(false);
    }
  }

  function selectShapeId(shapeId: string): void {
    const loaded = show();
    const group = loaded?.groups.find((g) => g.group === groupName());
    const view = group?.variants.find((v) => v.variant === activeVariant());
    if (!view) return;
    const shape = extractShapes(view.svg_body).find((s) => String(s.id) === shapeId);
    if (!shape) return;
    // Bare shapes (placeholder === null) are selectable — users assign them in
    // the Shape Placeholder sub-pane of the unified SelectionPanel.
    // Staged template edits win over the on-disk placeholder so a re-placed
    // shape immediately shows its new placeholder in the Color Mapping pane.
    const staged = templatePending().get(templatePendingKey(view.template_path, shape.id));
    setSelection({
      variantName: view.variant,
      shapeId,
      placeholder: staged?.newPlaceholder ?? shape.placeholder,
      literal: shape.literal ?? null,
      paintAttr: shape.paintAttr,
    });
  }

  // Current token follows on-disk mappings overlaid with pending edits.
  // Bare shapes (placeholder === null) always yield null.
  // Newly staged placeholders are resolved from newPlaceholders first.
  createEffect(() => {
    const loaded = show();
    const sel = selection();
    pending();
    vocabPending();
    newPlaceholders();
    const group = loaded?.groups.find((g) => g.group === groupName());
    const view = group?.variants.find((v) => v.variant === activeVariant());
    if (!loaded || !sel || !view || sel.variantName !== view.variant) {
      setCurrentToken(null);
      return;
    }
    // Bare shape — no color token can be resolved.
    if (sel.placeholder === null) {
      setCurrentToken(null);
      return;
    }
    // New placeholder staged this session: resolve from vocabulary defaults map.
    const newToken = newPlaceholders().get(sel.placeholder);
    if (newToken !== undefined) {
      setCurrentToken({ token: newToken, hex: resolveTokenHex(newToken, palette()) });
      return;
    }
    const token = resolveToken(
      view.mappings.map((entry) => ({
        placeholder: entry.placeholder,
        token: entry.token,
        origin: entry.origin,
      })),
      groupName(),
      view.variant,
      sel.placeholder,
      pending(),
      vocabPending(),
    );
    if (token === null) {
      setCurrentToken(null);
      return;
    }
    setCurrentToken({
      token,
      hex: resolveTokenHex(token, palette()),
    });
  });

  const status = new Gtk.Label({
    css_classes: ["icme-status"],
    wrap: true,
    max_width_chars: 40,
  });
  createEffect(() => {
    const error = loadError();
    if (error) {
      status.set_label(`Failed to load mappings: ${error}`);
      status.set_visible(true);
    } else if (!show()) {
      status.set_label("Loading mappings…");
      status.set_visible(true);
    } else {
      status.set_visible(false);
    }
  });

  const left = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    css_classes: ["icme-left"],
  });
  left.append(
    InputsPanel({
      inputs,
      // Every pending kind locks the pickers: switching inputs runs load(),
      // which discards all staging — previously only mapping pendings locked,
      // so staged template edits were wiped silently by a picker change.
      pendingCount: totalPending,
      defaults: resolveInputs(),
      onChange: (next) => load(next),
      onReset: () => load(resolveInputs()),
      // Native file choosers are regular windows and always render below a
      // layer-shell OVERLAY surface — hide the editor while one is open.
      onDialogOpenChange: (open) => {
        const win = app.get_window(WINDOW_NAME);
        if (!win) return;
        if (open) win.show();
        else win.hide();
      },
    }),
  );
  left.append(status);
  const treeScroll = new Gtk.ScrolledWindow({
    hscrollbar_policy: Gtk.PolicyType.NEVER,
    vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    hexpand: true,
    vexpand: true,
  });
  treeScroll.set_child(
    GroupTree({
      show,
      groupName,
      activeVariant,
      onSelectGroup: (group) => {
        setGroupName(group);
        const first = show()?.groups.find((g) => g.group === group)?.variants[0];
        if (first) setActiveVariant(first.variant);
        setSelection(null);
      },
      onSelectVariant: (variant) => {
        setActiveVariant(variant);
        setSelection(null);
      },
    }),
  );
  left.append(treeScroll);

  const right = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    css_classes: ["icme-right"],
  });
  const rightScroll = new Gtk.ScrolledWindow({
    hscrollbar_policy: Gtk.PolicyType.NEVER,
    vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    hexpand: true,
    vexpand: true,
  });
  const rightInner = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
  rightInner.append(
    SelectionPanel({
      show,
      palette,
      groupName,
      activeVariant,
      selection,
      currentToken,
      templatePending,
      newPlaceholders,
      inspectorMode,
      onSetInspectorMode: (mode) => setInspectorMode(mode),
      onSelectShapeId: selectShapeId,
      onStageTemplate: stageTemplate,
      onStageNewPlaceholder: stageNewPlaceholder,
    }),
  );
  // Color-mapping widgets are only meaningful when inspecting a templated
  // shape — hide them while the user is in placeholder-assignment mode.
  const mappingWidgets = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
  mappingWidgets.append(
    ScopeSwitch({
      scope,
      show,
      groupName,
      activeVariant,
      selection,
      onScope: (next) => setScope(next),
    }),
  );
  mappingWidgets.append(
    TokenPicker({
      palette,
      placeholder: () => selection()?.placeholder ?? null,
      currentToken: () => currentToken()?.token ?? null,
      onPick: pick,
    }),
  );
  createEffect(() => {
    mappingWidgets.set_visible(inspectorMode() === "mapping");
  });
  rightInner.append(mappingWidgets);
  rightScroll.set_child(rightInner);
  right.append(rightScroll);

  const saveErrorLabel = new Gtk.Label({
    css_classes: ["save-error"],
    xalign: 0,
    wrap: true,
  });
  const reloadButton = new Gtk.Button({ label: "Reload", css_classes: ["toggle"] });
  reloadButton.connect("clicked", () => load(inputs()));
  const saveButton = new Gtk.Button({
    label: "Save changes",
    css_classes: ["btn", "primary"],
    hexpand: true,
  });
  saveButton.connect("clicked", () => void save());
  const revertButton = new Gtk.Button({ label: "Revert", css_classes: ["btn"] });
  revertButton.connect("clicked", () => {
    setPending(new Map());
    setVocabPending(new Map());
    setTemplatePending(new Map());
    setNewPlaceholders(new Map());
    setManifestPendings([]);
    templateMtimes.clear();
    setSaveError(null);
  });
  const footerButtons = new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
    spacing: 8,
    css_classes: ["footer"],
  });
  footerButtons.append(revertButton);
  footerButtons.append(saveButton);
  const footer = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
  footer.append(saveErrorLabel);
  footer.append(reloadButton);
  footer.append(footerButtons);
  right.append(footer);

  createEffect(() => {
    const hasPending = totalPending() > 0;
    const busy = saving();
    saveButton.set_sensitive(hasPending && !busy);
    revertButton.set_sensitive(hasPending && !busy);
    saveButton.set_label(busy ? "Saving…" : "Save changes");
    const error = saveError();
    saveErrorLabel.set_label(error ?? "");
    saveErrorLabel.set_visible(error !== null);
    reloadButton.set_visible(stale());
  });

  const center = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    css_classes: ["icme-center"],
    hexpand: true,
    vexpand: true,
  });

  // Unified 3-column layout — no top-level tab bar.
  const unifiedRoot = new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
    spacing: 0,
    css_classes: ["icme-root"],
    hexpand: true,
    vexpand: true,
  });
  unifiedRoot.append(left);
  unifiedRoot.append(center);
  unifiedRoot.append(right);

  return (
    <window
      visible
      name={WINDOW_NAME}
      title="Icon Color Mapping Editor"
      gdkmonitor={gdkmonitor}
      anchor={Astal.WindowAnchor.NONE}
      layer={Astal.Layer.OVERLAY}
      keymode={Astal.Keymode.ON_DEMAND}
      default_width={1280}
      default_height={800}
      $={(self) => {
        // ESC hides the window (the toggle-aware launcher brings it back).
        // Works while the window holds keyboard focus; keymode stays
        // ON_DEMAND so the editor never steals keys from other apps.
        const keys = new Gtk.EventControllerKey();
        keys.connect("key-pressed", (_c, keyval) => {
          if (keyval === Gdk.KEY_Escape) {
            self.hide();
            return true;
          }
          return false;
        });
        self.add_controller(keys);
        // Every invocation (SUPER+I toggle -> show -> map): re-read the
        // provider role map so a palette switch made while hidden is applied
        // before the first frame. First map after load() is a no-op.
        self.connect("map", () => {
          try {
            const roles = providerRoles();
            const fp = paletteFingerprint(roles);
            if (fp === paletteFp) return;
            paletteFp = fp;
            setPalette(roles);
          } catch {
            // A failed palette read must never break the window show.
          }
        });
        center.append(
          Preview({
            show,
            palette,
            groupName,
            activeVariant,
            pending,
            vocabPending,
            selection,
            showGroup,
            barBackground,
            onSelectVariant: (variant: string) => {
              setActiveVariant(variant);
              setSelection(null);
            },
            onSelectShape: (next: ShapeSelection | null) => setSelection(next),
            onToggleGroup: () => setShowGroup(!showGroup()),
            onToggleBackdrop: () => setBarBackground(!barBackground()),
            onClose: () => self.close(),
            diffContent: DiffPane({
              show,
              groupName,
              activeVariant,
              pending,
              vocabPending,
              inputs,
              templatePending,
              newPlaceholders,
              manifestPendings,
            }),
          }),
        );
      }}
    >
      {unifiedRoot}
    </window>
  );
}
