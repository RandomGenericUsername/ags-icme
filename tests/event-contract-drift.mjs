// Contract drift gate for ICME (the icon colour mapping editor).
//
// Pins the SHARED platform event client (spine AD-5, `ags-platform/ports/
// event-client`), the VENDORED generated binding (`lib/generated/contract.ts`)
// and the app's `icme.saved` publisher against the canonical contract
// (`contracts/event-contract.json` / `.xml`). It also exercises the shared
// subscribe-before-read hydration state machine with a scripted fake transport
// (no live bus), and asserts the structural facts REQ-006/AD-27 turn on: the
// event-bus / event-contract / theme copies are gone, the editor no longer
// consumes `wallpaper.state` for palette (the runtime `palette-refresh` command
// owns that), and the platform + generated bindings are used. Executed, never
// text-scanned -- except the structural source reads, which are labelled as
// such.
//
// Run from the repo root:  make drift

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// The ONE event client: the app-local event-bus core is gone, so this gate
// reads the platform's shared client through the dev `node_modules/ags-platform`
// shortcut `make platform-dev` creates (its target sits outside
// node_modules so Node's type-stripping accepts the `.ts` source).
import * as core from "ags-platform/ports/event-client";
import * as saved from "../lib/icme-saved.ts";

const here = dirname(fileURLToPath(import.meta.url));
const icmeDir = join(here, "..");

// The canonical contract lives in the sibling `contracts` repo (AGENTS: every
// app depends on `ags-platform` and `contracts`). `CONTRACTS_REPO` overrides
// the location (the Makefile and CI set it); otherwise search upward for a
// checkout. A missing contract FAILS -- never a silent skip: a drift gate that
// cannot read the contract proves nothing.
function findContractsRepo() {
  const override = process.env.CONTRACTS_REPO;
  if (override) return override;
  let dir = here;
  for (let i = 0; i < 8; i += 1) {
    dir = dirname(dir);
    if (existsSync(join(dir, "contracts", "event-contract.json"))) {
      return join(dir, "contracts");
    }
  }
  return null;
}

const contractsRepo = findContractsRepo();
if (contractsRepo === null) {
  console.error(
    "FAIL: cannot find the `contracts` repo (set CONTRACTS_REPO=/path/to/contracts)",
  );
  process.exit(1);
}
const contractJson = JSON.parse(
  readFileSync(join(contractsRepo, "event-contract.json"), "utf-8"),
);
const contractXml = readFileSync(
  join(contractsRepo, "event-contract.xml"),
  "utf-8",
);

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

// ── Drift: the shared client's constants are contract values ─────────────

check("bus name", core.EVENTS_BUS_NAME, contractJson.well_known_name);
check("object path", core.EVENTS_OBJECT_PATH, contractJson.object_path);
check("interface", core.EVENTS_INTERFACE, contractJson.interface);
check("DomainEvent is a contract signal", contractJson.signals[core.DOMAIN_EVENT_SIGNAL] !== undefined, true);
check("JobsCleared is a contract signal", contractJson.signals[core.JOBS_CLEARED_SIGNAL] !== undefined, true);
check("Control is a contract method", contractJson.methods[core.CONTROL_METHOD] !== undefined, true);
check("GetTopicState is a contract method", contractJson.methods[core.HYDRATION_METHOD] !== undefined, true);
check(
  "GetTopicState returns reserved _epoch/_seq",
  contractJson.methods.GetTopicState.out,
  ["state:a{sv}"],
);
check("Emit is a contract method", contractJson.methods[saved.EMIT_METHOD] !== undefined, true);
check("xml declares the hub interface", contractXml.includes(core.EVENTS_INTERFACE), true);
check(
  "xml declares Emit",
  new RegExp(`<method\\s+name="${saved.EMIT_METHOD}"`).test(contractXml),
  true,
);

// ── Publisher: generated topic + payload (`icme.saved`) ──────────────────

