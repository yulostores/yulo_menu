// Operating hours as the API stores them: an array of
// { day, isOpen, openTime, closeTime } where the times are HHMM integers
// (900 = 09:00, 2200 = 22:00) — see yulo_backend's models/Restaurant.js `operatingHoursSchema`.
// Ported from yulo_restaurant/src/lib/hours.js — same encoding, same public endpoint.

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function formatHhmm(value) {
  if (value == null) return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const h = Math.floor(n / 100);
  const m = n % 100;
  const suffix = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function hoursForDay(operatingHours, date = new Date()) {
  if (!Array.isArray(operatingHours)) return null;
  const day = WEEKDAYS[date.getDay()];
  return operatingHours.find((h) => h.day === day) ?? null;
}

// "9:00 AM – 10:00 PM" for today, or null when the restaurant has no entry for today or
// is marked closed on it.
export function todayHoursLabel(operatingHours, date = new Date()) {
  const slot = hoursForDay(operatingHours, date);
  if (!slot || slot.isOpen === false) return null;
  const open = formatHhmm(slot.openTime);
  const close = formatHhmm(slot.closeTime);
  return open && close ? `${open} – ${close}` : null;
}

// Whether the restaurant is serving right now. Returns null when there are no hours on
// record — "unknown" is not the same as "closed".
export function isOpenNow(operatingHours, date = new Date()) {
  const slot = hoursForDay(operatingHours, date);
  if (!slot) return null;
  if (slot.isOpen === false) return false;
  if (slot.openTime == null || slot.closeTime == null) return null;

  const now = date.getHours() * 100 + date.getMinutes();
  return slot.closeTime <= slot.openTime
    ? now >= slot.openTime || now < slot.closeTime
    : now >= slot.openTime && now < slot.closeTime;
}
