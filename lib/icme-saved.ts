// Contract-shaped `icme.saved` publisher core (spine AD-5/AD-6).
//
// PURE: no `ags`, no `gi://*`. The topic and payload type come from the
// VENDORED generated binding (`./generated/contract.ts`, pinned to the
// canonical `contracts` artifact), and the `Emit` method name comes from the
// ONE shared event client. The Gio transport lives in `./icme-saved-gio.ts`, so
// plain node can exercise the emit shape against a recording fake.
//
// The Gio-bound `publishIcmeSaved` is a thin wrapper: a missing hub is reduced
// functionality, never a crash (AD-34/AD-38).

import { EMIT_METHOD } from "ags-platform/ports/event-client";
import type { IcmeSavedPayload } from "./generated/contract.ts";
import { EVENTS_TOPICS } from "./generated/contract.ts";

//: `icme.saved` is a GENERATED topic. `satisfies` makes naming a topic the
//: contract does not declare a compile error, rather than a runtime miss.
export const ICME_SAVED_TOPIC = "icme.saved" satisfies keyof typeof EVENTS_TOPICS;

export { EMIT_METHOD };

export interface IcmeSavedEmit {
  topic: typeof ICME_SAVED_TOPIC;
  payload: IcmeSavedPayload;
}

//: The exact `icme.saved` emit: generated topic + generated `{ path }` payload.
export function buildIcmeSavedEmit(path: string): IcmeSavedEmit {
  return { topic: ICME_SAVED_TOPIC, payload: { path } };
}

//: Bus seam: production wraps Gio (`./icme-saved-gio.ts`); tests inject a
//: recording fake.
export interface EmitPort {
  emit(topic: string, payload: IcmeSavedPayload): void;
}

//: Publish `icme.saved {path}` through the hub's validated `Emit`. An empty
//: path is a no-op (nothing meaningful to announce); success/absence is the
//: transport's concern.
export function publishIcmeSavedVia(port: EmitPort, path: string): void {
  if (path === "") return;
  const event = buildIcmeSavedEmit(path);
  port.emit(event.topic, event.payload);
}