const icmeSaved = contractJson.topics["icme.saved"];
check("icme.saved is a contract topic", icmeSaved !== undefined, true);
check("icme.saved payload is {path:s}", icmeSaved.payload, { path: "s" });
check("publisher topic is the generated topic", saved.ICME_SAVED_TOPIC, "icme.saved");
check(
  "publisher topic is declared by the vendored binding",
  generatedTopics().includes(saved.ICME_SAVED_TOPIC),
  true,
);
check(
  "build emit topic",
  saved.buildIcmeSavedEmit("/x/icons.yaml").topic,
  "icme.saved",
);
check(
  "build emit payload",
  saved.buildIcmeSavedEmit("/x/icons.yaml").payload,
  { path: "/x/icons.yaml" },
);

// A mocked bus: a successful save publishes exactly one correct event; an
// empty path publishes nothing (the original no-op rule is preserved).
{
  const calls = [];
  const bus = { emit(topic, payload) { calls.push([topic, payload]); } };
  saved.publishIcmeSavedVia(bus, "/home/u/.config/dotfiles/icon-mappings.yaml");
  check("one emit on save", calls.length, 1);
  check("emit topic", calls[0][0], "icme.saved");
  check("emit payload", calls[0][1], {
    path: "/home/u/.config/dotfiles/icon-mappings.yaml",
  });
}
{
  const calls = [];
  saved.publishIcmeSavedVia({ emit(topic, payload) { calls.push([topic, payload]); } }, "");
  check("empty path publishes nothing", calls.length, 0);
}

// ── Vendored binding: byte-identical body to `contracts/generated` ───────
//
// The vendored copy is a second source of truth the moment a hand edit lands.
// The first three lines are the fixed vendored header; everything after them
// must be the generated artifact exactly (AD-6).

{
  const vendored = readFileSync(join(icmeDir, "lib", "generated", "contract.ts"), "utf-8");
  const generated = readFileSync(join(contractsRepo, "generated", "contract.ts"), "utf-8");
  const body = vendored.split("\n").slice(3).join("\n");
  check("vendored binding body matches contracts/generated", body, generated);
  check(
    "vendored binding names its pin",
    /GENERATED from the `contracts` repo \(generated\/contract\.ts\) at pin [0-9a-f]{7,}/.test(
      vendored.split("\n")[1],
    ),
    true,
  );
}

// ── The contract shape the shared client hydrates (`wallpaper.state`) ─────
// The editor no longer consumes this topic for palette; the gate still pins the
// canonical payload/enums the shared client parses.

const wallpaper = contractJson.topics["wallpaper.state"];
check("wallpaper.state is a contract topic", wallpaper !== undefined, true);
check(
  "wallpaper.state payload keys",
  Object.keys(wallpaper.payload).sort(),
  ["reload_failures", "stage", "state", "trigger", "wallpaper_hash"],
);
check("wallpaper.state enum.state", wallpaper.enum.state, ["applying", "visible", "done", "error"]);

// ── Subscribe-before-read hydration (fake transport, no bus) ─────────────

function fakeTransport(states) {
  const calls = [];
  const signals = { onDomainEvent: null, onJobsCleared: null, onHubRestart: null };
  let state = { ...states };
  const transport = {
    startSignals(onDomainEvent, onJobsCleared, onHubRestart) {
      calls.push("startSignals");
      signals.onDomainEvent = onDomainEvent;
      signals.onJobsCleared = onJobsCleared;
      signals.onHubRestart = onHubRestart;
    },
    getTopicState(topic) {
      calls.push(`getTopicState:${topic}`);
      return topic in state ? state[topic] : null;
    },
    control(jobId, action) {
      calls.push(`control:${jobId}:${action}`);
    },
  };
  return { transport, calls, signals, setState: (next) => { state = { ...next }; } };
}

