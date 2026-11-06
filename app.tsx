import app from "ags/gtk4/app";
import Gtk from "gi://Gtk?version=4.0";
import style from "./style.css";
// Appearance through the platform v2 consumer (contracts v0.7.0): one composed
// provider for palette + skin + mode and one monitor on the single repointed
// `$XDG_STATE_HOME/dotfiles/current/appearance` hop. This replaces the split
// Theme + Skin pair.
import { createAppearance } from "ags-platform/adapters/appearance";
import { createAppearanceRefreshHandler } from "ags-platform/ports/appearance-refresh";
import { EditorWindow, refreshEditorPalette } from "./ui/EditorWindow";

// This app's slice of the v2 appearance plane: the runtime-composed
// `$XDG_CONFIG_HOME/ags-icme/appearance.css` (palette + skin + mode) behind the
// one `current/appearance` hop. The adapter owns the provider and its file
// monitor, so an appearance change reloads without a request handler. A
// missing artifact is a no-op, leaving the bundled `style.css` glass fallback.
const appearance = createAppearance({ configDir: "ags-icme" });

/**
 * Register one top-level window with the application.
 *
 * gnim types a JSX element — what `EditorWindow(monitor, appearance)` returns —
 * as `JSX.Element`, which it declares as the base `GObject.Object`, while AGS's
 * `app.add_window` is typed to take a `Gtk.Window`. At runtime the object a JSX
 * root call returns IS the `Gtk.Window` the tree was rooted in, so the cast
 * states a runtime truth the compiler cannot see. Same helper as `bar/app.tsx`
 * and the other migrated apps.
 */
function addWindow(element: JSX.Element): void {
  app.add_window(element as Gtk.Window);
}

app.start({
  css: style,
  instanceName: "icon-color-mapping-editor",
  // The runtime is the only palette-refresh trigger (AD-27). The platform
  // helper re-applies the WHOLE appearance first, then runs the app-owned work:
  // the editor's pending-preserving refresh. It returns `deferred` while a
  // save is in progress and `busy` while a show refresh is already in flight,
  // so staged edits, selection and loaded inputs survive every request. The
  // helper owns the single JSON response and hash idempotence.
  requestHandler: createAppearanceRefreshHandler(appearance, async () => {
    const result = await refreshEditorPalette();
    return result;
  }),
  main() {
    // One apply installs the composed palette + skin + mode sheet. Missing
    // artifacts are a no-op and an identical generation is coalesced.
    appearance.apply();
    // Single centered window on the primary monitor (dev tool, not chrome).
    const monitor = app.get_monitors()[0];
    if (monitor) addWindow(EditorWindow(monitor, appearance));
  },
});
