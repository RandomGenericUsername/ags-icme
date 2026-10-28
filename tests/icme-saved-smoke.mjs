// End-to-end-ish smoke for ICME `icme.saved`.
//
// No live bus: the hub `Emit` call is mocked at the transport seam and the
// published topic/payload shape is asserted against the VENDORED generated
// binding. This also pins that `EditorWindow.save()` is wired to the helper
// (structural check, since the GTK window cannot be imported under plain node).
//
// The publisher core is PURE (`../lib/icme-saved.ts`): it reads the topic and
// payload type from the vendored generated binding and the `Emit` method name
// from the one shared event client. The Gio seam is `../lib/icme-saved-gio.ts`.
//
// The canonical contract comparison lives in `event-contract-drift.mjs`; this
// suite deliberately reads no cross-repo checkout, so `make test` runs on
// a stock runner with just this repo (`make test`).
//
//   node tests/icme-saved-smoke.mjs   (from the repo root)

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EMIT_METHOD,
  ICME_SAVED_TOPIC,
  buildIcmeSavedEmit,
  publishIcmeSavedVia,
} from "../lib/icme-saved.ts";
import { EVENTS_TOPICS } from "../lib/generated/contract.ts";

const here = dirname(fileURLToPath(import.meta.url));
const icmeDir = join(here, "..");

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

// The emit shape is the generated topic + `{ path }` payload.
check("topic is icme.saved", ICME_SAVED_TOPIC, "icme.saved");
check("topic is declared by the generated binding", EVENTS_TOPICS[ICME_SAVED_TOPIC] !== undefined, true);
check("build emit topic", buildIcmeSavedEmit("/x/icons.yaml").topic, "icme.saved");
check("build emit payload", buildIcmeSavedEmit("/x/icons.yaml").payload, { path: "/x/icons.yaml" });
check("Emit is the shared client's method name", EMIT_METHOD, "Emit");

// Mocked bus: a successful save publishes exactly one correct event.
{
  const calls = [];
  const bus = { emit(topic, payload) { calls.push([topic, payload]); } };
  publishIcmeSavedVia(bus, "/home/u/.config/dotfiles/icon-mappings.yaml");
  check("one emit on save", calls.length, 1);
  check("emit topic", calls[0][0], "icme.saved");
  check("emit payload", calls[0][1], { path: "/home/u/.config/dotfiles/icon-mappings.yaml" });
}

// An empty path is a no-op (no event published).
{
  const calls = [];
  publishIcmeSavedVia({ emit(topic, payload) { calls.push([topic, payload]); } }, "");
  check("empty path publishes nothing", calls.length, 0);
}

// EditorWindow.save() must call the helper with the saved manifest path, and
// the helper must be the Gio seam over the pure publisher.
{
  const source = readFileSync(join(icmeDir, "ui", "EditorWindow.tsx"), "utf-8");
  check("EditorWindow.save publishes on save", source.includes("publishIcmeSaved(next.iconsYaml)"), true);
  check(
    "EditorWindow imports the Gio publisher seam",
    /from\s+"\.\.\/lib\/icme-saved-gio"/.test(source),
    true,
  );
}

if (failures > 0) {
  console.error(`${failures} assertion(s) failed`);
  process.exitCode = 1;
} else {
  console.log("icme.saved smoke agrees");
}
