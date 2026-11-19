// Input resolution for the editor session.
//
// The editor has two explicit, independent targets:
//   - installed: the seeded spine under the user data dir
//       templateRoot = <spineHome>/icon-templates
//       iconsYaml    = <spineHome>/icon-mappings/icons.yaml
//   - repo: a dotfiles-assets checkout (the current layout) or the legacy
//     dotfiles-v3 composition root, whichever is detected:
//       assets: <root>/icons/templates, <root>/icons/mappings/icons.yaml
//       legacy: <root>/dotfiles/assets/icon-templates,
//               <root>/dotfiles/config/icon-template-color-scheme-mappings/icons.yaml
// The repo target is preferred for a fresh session when a checkout is
// detectable; otherwise the installed spine is used. The palette is the
// platform Theme provider (never a path read here).
//
// ICME_TEMPLATE_ROOT / ICME_ICONS_YAML are backward-compatible overrides for
// the repo target only — installed always points at the real spine.

import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";

import {
  installedPaths,
  legacyRepoPaths,
  preferredTarget,
  repoPaths,
  type EditTarget,
  type TargetPaths,
} from "./targets.ts";

export type { EditTarget, TargetPaths } from "./targets.ts";

export interface EditorInputs {
  templateRoot: string;
  iconsYaml: string;
}

export interface EditorTargets {
  installed: TargetPaths;
  repo: TargetPaths | null;
  /** default choice for a fresh editor session */
  defaultTarget: EditTarget;
}

const REPO_MANIFEST = "icons/mappings/icons.yaml";
const LEGACY_MANIFEST = "dotfiles/config/icon-template-color-scheme-mappings/icons.yaml";

function spineHome(): string {
  return `${GLib.get_user_data_dir()}/dotfiles`;
}

function exists(path: string): boolean {
  return GLib.file_test(path, GLib.FileTest.EXISTS);
}

/** True when a path lives under the install spine (not a repo checkout). */
export function isSpinePath(path: string): boolean {
  return path === spineHome() || path.startsWith(`${spineHome()}/`);
}

/**
 * Detect a repo checkout, first valid win:
 *   1. DOTFILES_DEV_INPUTS_ROOT
 *   2. ICME_REPO_ROOT (backward compatibility)
 *   3. cwd ancestor walk (assets layout)
 *   4. sibling <dirname(cwd)>/dotfiles-assets
 *   5. sibling legacy <dirname(cwd)>/dotfiles-v3
 * Hints 1-2 accept either the assets layout or a legacy composition root.
 */
function detectRepo(): TargetPaths | null {
  for (const hint of [
    GLib.getenv("DOTFILES_DEV_INPUTS_ROOT"),
    GLib.getenv("ICME_REPO_ROOT"),
  ]) {
    if (!hint) continue;
    if (exists(`${hint}/${REPO_MANIFEST}`)) return repoPaths(hint);
    if (exists(`${hint}/${LEGACY_MANIFEST}`)) return legacyRepoPaths(hint);
  }

  const cwd = GLib.get_current_dir();
  let dir = cwd;
  for (;;) {
    if (exists(`${dir}/${REPO_MANIFEST}`)) return repoPaths(dir);
    const parent = GLib.path_get_dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  const parentDir = GLib.path_get_dirname(cwd);
  const assetsSibling = `${parentDir}/dotfiles-assets`;
  if (exists(`${assetsSibling}/${REPO_MANIFEST}`)) return repoPaths(assetsSibling);

  const legacySibling = `${parentDir}/dotfiles-v3`;
  if (exists(`${legacySibling}/${LEGACY_MANIFEST}`)) return legacyRepoPaths(legacySibling);

  return null;
}

/** Resolve the installed and repo targets for this session. */
export function resolveTargets(): EditorTargets {
  const detected = detectRepo();
  const repo = detected
    ? {
        templateRoot:
          GLib.getenv("ICME_TEMPLATE_ROOT") ?? detected.templateRoot,
        iconsYaml: GLib.getenv("ICME_ICONS_YAML") ?? detected.iconsYaml,
      }
    : null;
  return {
    installed: installedPaths(spineHome()),
    repo,
    defaultTarget: preferredTarget(repo),
  };
}

/** Inputs for an explicit target; falls back to installed when repo is absent. */
export function resolveInputs(
  target: EditTarget,
  targets: EditorTargets = resolveTargets(),
): EditorInputs {
  if (target === "repo" && targets.repo !== null) return { ...targets.repo };
  return { ...targets.installed };
}

/** Vocabulary file resolved alongside the manifest (mirrors the CLI). */
export function defaultsPathFor(iconsYaml: string): string {
  return `${GLib.path_get_dirname(iconsYaml)}/defaults.yaml`;
}

/** mtime seconds of a file, or null when it cannot be read. */
export function mtimeOf(path: string): number | null {
  try {
    const info = Gio.File.new_for_path(path).query_info(
      "time::modified",
      Gio.FileQueryInfoFlags.NONE,
      null,
    );
    return info.get_modification_date_time()?.to_unix() ?? null;
  } catch {
    return null;
  }
}
