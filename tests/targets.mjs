// Edit-target path model: the installed spine vs a dotfiles-assets checkout
// (and the legacy dotfiles-v3 composition root). Run with plain node:
// `node tests/targets.mjs` from the repo root.
import {
  installedPaths,
  legacyRepoPaths,
  preferredTarget,
  repoPaths,
} from "../lib/targets.ts";

let failures = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures += 1;
    console.error(`FAIL ${name}\n  expected: ${e}\n  actual:   ${a}`);
  } else {
    console.log(`ok ${name}`);
  }
}

const spine = "/home/u/.local/share/dotfiles";
check("installed paths resolve under the spine", installedPaths(spine), {
  templateRoot: `${spine}/icon-templates`,
  iconsYaml: `${spine}/icon-mappings/icons.yaml`,
});

const assets = "/src/dotfiles-assets";
check("repo paths resolve under a dotfiles-assets checkout", repoPaths(assets), {
  templateRoot: `${assets}/icons/templates`,
  iconsYaml: `${assets}/icons/mappings/icons.yaml`,
});
check(
  "repo paths tolerate a trailing slash without doubling separators",
  repoPaths(`${assets}/`),
  {
    templateRoot: `${assets}/icons/templates`,
    iconsYaml: `${assets}/icons/mappings/icons.yaml`,
  },
);
check(
  "repo paths never contain a doubled slash",
  JSON.stringify([repoPaths(`${assets}/`), repoPaths(`${assets}//`)].map((p) => `${p.templateRoot} ${p.iconsYaml}`)).includes("//"),
  false,
);

const legacy = "/src/dotfiles-v3";
check("legacy repo paths resolve the v3 composition root", legacyRepoPaths(legacy), {
  templateRoot: `${legacy}/dotfiles/assets/icon-templates`,
  iconsYaml: `${legacy}/dotfiles/config/icon-template-color-scheme-mappings/icons.yaml`,
});

check("no repo detected defaults to installed", preferredTarget(null), "installed");
check("a detected repo is preferred", preferredTarget(repoPaths(assets)), "repo");

if (failures > 0) {
  console.error(`${failures} case(s) mismatched`);
  process.exitCode = 1;
} else {
  console.log("target cases agree");
}
