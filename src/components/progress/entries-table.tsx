import { EditEntryDialog } from "@/components/progress/edit-entry-dialog";
import { fmt, fmtDate, fmtSigned, fmtSignedPct, fmtPct, fmtWeekday } from "@/lib/format";
import type { DayRow, Entry } from "@/lib/progress";
import { cn } from "@/lib/utils";

function Change({ value, className }: { value: number | null; className?: string }) {
  if (value === null) return <span className={cn("text-muted-foreground", className)}>First log</span>;
  const down = value < 0;
  return (
    <span className={cn(down && "text-muted-foreground", className)}>
      {down && <span aria-label="down">▼ </span>}
      {fmtSigned(value)}
    </span>
  );
}

/** Newest-first log on a white panel. Mobile gets a stacked list; sm+ gets the full table. */
type Props = {
  rows: DayRow[];
  limit?: number;
  /** The viewer's today, for the edit dialog's date rules. */
  today: string;
  onSaved?: (entry: Entry) => void;
};

export function EntriesTable({ rows, limit = 7, today, onSaved }: Props) {
  const recent = [...rows].reverse().slice(0, limit);
  const latestDate = rows[rows.length - 1]?.date;
  const entries = rows.map(({ date, total }) => ({ date, total }));
  const edit = (date: string) => <EditEntryDialog date={date} entries={entries} today={today} onSaved={onSaved} />;

  return (
    <>
      {/* Mobile list */}
      <ul className="divide-y divide-hairline sm:hidden">
        {recent.map((r) => (
          <li key={r.date} className="flex items-center gap-3 py-3.5">
            <div className="flex w-11 shrink-0 flex-col items-center rounded-lg border border-border py-1.5 font-mono leading-tight">
              <span className="text-[10px] uppercase text-muted-foreground">{fmtWeekday(r.date)}</span>
              <span className="text-sm font-semibold">{Number(r.date.slice(8))}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-base font-semibold">{fmt(r.total)}</p>
              <p className="text-xs text-muted-foreground">
                {r.date === latestDate ? "Latest" : fmtDate(r.date)} · {fmtPct(r.progressPct)} of goal
              </p>
            </div>
            <div className="text-right font-mono">
              <Change value={r.delta} className="block text-sm font-semibold" />
              {r.growthPct !== null && (
                <span className="text-xs text-muted-foreground">{fmtSignedPct(r.growthPct, 2)}</span>
              )}
            </div>
            <div className="-mr-1 shrink-0">{edit(r.date)}</div>
          </li>
        ))}
      </ul>

      {/* Table */}
      <div className="-mx-2 hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs text-muted-foreground">
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
          <tbody className="divide-y divide-hairline font-mono">
            {recent.map((r) => {
              const latest = r.date === latestDate;
              return (
                <tr key={r.date} className="transition-colors hover:bg-hover">
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
                  <td className="px-2 py-3.5 text-right text-muted-foreground">
                    {r.growthPct === null ? "—" : fmtSignedPct(r.growthPct, 2)}
                  </td>
                  <td className="px-2 py-3.5 text-right">{fmtPct(r.progressPct)}</td>
                  <td className="px-2 py-3.5 text-right">
                    {edit(r.date)}
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
