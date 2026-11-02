// ---------------------------------------------------------------------------
// Manifest + handler + template conformance for the ags-icme repo
// (AD-26/AD-27/AD-33/AD-35).
//
// This is the repo-local gate the standalone contract requires:
//   1. `app.manifest.json` is schema-valid and carries the ICME identity,
//      including `holdsUnsavedState: true`;
//   2. app.tsx / window / launcher / config dir agree with that identity;
//   3. the live palette-refresh handler is the real v0.5.0 pending-preserving
//      one (deferred during save, busy during refresh, fingerprint-idempotent,
//      staging maps and selection untouched, Theme applied only on applied);
//   4. the shared dev-flow template (AGENTS, tickets, guard, Makefile, CI,
//      tests, templates/ags-app) is present and the platform's own
//      `checkAppRepo` template gate passes;
//   5. the manifest schema encodes the no-restart invariant for this app.
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

test("the contracts v0.3.0 schema keeps restart invalid for this app", () => {
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

test("the Makefile pins the v0.4.0 platform provider and v0.3.0 contracts", () => {
  const makefile = readText("Makefile");
  assert.match(makefile, /^AGS_PLATFORM_VERSION := v0\.4\.0$/m);
  assert.match(makefile, /^CONTRACTS_VERSION := v0\.3\.0$/m);
});

// ── 3. The live handler is the real v0.5.0 pending-preserving one ──────────

test("app.tsx registers the real palette-refresh handler", () => {
  const app = readText("app.tsx");
  assert.match(app, /from\s+"ags-platform\/ports\/palette-refresh"/);
  assert.match(app, /import\s+\{\s*createPaletteRefreshHandler\s*\}/);
  assert.match(
    app,
    /requestHandler:\s*createPaletteRefreshHandler\(async\s*\(\)\s*=>\s*\{[\s\S]*?await\s+refreshEditorPalette\(\)/,
    "the handler awaits the editor's refresh",
  );
  assert.match(
    app,
    /if\s*\(result\.status === "applied"\)\s*theme\.apply\(\)/,
    "the Theme pointer is applied only when the refresh converges",
  );
  assert.doesNotMatch(
    app,
    /wallpaper\.state|WALLPAPER_STATE_TOPIC/,
    "the runtime command is the only palette trigger",
  );
});

test("the refresh defers during save, is busy while refreshing, and is fingerprint-idempotent", () => {
  const window = readText("ui", "EditorWindow.tsx");
  const refresh = functionBody(window, "async function refreshEditorPaletteNow");

  assert.match(refresh, /if \(saving\(\)\) return \{ status: "deferred", reason: /);
  assert.match(refresh, /if \(schemeRefreshing\) return \{ status: "busy" \}/);
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
  assert.match(window, /paletteRefresh|palette-refresh/);
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
