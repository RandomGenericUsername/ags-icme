// Gio transport for the `icme.saved` publisher.
//
// The pure emit shape (topic from the generated binding, payload type, the
// port seam) lives in `./icme-saved.ts`; this file supplies only the bus. The
// hub is the sole emitter: the editor calls its validated `Emit` method and
// never constructs a D-Bus signal (AD-37/AD-38).
//
// The identity constants and `EMIT_METHOD` come from the ONE shared event
// client (AD-5); the app-local `event-bus.ts` / `event-contract.ts` copies are
// gone.

import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";
import {
  EVENTS_BUS_NAME,
  EVENTS_INTERFACE,
  EVENTS_OBJECT_PATH,
} from "ags-platform/ports/event-client";
import {
  EMIT_METHOD,
  publishIcmeSavedVia,
  type EmitPort,
} from "./icme-saved.ts";

const gioPort: EmitPort = {
  emit(topic, payload): void {
    Gio.bus_get_sync(Gio.BusType.SESSION, null).call_sync(
      EVENTS_BUS_NAME,
      EVENTS_OBJECT_PATH,
      EVENTS_INTERFACE,
      EMIT_METHOD,
      new GLib.Variant("(sa{sv})", [
        topic,
        { path: new GLib.Variant("s", payload.path) },
      ]),
      null,
      Gio.DBusCallFlags.NONE,
      -1,
      null,
    );
  },
};

/** Publish `icme.saved {path}` after a successful save; never throws. */
export function publishIcmeSaved(path: string): void {
  try {
    publishIcmeSavedVia(gioPort, path);
  } catch (error) {
    console.error(`event-bus: icme.saved(${path}) failed: ${error}`);
  }
}
