import Link from "next/link";
import { Pencil } from "lucide-react";
import { fmt, fmtDate, fmtSigned, fmtSignedPct, fmtPct, fmtWeekday } from "@/lib/format";
import type { DayRow } from "@/lib/progress";
import { cn } from "@/lib/utils";

function Change({ value, className }: { value: number | null; className?: string }) {
  if (value === null) return <span className={cn("text-paper-muted", className)}>First log</span>;
  const down = value < 0;
  return (
    <span className={cn(down && "text-paper-muted", className)}>
      {down && <span aria-label="down">▼ </span>}
      {fmtSigned(value)}
    </span>
  );
}

/** Newest-first log on a white panel. Mobile gets a stacked list; sm+ gets the full table. */
export function EntriesTable({ rows, limit = 7 }: { rows: DayRow[]; limit?: number }) {
  const recent = [...rows].reverse().slice(0, limit);
  const latestDate = rows[rows.length - 1]?.date;

  return (
    <>
      {/* Mobile list */}
      <ul className="divide-y divide-paper-border sm:hidden">
        {recent.map((r) => (
          <li key={r.date} className="flex items-center gap-3 py-3.5">
            <div className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-paper-dim py-1.5 font-mono leading-tight">
              <span className="text-[10px] uppercase text-paper-muted">{fmtWeekday(r.date)}</span>
              <span className="text-sm font-semibold">{Number(r.date.slice(8))}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-base font-semibold">{fmt(r.total)}</p>
              <p className="text-xs text-paper-muted">
                {r.date === latestDate ? "Latest" : fmtDate(r.date)} · {fmtPct(r.progressPct)} of goal
              </p>
            </div>
            <div className="text-right font-mono">
              <Change value={r.delta} className="block text-sm font-semibold" />
              {r.growthPct !== null && (
                <span className="text-xs text-paper-muted">{fmtSignedPct(r.growthPct, 2)}</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Table */}
      <div className="-mx-2 hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-paper-border text-left text-xs text-paper-muted">
              <th scope="col" className="px-2 py-3 font-medium">Date</th>
              <th scope="col" className="px-2 py-3 text-right font-medium">Total impressions</th>
              <th scope="col" className="px-2 py-3 text-right font-medium">Daily gain</th>
              <th scope="col" className="px-2 py-3 text-right font-medium">Growth</th>
              <th scope="col" className="px-2 py-3 text-right font-medium">Of 500K</th>
              <th scope="col" className="px-2 py-3 text-right font-medium">
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-paper-border font-mono">
            {recent.map((r) => {
              const latest = r.date === latestDate;
              return (
                <tr key={r.date} className="transition-colors hover:bg-paper-dim">
                  <td className="px-2 py-3.5">
                    <span className="flex items-center gap-2">
                      {fmtDate(r.date)}
                      {latest && (
                        <span className="rounded-full bg-primary px-2 py-0.5 font-sans text-[11px] font-semibold text-primary-foreground">
                          Latest
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-2 py-3.5 text-right text-base font-semibold">{fmt(r.total)}</td>
                  <td className="px-2 py-3.5 text-right font-semibold">
                    <Change value={r.delta} />
                  </td>
                  <td className="px-2 py-3.5 text-right text-paper-muted">
                    {r.growthPct === null ? "—" : fmtSignedPct(r.growthPct, 2)}
                  </td>
                  <td className="px-2 py-3.5 text-right">{fmtPct(r.progressPct)}</td>
                  <td className="px-2 py-3.5 text-right">
                    <Link
                      href={`/progress?date=${r.date}`}
                      className="inline-flex size-8 items-center justify-center rounded-lg text-paper-muted transition-colors hover:bg-paper-border hover:text-paper-foreground"
                      aria-label={`Edit log for ${fmtDate(r.date)}`}
                    >
                      <Pencil className="size-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
