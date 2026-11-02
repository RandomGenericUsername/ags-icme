import { Gtk } from "ags/gtk4";
import { createEffect } from "ags";
import { ROLE_TOKENS, type RoleMap } from "../lib/palette";

export interface TokenPickerProps {
  // Read-only derivations from the caller: callables, not state handles. The
  // editor passes plain getters over its own state (they are only read here).
  palette: () => RoleMap;
  placeholder: () => string | null;
  currentToken: () => string | null;
  onPick(token: string): void;
}

function isColorValue(value: string | undefined): value is string {
  return typeof value === "string" && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
}

export function TokenPicker(props: TokenPickerProps) {
  const root = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    css_classes: ["picker"],
  });
  const heading = new Gtk.Label({ css_classes: ["picker-title"], xalign: 0, wrap: true });
  root.append(heading);
  root.append(
    new Gtk.Label({
      label: "palette.v1 roles",
      css_classes: ["picker-subtitle"],
      xalign: 0,
    }),
  );

  const named = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 4 });
  root.append(named);

  let builtPalette: RoleMap | null = null;
  const swatches = new Map<string, Gtk.Button>();

  function namedRow(token: string, hex: string | null): Gtk.Box {
    const row = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 9 });
    const chip = new Gtk.Box({ css_classes: ["chip"] });
    chip.set_size_request(20, 20);
    if (hex) {
      const provider = new Gtk.CssProvider();
      provider.load_from_string(`.chip-${token} { background-color: ${hex}; }`);
      chip.get_style_context().add_provider(
        provider,
        Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
      );
      chip.set_css_classes(["chip", `chip-${token}`]);
    } else {
      chip.set_css_classes(["chip", "missing"]);
    }
    const name = new Gtk.Label({ label: token, css_classes: ["ph"] });
    const value = new Gtk.Label({
      label: hex ?? "missing role",
      css_classes: ["tok"],
    });
    row.append(chip);
    row.append(name);
    row.append(value);
    if (!hex) {
      const tag = new Gtk.Label({ label: "not in palette", css_classes: ["tag"] });
      row.append(tag);
    }
    return row;
  }

  function rebuild(palette: RoleMap): void {
    let child = named.get_first_child();
    while (child) {
      const next = child.get_next_sibling();
      named.remove(child);
      child = next;
    }
    swatches.clear();
    for (const token of ROLE_TOKENS) {
      const hex = isColorValue(palette[token]) ? palette[token] : null;
      const row = namedRow(token, hex);
      const button = new Gtk.Button({ css_classes: ["named-row"] });
      button.set_child(row);
      button.set_sensitive(hex !== null);
      button.connect("clicked", () => {
        if (props.placeholder() !== null && hex !== null) props.onPick(token);
      });
      named.append(button);
      swatches.set(token, button);
    }
    builtPalette = palette;
  }

  createEffect(() => {
    const palette = props.palette();
    if (palette !== builtPalette) {
      rebuild(palette);
    }
    const placeholder = props.placeholder();
    const current = props.currentToken();
    if (placeholder === null) {
      heading.set_label("Select a shape to change its color");
    } else {
      heading.set_label(`Set {{${placeholder}}} to which palette role?`);
    }
    const off = placeholder === null;
    named.set_sensitive(!off);
    for (const [token, button] of swatches) {
      const classes = button.get_css_classes().filter((c) => c !== "current");
      if (token === current) classes.push("current");
      button.set_css_classes(classes);
    }
  });

  return root;
}
