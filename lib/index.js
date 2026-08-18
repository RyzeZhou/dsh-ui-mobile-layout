// dsh-ui-mobile-layout — host half (final).
//
// All mobile UI work happens in the client half (lib/client.js). This host
// half is intentionally minimal; it currently has no host-side state or
// services to offer, but keeps the apply/inject contract so the package loads
// cleanly as a Cordis plugin. If a future version needs host services (e.g.
// settings persistence), extend apply() here.
export function apply(_ctx) {
  // no host-side behavior today
}

export const inject = []
