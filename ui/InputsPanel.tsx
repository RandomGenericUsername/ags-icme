import { Gtk } from "ags/gtk4";
import Pango from "gi://Pango?version=1.0";
import { createEffect, type Accessor } from "ags";
import type { EditTarget, EditorInputs, EditorTargets } from "../lib/inputs";

export interface InputsPanelProps {
  inputs: Accessor<EditorInputs>;
  target: Accessor<EditTarget>;
  targets: EditorTargets;
  pendingCount: () => number;
  onChangeTarget(target: EditTarget): void;
}

interface PathRow {
  label: string;
  row: Gtk.Box;
  path: Gtk.Label;
  get: (inputs: EditorInputs) => string;
}

export function InputsPanel(props: InputsPanelProps) {
  const root = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    css_classes: ["inputs"],
  });
  root.append(new Gtk.Label({ label: "Inputs", css_classes: ["icme-pane-title"] }));

  const options: Array<{ target: EditTarget; label: string }> = [
    { target: "installed", label: "Installed (spine)" },
  ];
  if (props.targets.repo !== null) {
    options.push({ target: "repo", label: "Repository (checkout)" });
  }

  root.append(
    new Gtk.Label({
      label: "Edit target",
      css_classes: ["input-label"],
      xalign: 0,
    }),
  );
  const dropdown = new Gtk.DropDown({
    model: Gtk.StringList.new(options.map((option) => option.label)),
    hexpand: true,
  });
  root.append(dropdown);

  // `notify::selected` also fires when the effect below mirrors the accessor
  // into the widget; ignore those writes so they never re-enter onChangeTarget.
  let syncing = false;
  dropdown.connect("notify::selected", () => {
    if (syncing) return;
    const option = options[dropdown.get_selected()];
    if (!option) return;
    if (option.target === props.target()) return;
    props.onChangeTarget(option.target);
  });

  const rows: PathRow[] = [
    {
      label: "SVG template root",
      row: new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL }),
      path: new Gtk.Label({ css_classes: ["path"], xalign: 0 }),
      get: (inputs) => inputs.templateRoot,
    },
    {
      label: "Icons manifest (edited by tool)",
      row: new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL }),
      path: new Gtk.Label({ css_classes: ["path", "rw"], xalign: 0 }),
      get: (inputs) => inputs.iconsYaml,
    },
  ];

  for (const item of rows) {
    const title = new Gtk.Label({
      label: item.label,
      css_classes: ["input-label"],
      xalign: 0,
    });
    item.path.set_ellipsize(Pango.EllipsizeMode.END);
    item.path.set_max_width_chars(28);
    item.path.set_hexpand(true);
    item.row.append(title);
    item.row.append(item.path);
    root.append(item.row);
  }

  const hint = new Gtk.Label({
    css_classes: ["input-hint"],
    xalign: 0,
    wrap: true,
    max_width_chars: 30,
  });
  root.append(hint);

  createEffect(() => {
    const inputs = props.inputs();
    const current = props.target();
    const locked = props.pendingCount() > 0;
    const selected = options.findIndex((option) => option.target === current);
    if (selected >= 0 && dropdown.get_selected() !== selected) {
      syncing = true;
      dropdown.set_selected(selected);
      syncing = false;
    }

    const noRepo = props.targets.repo === null;
    dropdown.set_sensitive(!locked && !noRepo);
    dropdown.set_tooltip_text(
      noRepo
        ? "No dotfiles-assets checkout detected"
        : locked
          ? "Save or Revert pending changes before switching targets"
          : "Choose where edits are written",
    );

    for (const item of rows) {
      const path = item.get(inputs);
      item.path.set_label(path);
      item.path.set_tooltip_text(path);
    }

    const repoActive = current === "repo" && !noRepo;
    hint.set_label(
      repoActive
        ? "Edits the dotfiles-assets checkout. Nothing is live until you commit and deploy."
        : "Edits the installed spine. The runtime picks up saves here.",
    );
  });

  return root;
}
