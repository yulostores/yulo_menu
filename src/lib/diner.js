// This phone's "diner" at the table it scanned — live customer activity. The restaurant's live
// dashboard shows what a diner browses and orders against their table, and the restaurant can
// send them an offer that comes off the table's bill. The backend hands out a guest token for
// one restaurant + table (POST …/tables/:tableId/diner); with live activity off for the
// restaurant it hands out none (`token: null`) and the app works exactly as before.
//
// Nothing here is needed to order or pay: every call that uses it is best-effort.

const DINER_KEY = "yulo_menu_diner";
const OPT_OUT_KEY = "yulo_menu_no_activity";

// Ask again this long after the server said "no token" (the restaurant may turn it on).
const RETRY_NO_TOKEN_MS = 10 * 60 * 1000;
// Renew a token this long before it runs out.
const RENEW_BEFORE_MS = 10 * 60 * 1000;

function read() {
  try {
    return JSON.parse(window.localStorage.getItem(DINER_KEY) ?? "null");
  } catch {
    return null;
  }
}

/** The stored diner for this restaurant + table, if it is still good to use or to wait on. */
export function storedDiner(restaurantId, tableId) {
  const saved = read();
  if (!saved || saved.restaurantId !== restaurantId || saved.tableId !== tableId) return null;
  const now = Date.now();
  if (saved.token) return Date.parse(saved.expiresAt) - RENEW_BEFORE_MS > now ? saved : null;
  return now - (saved.checkedAt ?? 0) < RETRY_NO_TOKEN_MS ? saved : null;
}

export function saveDiner(restaurantId, tableId, { token, expiresAt }) {
  try {
    window.localStorage.setItem(
      DINER_KEY,
      JSON.stringify({ restaurantId, tableId, token: token ?? null, expiresAt: expiresAt ?? null, checkedAt: Date.now() }),
    );
  } catch {
    // storage blocked — the app still works, just without live activity
  }
}

/** The token to send with API calls — only for the table it was issued at, and only while good. */
export function dinerToken() {
  if (hasOptedOut()) return null;
  const saved = read();
  if (!saved?.token || Date.parse(saved.expiresAt) <= Date.now()) return null;
  // Never another table's token: the table in use is TableSessionContext's saved session.
  try {
    const table = JSON.parse(window.localStorage.getItem("yulo_menu_session") ?? "null");
    if (table?.restaurantId !== saved.restaurantId || table?.tableId !== saved.tableId) return null;
  } catch {
    return null;
  }
  return saved.token;
}

/** The server stopped accepting this phone's token (it ran out, or was signed with an old key). */
export function forgetDiner() {
  try {
    window.localStorage.removeItem(DINER_KEY);
  } catch {
    // ignore
  }
}

export function hasOptedOut() {
  try {
    return window.localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setOptedOut() {
  try {
    window.localStorage.setItem(OPT_OUT_KEY, "1");
  } catch {
    // ignore
  }
}
