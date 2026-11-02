// Palette helpers shared by the editor UI.
//
// The role vocabulary and the role/hex map come from the platform Theme
// provider (`ags-platform/ports/palette`, ags-platform v0.4.0). This module is
// deliberately free of `gi://`/`ags` imports so the node suites can pin the
// token model without a desktop stack.

import { PALETTE_V1_ROLES } from "ags-platform/ports/palette";

/** The provider's role -> `#hex` map. */
export type RoleMap = Readonly<Record<string, string>>;

/**
 * The tokens the editor offers. This is the declared `palette.v1` vocabulary
 * (50 Material roles + `on_backdrop`), never the legacy `colorN` aliases.
 */
export const ROLE_TOKENS: readonly string[] = PALETTE_V1_ROLES;

/**
 * Stable change fingerprint for the provider palette. Includes additive roles
 * (sorted) so a producer that grows its vocabulary still triggers a refresh.
 */
export function paletteFingerprint(roles: RoleMap): string {
  return Object.keys(roles)
    .sort()
    .map((role) => `${role}=${roles[role]}`)
    .join("\n");
}

/** Resolve a mapping token (a role name or a literal `#hex`) to its value. */
export function resolveTokenHex(token: string, roles: RoleMap): string | null {
  if (token.startsWith("#")) return token;
  return roles[token] ?? null;
}
