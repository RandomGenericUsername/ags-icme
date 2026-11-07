// ---------------------------------------------------------------------------
// Manifest + handler + template conformance for the ags-icme repo
// (AD-26/AD-27/AD-33/AD-35).
//
// This is the repo-local gate the standalone contract requires:
//   1. `app.manifest.json` is schema-valid and carries the ICME identity,
//      including `holdsUnsavedState: true`;
//   2. app.tsx / window / launcher / config dir agree with that identity;
//   3. the live handler is the v3 generation-bound appearance helper
//      (deferred during save and during an in-flight refresh,
//      fingerprint-idempotent, staging maps and selection untouched) with the
//      editor's existing work;
//   4. the shared dev-flow template (AGENTS, tickets, guard, Makefile, CI,
//      tests, templates/ags-app) is present and the platform's own
//      `checkAppRepo` template gate passes;
//   5. the manifest schema encodes the no-restart invariant for this app;
//   6. app.tsx consumes the app-scoped Appearance, without adding a request
//      command or dropping the bundled style.css fallback, and the window size
//      comes from the ags-icme layout tokens.
//
// Run from the repo root:  make conformance
// ---------------------------------------------------------------------------

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAgsAppManifest } from "ags-platform/ports/app-manifest";
import {
  checkAppRepoAt,
  formatAppConformanceReport,
} from "ags-platform/conformance/app-conformance";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const IDENTITY = {
  schemaVersion: 1,
  app: "icme",
  instance: "icon-color-mapping-editor",
  configDir: "ags-icme",
  mode: "live",
  holdsUnsavedState: true,
};

function readText(...parts) {
  return readFileSync(join(ROOT, ...parts), "utf8");
}

/** Strip comments, keeping strings intact (same shape as ags-apps' gate). */
function stripComments(source) {
  let out = "";
  let state = null;
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];
    if (state === "line") {
      if (c === "\n") {
        state = null;
        out += c;
      }
      i += 1;
      continue;
    }
    if (state === "block") {
      if (c === "*" && next === "/") {
        state = null;
        i += 2;
      } else {
        i += 1;
      }
      continue;
    }
    if (state === "'" || state === '"' || state === "`") {
      out += c;
      if (c === "\\") {
        out += next ?? "";
        i += 2;
        continue;
      }
      if (c === state) state = null;
      i += 1;
      continue;
    }
    if (c === "/" && next === "/") {
      state = "line";
      i += 2;
      continue;
    }
    if (c === "/" && next === "*") {
      state = "block";
      i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") state = c;
    out += c;
    i += 1;
  }
  return out;
}

/** The `{...}` body of the function named by `marker`, comments stripped. */
function functionBody(source, marker) {
  const clean = stripComments(source);
  const start = clean.indexOf(marker);
  assert.notEqual(start, -1, `missing function marker: ${marker}`);
  const brace = clean.indexOf("{", start);
  assert.notEqual(brace, -1, `missing function body for: ${marker}`);
  let depth = 0;
  let state = null;
  for (let i = brace; i < clean.length; i += 1) {
    const c = clean[i];
    if (state !== null) {
      if (c === "\\") {
        i += 1;
      } else if (c === state) {
        state = null;
      }
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      state = c;
      continue;
    }
    if (c === "{") depth += 1;
    if (c === "}") {
      depth -= 1;
      if (depth === 0) return clean.slice(brace + 1, i);
    }
  }
  throw new Error(`unterminated function body: ${marker}`);
}

function findContractsRoot() {
  const override = process.env.CONTRACTS_ROOT;
  if (override) return override;
  let dir = ROOT;
  for (let i = 0; i < 8; i += 1) {
    dir = dirname(dir);
    if (existsSync(join(dir, "contracts", "schemas", "ags-app-manifest.schema.json"))) {
      return join(dir, "contracts");
    }
  }
  return null;
}

// ── 1. Manifest identity ───────────────────────────────────────────────────

test("the manifest is schema-valid and carries the ICME identity", () => {
  const parsed = parseAgsAppManifest(readText("app.manifest.json"));
  assert.equal(parsed.ok, true, JSON.stringify(parsed.issues ?? []));
  assert.deepEqual(parsed.manifest, IDENTITY);
});

