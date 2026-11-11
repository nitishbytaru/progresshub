import { toUTC } from "./progress";

const int = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const fmt = (n: number) => int.format(Math.round(n));
export const fmtCompact = (n: number) => compact.format(n);
export const fmtSigned = (n: number) => `${n >= 0 ? "+" : "−"}${int.format(Math.abs(Math.round(n)))}`;
export const fmtPct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;

const dateFmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" });

const long = dateFmt({ month: "short", day: "numeric", year: "numeric" });
const short = dateFmt({ month: "short", day: "numeric" });

export const fmtDate = (d: string) => long.format(toUTC(d));
export const fmtDateShort = (d: string) => short.format(toUTC(d));
