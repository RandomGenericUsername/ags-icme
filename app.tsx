import app from "ags/gtk4/app";
import Gtk from "gi://Gtk?version=4.0";
import style from "./style.css";
// Theming through the platform Theme port (spine AD-13): the adapter owns WHICH
// artifact is applied — the stable `colors.css` pointer, repointed on every
// palette change — so this app no longer carries its own theme.ts copy.
import { theme } from "ags-platform/adapters/theme";
import { createPaletteRefreshHandler } from "ags-platform/ports/palette-refresh";
import { EditorWindow, refreshEditorPalette } from "./ui/EditorWindow";

/**
 * Register one top-level window with the application.
 *
 * gnim types a JSX element — what `EditorWindow(monitor)` returns — as
 * `JSX.Element`, which it declares as the base `GObject.Object`, while AGS's
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
  // Live palette refresh (AD-27) through the runtime command only. The editor
  // returns `deferred` while a save is in progress; its staged pending edits,
  // selection and loaded show survive every applied refresh. The Theme pointer
  // is applied only when the editor actually converges.
  requestHandler: createPaletteRefreshHandler(async () => {
    const result = await refreshEditorPalette();
    if (result.status === "applied") theme.apply();
    return result;
  }),
  main() {
    theme.apply();
    // Single centered window on the primary monitor (dev tool, not chrome).
    const monitor = app.get_monitors()[0];
    if (monitor) addWindow(EditorWindow(monitor));
  },
});
