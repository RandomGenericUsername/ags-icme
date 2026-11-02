// Palette helpers: the provider role vocabulary + token resolution. Run with
// plain node: `node tests/palette.mjs` from the repo root.
import {
  ROLE_TOKENS,
  paletteFingerprint,
  resolveTokenHex,
} from "../lib/palette.ts";

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

check("role vocabulary is palette.v1 (50 Material roles + on_backdrop)", ROLE_TOKENS.length, 51);
check("role vocabulary includes on_backdrop", ROLE_TOKENS.includes("on_backdrop"), true);
check("role vocabulary includes the Material anchors", [
  "surface",
  "surface_container",
  "on_surface",
  "primary",
  "on_primary",
  "tertiary",
  "error",
].every((role) => ROLE_TOKENS.includes(role)), true);
check("role vocabulary offers no legacy colorN tokens", ROLE_TOKENS.some((role) => /^color\d+$/.test(role)), false);

const roles = { primary: "#b9c3ff", on_primary: "#212c61", on_backdrop: "#e3e1e9" };
check("resolves a role token", resolveTokenHex("primary", roles), "#b9c3ff");
check("passes a literal hex through", resolveTokenHex("#ffb59a", roles), "#ffb59a");
check("unknown token is unresolved", resolveTokenHex("color12", roles), null);

check(
  "fingerprint changes with a role value",
  paletteFingerprint(roles) !== paletteFingerprint({ ...roles, primary: "#ffb59a" }),
  true,
);
check(
  "fingerprint changes with an additive role",
  paletteFingerprint(roles) !== paletteFingerprint({ ...roles, accent: "#b9c3ff" }),
  true,
);
check("fingerprint is order-independent", paletteFingerprint(roles), paletteFingerprint({ on_backdrop: "#e3e1e9", primary: "#b9c3ff", on_primary: "#212c61" }));

if (failures > 0) {
  console.error(`${failures} case(s) mismatched`);
  process.exitCode = 1;
} else {
  console.log("palette cases agree");
}
