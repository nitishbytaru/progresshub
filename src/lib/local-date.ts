// react-day-picker works in local time; logs are plain YYYY-MM-DD calendar days.
// Shared by progresshub and fit.progresshub date pickers.

/** "2026-11-14" → a local Date at midnight. */
export const toLocalDate = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
};

/** A local Date → "2026-11-14". */
export const fromLocalDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