// Hydration on subscribe delivers the last wallpaper payload immediately, so an
// editor opened mid-apply renders the current state without waiting.
{
  const fake = fakeTransport({
    "wallpaper.state": { state: "done", wallpaper_hash: "abc", _epoch: 2, _seq: 1 },
  });
  const bus = new core.DomainEventBusCore(fake.transport);
  const seen = [];
  bus.subscribe("wallpaper.state", (_t, payload) => seen.push(payload));
  check(
    "subscribe installs signals before hydrating",
    fake.calls,
    ["startSignals", "getTopicState:wallpaper.state"],
  );
  check("hydrated wallpaper payload", seen, [{ state: "done", wallpaper_hash: "abc" }]);
  check("hydrated pair", bus.hydratedPair("wallpaper.state"), [2, 1]);

  // A stale (epoch, seq) signal is dropped; a newer one is delivered once.
  fake.signals.onDomainEvent([
    "wallpaper.state", "producer", 1, 2, { state: "error", wallpaper_hash: "" },
  ]);
  check("stale wallpaper.state dropped", seen.length, 1);
  fake.signals.onDomainEvent([
    "wallpaper.state", "producer", 2, 2, { state: "done", wallpaper_hash: "def" },
  ]);
  check("newer wallpaper.state delivered", seen.length, 2);
  check("baseline advanced", bus.hydratedPair("wallpaper.state"), [2, 2]);
}

// An absent state is a no-op and baselines (0, 0): a missing hub cannot stall
// the editor at start-up.
{
  const fake = fakeTransport({});
  const bus = new core.DomainEventBusCore(fake.transport);
  const seen = [];
  bus.subscribe("wallpaper.state", (_t, payload) => seen.push(payload));
  check("absent state delivers nothing", seen.length, 0);
  check("absent state baseline", bus.hydratedPair("wallpaper.state"), [0, 0]);
}

// ── Structural: the app consumes the platform + generated binding ────────
//
// REQ-006 removes `lib/event-bus*.ts`, `lib/event-contract.ts` and
// `lib/theme.ts`. Source reads, labelled structural (running a second editor
// would open a window on the live compositor).

const windowSource = readFileSync(join(icmeDir, "ui", "EditorWindow.tsx"), "utf-8");
const appSource = readFileSync(join(icmeDir, "app.tsx"), "utf-8");
const publisherSource = readFileSync(join(icmeDir, "lib", "icme-saved.ts"), "utf-8");
const publisherBusSource = readFileSync(join(icmeDir, "lib", "icme-saved-gio.ts"), "utf-8");

check(
  "window no longer subscribes wallpaper.state for palette",
  windowSource.includes("domainEvents.subscribe") ||
    windowSource.includes("WALLPAPER_STATE_TOPIC"),
  false,
);
check(
  "app registers the palette-refresh handler",
  /createPaletteRefreshHandler\(/.test(appSource),
  true,
);
check(
  "app imports the platform Theme port",
  /from\s+"ags-platform\/adapters\/theme"/.test(appSource),
  true,
);
check(
  "publisher uses the vendored generated binding",
  /from\s+"\.\/generated\/contract(?:\.ts)?"/.test(publisherSource),
  true,
);
check(
  "publisher uses the shared client's Emit method",
  /EMIT_METHOD[\s\S]*from\s+"ags-platform\/ports\/event-client"/.test(publisherSource),
  true,
);
check(
  "Gio transport uses the shared client's identity",
  /EVENTS_BUS_NAME[\s\S]*from\s+"ags-platform\/ports\/event-client"/.test(publisherBusSource),
  true,
);
check(
  "no app-local event-bus import",
  /from\s+"\.\.?\/lib\/event-bus/.test(windowSource) || /from\s+"\.\.?\/lib\/event-bus/.test(appSource),
  false,
);
check(
  "no app-local theme import",
  /from\s+"\.\.?\/lib\/theme"/.test(windowSource) || /from\s+"\.\.?\/lib\/theme"/.test(appSource),
  false,
);
for (const gone of [
  "event-bus.ts",
  "event-bus-core.ts",
  "event-contract.ts",
  "theme.ts",
]) {
  check(`lib/${gone} is gone`, existsSync(join(icmeDir, "lib", gone)), false);
}

// The generated binding is the topic source; importing it must expose the
// icme.saved entry the publisher names.
function generatedTopics() {
  const source = readFileSync(join(icmeDir, "lib", "generated", "contract.ts"), "utf-8");
  const match = source.match(/export const EVENTS_TOPICS = \{([\s\S]*?)\} as const;/);
  if (match === null) return [];
  return [...match[1].matchAll(/"([^"]+)":/g)].map((m) => m[1]);
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
