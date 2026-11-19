// Pure target-path model for the editor's two explicit input targets.
//
// `installed` is the seeded spine copy under the user data dir; `repo` is a
// `dotfiles-assets` checkout (or, for backward compatibility, the legacy
// dotfiles-v3 composition root). Paths here are plain strings — the GJS/Gio
// detection seams live in `inputs.ts`, not in this module, so plain node can
// type-strip and run it directly (see tests).

export type EditTarget = "installed" | "repo";

export interface TargetPaths {
  templateRoot: string;
  iconsYaml: string;
}

/** Normalize a root + path segments into an absolute-ish path with single slashes. */
function joinPath(root: string, ...parts: string[]): string {
  const joined = [root, ...parts].join("/");
  const absolute = joined.startsWith("/");
  const normalized = joined.split("/").filter((segment) => segment.length > 0).join("/");
  return absolute ? `/${normalized}` : normalized;
}

export function installedPaths(spineHome: string): TargetPaths {
  return {
    templateRoot: joinPath(spineHome, "icon-templates"),
    iconsYaml: joinPath(spineHome, "icon-mappings", "icons.yaml"),
  };
}

export function repoPaths(assetsRoot: string): TargetPaths {
  return {
    templateRoot: joinPath(assetsRoot, "icons", "templates"),
    iconsYaml: joinPath(assetsRoot, "icons", "mappings", "icons.yaml"),
  };
}

export function legacyRepoPaths(compositionRoot: string): TargetPaths {
  return {
    templateRoot: joinPath(compositionRoot, "dotfiles", "assets", "icon-templates"),
    iconsYaml: joinPath(
      compositionRoot,
      "dotfiles",
      "config",
      "icon-template-color-scheme-mappings",
      "icons.yaml",
    ),
  };
}

export function preferredTarget(repo: TargetPaths | null): EditTarget {
  return repo !== null ? "repo" : "installed";
}