test("the manifest agrees with app.tsx, the window and the stylesheet", () => {
  const app = readText("app.tsx");
  const window = readText("ui", "EditorWindow.tsx");
  const css = readText("style.css");
  assert.match(app, /instanceName:\s*"icon-color-mapping-editor"/);
  // `<instance>-window` is the manifest convention the launcher probes first.
  assert.match(
    window,
    /export const WINDOW_NAME = "icon-color-mapping-editor-window"/,
  );
  assert.match(window, /name=\{WINDOW_NAME\}/);
  assert.match(window, /app\.get_window\(WINDOW_NAME\)/);
  assert.doesNotMatch(window, /name="icme-window"/);
  assert.match(css, /window#icon-color-mapping-editor-window/);
});

test("the launcher, keybind description and config dir are documented", () => {
  const readme = readText("README.md");
  assert.match(readme, /`icon-color-mapping-editor`/);
  assert.match(readme, /Open icon color mapping editor/);
  assert.match(readme, /ags-icme/);
  assert.match(readme, /holdsUnsavedState: true/);
});

// ── 2. Repository template + platform conformance ──────────────────────────

test("the platform template gate passes for this repo", () => {
  const report = checkAppRepoAt(ROOT);
  assert.equal(report.ok, true, formatAppConformanceReport(report, ROOT));
});

test("the frozen copyable template is present for the next app", () => {
  const template = join(ROOT, "templates", "ags-app");
  const required = [
    "AGENTS.md",
    "README.md",
    "Makefile",
    "app.tsx",
    "app.manifest.json",
    "tsconfig.app.json",
    "scripts/worktree-guard.sh",
    "tickets/LIFECYCLE.md",
    "tickets/INDEX.md",
    "tickets/_template/requirement.md",
    "tests/app-contract.test.mjs",
    "tests/unit.test.mjs",
    ".github/workflows/ci.yml",
  ];
  for (const path of required) {
    assert.ok(existsSync(join(template, path)), `templates/ags-app/${path} is missing`);
  }
  for (const token of ["{{APP}}", "{{INSTANCE}}", "{{CONFIG_DIR}}", "{{REPO}}"]) {
    assert.match(
      readText("templates", "ags-app", "template.json"),
      new RegExp(token.replace(/[{}]/g, "\\$&")),
      `template.json must declare ${token}`,
    );
  }
});

test("the contracts v0.8.0 schema keeps restart invalid for this app", () => {
  const contractsRoot = findContractsRoot();
  assert.notEqual(contractsRoot, null, "cannot find contracts (set CONTRACTS_ROOT)");
  const schema = JSON.parse(
    readFileSync(join(contractsRoot, "schemas", "ags-app-manifest.schema.json"), "utf8"),
  );
  assert.equal(schema.properties.schemaVersion.const, 1);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(
    [...schema.required].sort(),
    ["app", "configDir", "holdsUnsavedState", "instance", "mode", "schemaVersion"],
  );
  assert.equal(
    schema.allOf[0].then.properties.holdsUnsavedState.const,
    false,
    "restart stays invalid when holdsUnsavedState is true",
  );
  assert.equal(IDENTITY.mode, "live");
  assert.equal(IDENTITY.holdsUnsavedState, true);
});

test("the Makefile pins the v1.0.0 appearance provider and v0.8.0 contracts", () => {
  const makefile = readText("Makefile");
  assert.match(makefile, /^AGS_PLATFORM_VERSION := v1\.0\.0$/m);
  assert.match(makefile, /^CONTRACTS_VERSION := v0\.8\.0$/m);
});

// ── 3. App-scoped Appearance consumption ───────────────────────────────────

test("app.tsx applies the ags-icme appearance and no longer applies theme or skin", () => {
  const app = readText("app.tsx");
  assert.match(
    app,
    /import\s+\{\s*createAppearance\s*\}\s+from\s+"ags-platform\/adapters\/appearance"/,
    "the app imports the platform Appearance adapter",
  );
  assert.match(
    app,
    /const appearance = createAppearance\(\{ configDir: "ags-icme" \}\)/,
    "one module-level Appearance scoped to this app's config dir",
  );
  assert.doesNotMatch(
    app,
    /from\s+"ags-platform\/adapters\/(?:theme|skin)"/,
    "the split Theme/Skin adapters are gone from app.tsx",
  );
  assert.doesNotMatch(
    app,
    /\b(?:theme|skin)\.apply\(\)/,
    "the split Theme/Skin applies are gone",
  );

  const main = functionBody(app, "main()");
  assert.match(main, /appearance\.apply\(\)/, "main applies the whole appearance");
  assert.doesNotMatch(main, /theme\.apply|skin\.apply/);
  assert.match(
    main,
    /EditorWindow\(monitor, appearance\)/,
    "the one window receives the app-scoped appearance",
  );
});

test("appearance consumption adds no request command and keeps the bundled fallback", () => {
  const app = readText("app.tsx");
  assert.equal(
    (app.match(/requestHandler\s*:/g) ?? []).length,
    1,
    "the appearance migration must not register a second request handler",
  );
  assert.doesNotMatch(
    app,
    /skin-refresh|skinRefresh|SKIN_REFRESH|PALETTE_REFRESH_COMMAND|argv\[0\]/,
    "the platform helper owns appearance-refresh; no new request command is added",
  );
  assert.match(app, /css:\s*style/, "style.css stays the AGS fallback sheet");

  const cssPath = join(ROOT, "style.css");
  assert.ok(existsSync(cssPath), "style.css must stay bundled");
  assert.ok(
    readFileSync(cssPath, "utf8").trim().length > 0,
    "style.css must not be empty",
  );
});

test("the window size comes from the ags-icme layout tokens", () => {
  const window = readText("ui", "EditorWindow.tsx");
  assert.match(
    window,
    /appearance\.value\("layout\.ags-icme\.root-width", 1280\)/,
    "the root width token keeps the pre-v2 1280 fallback",
  );
  assert.match(
    window,
    /appearance\.value\("layout\.ags-icme\.root-height", 800\)/,
    "the root height token keeps the pre-v2 800 fallback",
  );
  assert.match(window, /default_width=\{rootWidth\.peek\(\)\}/);
  assert.match(window, /default_height=\{rootHeight\.peek\(\)\}/);
  assert.doesNotMatch(window, /default_width=\{1280\}|default_height=\{800\}/);
});

// ── 4. The live handler is the v3 pending-preserving one ───────────────────

test("app.tsx registers the v3 appearance-refresh handler", () => {
  const app = readText("app.tsx");
  assert.match(app, /from\s+"ags-platform\/ports\/appearance-refresh"/);
  assert.match(app, /import\s+\{\s*createAppearanceRefreshHandler\s*\}/);
  assert.match(
    app,
    /requestHandler:\s*createAppearanceRefreshHandler\(appearance,\s*async\s*\(\)\s*=>\s*\{[\s\S]*?await\s+refreshEditorPalette\(\)[\s\S]*?return\s+result;[\s\S]*?\}\),/,
    "the handler awaits the editor's refresh and returns its result",
  );
  assert.doesNotMatch(
    app,
    /theme\.apply|skin\.apply/,
    "the platform helper re-applies the whole appearance",
  );
  assert.doesNotMatch(
    app,
    /wallpaper\.state|WALLPAPER_STATE_TOPIC/,
    "the runtime command is the only palette trigger",
  );
});

test("the v3 refresh defers during save and in-flight work, and is fingerprint-idempotent", () => {
  const window = readText("ui", "EditorWindow.tsx");
  const refresh = functionBody(window, "async function refreshEditorPaletteNow");

  assert.match(refresh, /if \(saving\(\)\) return \{ status: "deferred", reason: /);
  assert.match(refresh, /if \(schemeRefreshing\) \{/);
  assert.match(refresh, /return \{ status: "deferred", reason: "a show refresh is in progress" \}/);
  assert.doesNotMatch(refresh, /status: "busy"/);
  assert.match(refresh, /const roles = providerRoles\(\)/);
  assert.match(refresh, /const fp = paletteFingerprint\(roles\)/);
  assert.match(refresh, /if \(fp === paletteFp\) return \{ status: "applied" \}/);
  assert.match(refresh, /paletteFp = fp/);
  assert.match(refresh, /schemeRefreshing = true/);
  assert.match(refresh, /setPalette\(roles\)/);
  assert.match(refresh, /await refreshShow\(\)/);
  assert.match(refresh, /return \{ status: "applied" \}/);
  assert.match(refresh, /finally \{\s*schemeRefreshing = false/);
  assert.match(window, /refreshPalette = refreshEditorPaletteNow/);
});

test("the refresh never clears pending edits, selection or loaded inputs", () => {
  const window = readText("ui", "EditorWindow.tsx");
  const refresh = functionBody(window, "async function refreshEditorPaletteNow");
  const show = functionBody(window, "async function refreshShow");

  for (const [name, body] of [
    ["refreshEditorPaletteNow", refresh],
    ["refreshShow", show],
  ]) {
    assert.doesNotMatch(body, /setPending\(/, `${name} must not clear mapping pendings`);
    assert.doesNotMatch(body, /setVocabPending\(/, `${name} must not clear vocabulary pendings`);
    assert.doesNotMatch(body, /setTemplatePending\(/, `${name} must not clear template pendings`);
    assert.doesNotMatch(body, /setNewPlaceholders\(/, `${name} must not clear new placeholders`);
    assert.doesNotMatch(body, /setManifestPendings\(/, `${name} must not clear manifest pendings`);
    assert.doesNotMatch(body, /setSelection\(/, `${name} must not clear the selection`);
    assert.doesNotMatch(body, /setInputs\(/, `${name} must not switch inputs`);
    assert.doesNotMatch(body, /\bload\(/, `${name} must not run the destructive load path`);
  }

  // refreshShow swaps the loaded show and keeps the current group/variant.
  assert.match(show, /setShow\(loaded\)/);
  assert.match(show, /const group = loaded\.groups\.find/);
});

test("the editor no longer follows wallpaper.state for palette", () => {
  const window = readText("ui", "EditorWindow.tsx");
  assert.doesNotMatch(window, /domainEvents\.subscribe/);
  assert.doesNotMatch(window, /WALLPAPER_STATE_TOPIC/);
  assert.match(window, /refreshEditorPaletteNow|appearance-refresh/);
});

test("the editor consumes the platform palette provider and offers palette.v1 roles", () => {
  const window = readText("ui", "EditorWindow.tsx");
  const picker = readText("ui", "TokenPicker.tsx");
  const palette = readText("lib", "palette.ts");
  const mini = readText("ui", "SelectionPanel.tsx");

  assert.match(window, /from\s+"ags-platform\/adapters\/theme"/);
  assert.match(window, /theme\.palette\(\)/);
  assert.match(window, /theme\.subscribe\(/);
  assert.match(palette, /PALETTE_V1_ROLES/);
  assert.match(picker, /ROLE_TOKENS/);
  assert.match(mini, /ROLE_TOKENS/);
  assert.doesNotMatch(picker, /\^color\\d\+\$/);
  assert.doesNotMatch(mini, /\^color\\d\+\$/);
  for (const [name, source] of [
    ["app.tsx", readText("app.tsx")],
    ["ui/EditorWindow.tsx", window],
    ["ui/TokenPicker.tsx", picker],
    ["ui/SelectionPanel.tsx", mini],
    ["ui/Preview.tsx", readText("ui", "Preview.tsx")],
    ["lib/inputs.ts", readText("lib", "inputs.ts")],
    ["lib/itr.ts", readText("lib", "itr.ts")],
  ]) {
    // A direct artifact read is the defect this migration removes. The string
    // appears only in this gate; the app resolves roles through the provider.
    assert.doesNotMatch(
      source,
      /current\/colors\.yaml|colors\.yaml/,
      `${name} must not read the palette artifact directly`,
    );
  }
});

test("the chrome stylesheet uses palette.v1 roles only", () => {
  const css = readText("style.css");
  assert.doesNotMatch(css, /@color_/);
  for (const role of [
    "@surface",
    "@surface_container",
    "@on_surface",
    "@on_surface_variant",
    "@primary",
    "@on_primary",
    "@tertiary",
    "@error",
  ]) {
    assert.match(css, new RegExp(role.replace("@", "\\@")), `CSS must use ${role}`);
  }
});
