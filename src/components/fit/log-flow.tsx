"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import { Dialog as D } from "@base-ui/react/dialog";
import { ArrowLeft, CalendarDays, Check, Minus, Moon, Plus, X } from "lucide-react";
import { logWeight } from "@/app/(fit)/fit/actions";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fromLocalDate, toLocalDate } from "@/lib/local-date";
import { VERDICT_MOOD, alertLine, muscleAlert, say, weightVerdict, type FlowGoal, type Mood } from "@/lib/fit-mascot";
import { addDays, weekStart, type FitLog } from "@/lib/fit-stats";
import { KG_PER_LB, MUSCLES, PLATE, UNIT_COOKIE, fmtWeight, fromKg, muscleLabel, type Muscle, type Unit } from "@/lib/fit-units";
import { Barbell } from "./barbell";
import { Dumbo } from "./dumbo";

export type FlowData = { today: string; logs: FitLog[]; gymBefore: number; unit: Unit; goal: FlowGoal | null; goalFromProfile: boolean };

const GOAL_COOKIE = "fit_goal";
/** Remember a choice for a year (module-level so React's render purity rules don't flag it). */
function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}
let seq = 0;
const nextSeed = () => String(++seq);
const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const dShort = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" });
const dWeek = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" });
const STEPS = ["When", "Weight", "Gym", "Muscles"] as const;

/** Per-muscle tile micro-animation (what the tile does when you load that plate). */
const MUSCLE_MOVE: Record<Muscle, Record<string, number[]>> = {
  chest: { scale: [1, 1.14, 0.98, 1] },
  back: { scaleX: [1, 1.18, 0.96, 1] },
  shoulders: { y: [0, -14, 2, 0] },
  biceps: { rotate: [0, -10, 6, 0] },
  triceps: { y: [0, 10, -2, 0] },
  legs: { y: [0, 8, -6, 0], scaleY: [1, 0.9, 1.04, 1] },
};

/**
 * The "load the bar" flow: date → weight → gym → muscles → done, one question at a time, with
 * Dumbo reacting to every answer. Saves through the same logWeight action as the Log form.
 */
export function LogFlow({ open, onOpenChange, data }: { open: boolean; onOpenChange: (o: boolean) => void; data: FlowData }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { today, logs } = data;
  const byDay = useMemo(() => new Map(logs.map((l) => [l.day, l])), [logs]);

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [day, setDay] = useState(today);
  const [unit, setUnit] = useState<Unit>(data.unit);
  const [goal, setGoal] = useState<FlowGoal | null>(data.goal);
  const prevFor = (d: string) => logs.filter((l) => l.day < d).sort((a, b) => b.day.localeCompare(a.day))[0] ?? null;
  const [kg, setKg] = useState<number>(() => byDay.get(today)?.kg ?? prevFor(today)?.kg ?? 70);
  const [revealed, setRevealed] = useState(false);
  const [gym, setGym] = useState<boolean | null>(null);
  const [muscles, setMuscles] = useState<Muscle[]>([]);
  const [mood, setMood] = useState<Mood>("idle");
  const [tint, setTint] = useState("var(--steel)");
  const [speech, setSpeech] = useState(() => say("hello", today));
  const [toast, setToast] = useState<{ text: string; tint: string; id: number } | null>(null);
  const [flipKey, setFlipKey] = useState(0);
  const [blink, setBlink] = useState(false);
  const [done, setDone] = useState<"no" | "saving" | "saved" | "error">("no");
  const [err, setErr] = useState<string | null>(null);
  const [calOpen, setCalOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [pending, start] = useTransition();
  const dirty = useRef(false);
  const shown = useRef<HTMLSpanElement>(null);

  // Blink every few seconds (a living mascot, not a sticker).
  useEffect(() => {
    if (!open || reduce) return;
    const t = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 3800);
    return () => clearInterval(t);
  }, [open, reduce]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  const prev = prevFor(day);
  const delta = prev ? Math.round((kg - prev.kg) * 10) / 10 : null;
  const effGoal: FlowGoal = goal ?? "maintain";
  const verdict = weightVerdict(delta, effGoal);
  const gymNumber = data.gymBefore + logs.filter((l) => l.gym && l.day < day).length + 1;
  const dayLabel = day === today ? "Today" : day === addDays(today, -1) ? "Yesterday" : `${dWeek.format(utc(day))} ${dShort.format(utc(day))}`;

  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
  };

  const reset = () => {
    setStep(0);
    setDay(today);
    setKg(byDay.get(today)?.kg ?? prevFor(today)?.kg ?? 70);
    setRevealed(false);
    setGym(null);
    setMuscles([]);
    setMood("idle");
    setTint("var(--steel)");
    setSpeech(say("hello", nextSeed()));
    setDone("no");
    setErr(null);
    dirty.current = false;
  };

  const close = (force = false) => {
    if (!force && dirty.current && done !== "saved") {
      setConfirmLeave(true);
      setMood("sad");
      return;
    }
    setConfirmLeave(false);
    onOpenChange(false);
    if (done === "saved") router.refresh();
    setTimeout(reset, 300);
  };

  // ---- Step 1: date
  const pickDay = (d: string) => {
    dirty.current = true;
    setDay(d);
    setFlipKey((k) => k + 1);
    const existing = byDay.get(d);
    setKg(existing?.kg ?? prevFor(d)?.kg ?? kg);
    setRevealed(false);
    setGym(existing ? existing.gym : null);
    setMuscles(existing?.muscles ?? []);
    setMood("curious");
    const label = d === today ? "Today" : `${dWeek.format(utc(d))} ${dShort.format(utc(d))}`;
    setSpeech(existing ? say("dateExisting", d, { date: label, kg: `${fmtWeight(existing.kg, unit)} ${unit}` }) : say("date", d, { date: label }));
  };

  // ---- Step 2: weight
  const step01 = unit === "lb" ? 0.1 * KG_PER_LB : 0.1;
  const nudge = (n: number) => {
    dirty.current = true;
    setRevealed(false);
    setKg((v) => Math.min(400, Math.max(20, Math.round((v + n * step01) * 100) / 100)));
    setMood(n < 0 ? "curious" : "thinking");
  };
  const drag = useRef<{ x: number; kg: number } | null>(null);
  const reveal = () => {
    setRevealed(true);
    const v = weightVerdict(delta, effGoal);
    const mood = VERDICT_MOOD[v];
    setMood(mood === "happy" && delta !== null && Math.abs(delta) >= 0.5 ? "flex" : mood);
    setTint("var(--steel)");
    const d = delta === null ? "" : `${Math.abs(fromKg(delta, unit)).toFixed(1)} ${unit}`;
    const key = v === "toward" ? (effGoal === "lose" ? "towardLose" : effGoal === "gain" ? "towardGain" : "towardMaintain") : v;
    setSpeech(say(key, `${day}${kg}`, { d }));
    if (!reduce && prev && shown.current) {
      const el = shown.current;
      animate(fromKg(prev.kg, unit), fromKg(kg, unit), { duration: 0.9, ease: [0.16, 1, 0.3, 1], onUpdate: (x) => (el.textContent = x.toFixed(1)) });
    }
    if (v === "toward" && "vibrate" in navigator) navigator.vibrate?.(12);
  };

  // ---- Step 3: gym
  const chooseGym = (g: boolean) => {
    dirty.current = true;
    setGym(g);
    if (g) {
      setMood("flex");
      setSpeech(say("gymYes", day, { n: gymNumber }));
    } else {
      setMood("sleepy");
      setMuscles([]);
      setSpeech(say("rest", day));
    }
  };

  // ---- Step 4: muscles
  const toggleMuscle = (m: Muscle) => {
    dirty.current = true;
    const on = muscles.includes(m);
    const next = on ? muscles.filter((x) => x !== m) : [...muscles, m];
    setMuscles(next);
    if (on) {
      setTint(next.length ? PLATE[next.at(-1)!].fill : "var(--steel)");
      setMood(next.length ? "proud" : "curious");
      return;
    }
    setTint(PLATE[m].fill);
    const alert = muscleAlert(logs, day, m);
    if (alert && (alert.kind === "twice" || alert.kind === "thrice" || alert.kind === "yesterday")) {
      setMood("sore");
      const text = alertLine(alert, `${day}${m}`);
      setSpeech(say("ouch", `${day}${m}`));
      setToast({ text, tint: PLATE[m].fill, id: seq++ });
      if ("vibrate" in navigator) navigator.vibrate?.([20, 40, 20]);
    } else if (alert) {
      setMood(alert.mood);
      setSpeech(alertLine(alert, `${day}${m}`));
    } else {
      setMood("flex");
      setSpeech(say(`pick_${m}` as const, `${day}${m}`));
    }
  };

  // ---- Save
  const save = () => {
    setDone("saving");
    setMood("thinking");
    setSpeech(say("saving", day));
    setDir(1);
    setStep(4);
    start(async () => {
      const fd = new FormData();
      fd.set("day", day);
      fd.set("kg", fromKg(kg, unit).toFixed(unit === "lb" ? 1 : 2));
      fd.set("unit", unit);
      fd.set("gym", gym ? "on" : "off");
      muscles.forEach((m) => fd.append("muscle", m));
      let r: Awaited<ReturnType<typeof logWeight>>;
      try {
        r = await logWeight(null, fd);
      } catch {
        r = { error: "No connection. Check your internet and try again." };
      }
      if (r?.error) {
        setDone("error");
        setErr(r.error);
        setMood("sad");
        setSpeech(say("error", day));
        return;
      }
      setDone("saved");
      setMood("proud");
      setTint(muscles.length ? PLATE[muscles[0]].fill : "var(--steel)");
      setSpeech(say("saved", `${day}${nextSeed()}`));
      if ("vibrate" in navigator) navigator.vibrate?.([15, 30, 40]);
    });
  };

  const setGoalCookie = (g: FlowGoal) => {
    setGoal(g);
    writeCookie(GOAL_COOKIE, g);
    setRevealed(false);
  };
  const setUnitCookie = (u: Unit) => {
    setUnit(u);
    writeCookie(UNIT_COOKIE, u);
  };

  // Week bar for the finale: saved gym days this week + this entry.
  const mon = weekStart(day);
  const finaleDays = Array.from({ length: 7 }, (_, i) => addDays(mon, i)).flatMap((d) => {
    if (d === day) return gym ? [{ day: d, muscles: MUSCLES.filter((m) => muscles.includes(m)), kg }] : [];
    const l = byDay.get(d);
    return l?.gym ? [{ day: d, muscles: l.muscles, kg: l.kg }] : [];
  });

  const strip = Array.from({ length: 14 }, (_, i) => addDays(today, -i));
  const canNext = step === 0 ? true : step === 1 ? true : step === 2 ? gym !== null : true;
  const primaryLabel = step === 1 && !revealed ? "Weigh in" : step === 2 && gym === false ? "Log rest day" : step === 3 ? (muscles.length ? "Load the bar" : "Skip muscles") : "Next";
  const onPrimary = () => {
    if (step === 0) {
      go(1);
      setMood("curious");
      setSpeech(byDay.get(day) ? say("dateExisting", day, { date: dayLabel, kg: `${fmtWeight(byDay.get(day)!.kg, unit)} ${unit}` }) : say("weighIn", day));
    } else if (step === 1) {
      if (!revealed) return reveal();
      go(2);
      setMood("curious");
      setSpeech(say("gymAsk", day));
    } else if (step === 2) {
      if (gym === false) return save();
      go(3);
      setMood("curious");
      setSpeech(say("muscles", day));
    } else if (step === 3) save();
  };

  const variants = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { x: d * 60, opacity: 0, filter: "blur(6px)" }),
    center: { x: 0, opacity: 1, filter: "blur(0px)" },
    exit: (d: number) => (reduce ? { opacity: 0 } : { x: d * -60, opacity: 0, filter: "blur(6px)" }),
  };

  return (
    <D.Root open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <D.Portal>
        <D.Backdrop className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <D.Popup className="fit-floor fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background outline-none md:inset-y-6 md:left-1/2 md:w-[560px] md:-translate-x-1/2 md:rounded-3xl md:border md:border-outline-variant">
          {/* In-flow leave confirm (no browser dialog). */}
          <AnimatePresence>
            {confirmLeave && (
              <motion.div
                role="alertdialog"
                aria-label="Leave without logging?"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-background/95 px-6 text-center backdrop-blur-sm"
              >
                <Dumbo mood="sad" tint={tint} size={170} />
                <p className="font-display text-3xl font-bold uppercase">Leaving already?</p>
                <p className="max-w-[30ch] text-ink-variant">Your entry isn&apos;t saved yet. The bar stays empty.</p>
                <div className="flex w-full max-w-sm gap-2">
                  <button type="button" onClick={() => close(true)} className="h-12 flex-1 rounded-full border border-outline font-bold text-ink-variant hover:bg-hover hover:text-ink">
                    Leave
                  </button>
                  <button
                    type="button"
                    autoFocus
                    onClick={() => {
                      setConfirmLeave(false);
                      setMood("happy");
                    }}
                    className="h-12 flex-1 rounded-full bg-primary font-bold text-primary-foreground hover:bg-primary-hover"
                  >
                    Keep logging
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top bar: back, progress plates, close */}
          <div className="sticky top-0 z-10 flex items-center gap-3 bg-background/90 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 backdrop-blur-md">
            <button
              type="button"
              aria-label="Back"
              disabled={step === 0 || step === 4}
              onClick={() => go(step - 1)}
              className="grid size-11 place-items-center rounded-full text-ink-variant hover:bg-hover hover:text-ink disabled:invisible"
            >
              <ArrowLeft className="size-5" aria-hidden />
            </button>
            <ol className="flex flex-1 items-center gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={Math.min(step + 1, 4)} aria-label="Logging progress">
              {STEPS.map((s, i) => (
                <li key={s} className="flex flex-1 flex-col items-center gap-1">
                  <span className="relative h-2 w-full overflow-hidden rounded-full bg-track">
                    <motion.span
                      className={`absolute inset-y-0 left-0 rounded-full bg-ink ${i === step - 1 && !reduce ? "animate-[clank-shake_0.4s_ease-out]" : ""}`}
                      initial={false}
                      animate={{ width: i < step || step === 4 ? "100%" : i === step ? "35%" : "0%" }}
                      transition={{ type: "spring", stiffness: 220, damping: 22 }}
                    />
                  </span>
                  <span className={`text-[0.6875rem] font-bold ${i <= step ? "text-ink" : "text-ink-subtle"}`}>{s}</span>
                </li>
              ))}
            </ol>
            <D.Close
              aria-label="Close"
              onClick={(e) => {
                e.preventDefault();
                close();
              }}
              className="grid size-11 place-items-center rounded-full text-ink-variant hover:bg-hover hover:text-ink"
            >
              <X className="size-5" aria-hidden />
            </D.Close>
          </div>

          {/* Dumbo + speech */}
          <div className="flex flex-col items-center px-6 pt-2">
            <div className="relative">
              <Dumbo mood={mood} tint={tint} blink={blink} size={190} />
            </div>
            <div aria-live="polite" className="relative mt-1 min-h-14 max-w-sm">
              <AnimatePresence mode="wait">
                <motion.p
                  key={speech}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  className="relative rounded-2xl border border-outline-variant bg-surface px-4 py-2.5 text-center text-base font-semibold before:absolute before:-top-[7px] before:left-1/2 before:size-3 before:-translate-x-1/2 before:rotate-45 before:border-t before:border-l before:border-outline-variant before:bg-surface"
                >
                  {speech}
                </motion.p>
              </AnimatePresence>
            </div>
            {/* Drop-in alert (overtraining etc.): floats under the speech, over the step heading, so the
                tiles never move under the user's finger and Dumbo's reaction stays visible. */}
            <div className="relative h-0 w-full max-w-md">
              <AnimatePresence>
                {toast && (
                  <motion.p
                    key={toast.id}
                    role="status"
                    initial={reduce ? { opacity: 0 } : { y: -18, opacity: 0, rotate: -2 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={reduce ? { opacity: 0 } : { y: -10, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 20 }}
                    className="absolute inset-x-0 top-3 z-20 flex items-center gap-3 rounded-2xl border border-outline bg-surface-high px-4 py-3 text-sm font-semibold shadow-[0_14px_30px_#000a]"
                  >
                    <span className="size-3 shrink-0 rounded-full ring-2 ring-black/30" style={{ background: toast.tint }} aria-hidden />
                    {toast.text}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Steps */}
          <div className="relative flex flex-1 flex-col px-5 pt-5 pb-4">
            <AnimatePresence mode="popLayout" custom={dir} initial={false}>
              <motion.section
                key={step}
                custom={dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-5"
              >
                {step === 0 && (
                  <>
                    <h2 className="font-display text-4xl font-bold uppercase">When was this?</h2>
                    <div className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-2" role="radiogroup" aria-label="Pick a day">
                      {strip.map((d) => {
                        const on = d === day;
                        const logged = byDay.get(d);
                        return (
                          <motion.button
                            key={on ? `${d}-${flipKey}` : d}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => pickDay(d)}
                            initial={on && !reduce && flipKey ? { rotateY: -180, y: -18 } : false}
                            animate={{ rotateY: 0, y: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                            style={{ transformPerspective: 600 } as CSSProperties}
                            className={`flex h-24 w-16 shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-2xl border transition-colors ${
                              on ? "border-ink bg-primary text-primary-foreground" : "border-outline text-ink-variant hover:bg-hover"
                            }`}
                          >
                            <span className="text-[0.6875rem] font-bold uppercase">{d === today ? "Today" : dWeek.format(utc(d))}</span>
                            <span className="font-display text-3xl leading-none font-bold">{utc(d).getUTCDate()}</span>
                            <span className={`size-1.5 rounded-full ${logged ? (on ? "bg-primary-foreground" : "bg-ink") : "bg-transparent"}`} aria-hidden />
                          </motion.button>
                        );
                      })}
                    </div>
                    <Popover open={calOpen} onOpenChange={setCalOpen}>
                      <PopoverTrigger className="inline-flex h-11 w-fit items-center gap-2 rounded-full border border-outline px-4 text-sm font-bold text-ink-variant hover:bg-hover hover:text-ink">
                        <CalendarDays className="size-4" aria-hidden /> Older date
                      </PopoverTrigger>
                      <PopoverContent align="start" className="z-[70] w-auto p-1">
                        <Calendar
                          mode="single"
                          required
                          weekStartsOn={1}
                          today={toLocalDate(today)}
                          selected={toLocalDate(day)}
                          defaultMonth={toLocalDate(day)}
                          disabled={[{ after: toLocalDate(today) }, { before: toLocalDate(addDays(today, -365)) }]}
                          modifiers={{ logged: logs.map((l) => toLocalDate(l.day)) }}
                          modifiersClassNames={{ logged: "[&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:size-1 [&>button]:after:rounded-full [&>button]:after:bg-current" }}
                          className="bg-transparent [--cell-size:--spacing(10)]"
                          onSelect={(d) => {
                            if (!d) return;
                            pickDay(fromLocalDate(d));
                            setCalOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </>
                )}

                {step === 1 && (
                  <>
                    <div className="flex items-end justify-between gap-3">
                      <h2 className="font-display text-4xl font-bold uppercase">Step on the scale</h2>
                      <div role="radiogroup" aria-label="Weight unit" className="flex h-11 shrink-0 rounded-full border border-outline p-1">
                        {(["kg", "lb"] as const).map((u) => (
                          <button key={u} type="button" role="radio" aria-checked={unit === u} onClick={() => setUnitCookie(u)} className={`min-w-12 rounded-full px-3 text-sm font-bold ${unit === u ? "bg-primary text-primary-foreground" : "text-ink-subtle hover:text-ink"}`}>
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-3">
                      <motion.p
                        key={`${revealed}-${verdict}`}
                        initial={false}
                        animate={revealed && !reduce ? (verdict === "away" ? { scaleY: [1, 0.86, 1.04, 1], scaleX: [1, 1.08, 0.98, 1] } : verdict === "toward" ? { y: [0, -10, 0], scale: [1, 1.06, 1] } : {}) : {}}
                        transition={{ duration: 0.6 }}
                        className="font-display text-8xl leading-none font-bold tabular-nums"
                      >
                        <span ref={shown}>{fromKg(kg, unit).toFixed(1)}</span>
                        <span className="ml-1 text-3xl text-ink-subtle">{unit}</span>
                      </motion.p>

                      {/* Scale dial: drag sideways or use ± */}
                      <div className="flex w-full items-center gap-2">
                        <button type="button" aria-label={`0.1 ${unit} less`} onClick={() => nudge(-1)} className="grid size-12 shrink-0 place-items-center rounded-full border border-outline text-ink-variant hover:bg-hover hover:text-ink">
                          <Minus className="size-5" aria-hidden />
                        </button>
                        <div
                          role="slider"
                          tabIndex={0}
                          aria-label="Weight"
                          aria-valuenow={Number(fromKg(kg, unit).toFixed(1))}
                          aria-valuetext={`${fromKg(kg, unit).toFixed(1)} ${unit}`}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowRight" || e.key === "ArrowUp") nudge(e.shiftKey ? 10 : 1);
                            if (e.key === "ArrowLeft" || e.key === "ArrowDown") nudge(e.shiftKey ? -10 : -1);
                          }}
                          onPointerDown={(e) => {
                            e.currentTarget.setPointerCapture(e.pointerId);
                            drag.current = { x: e.clientX, kg };
                          }}
                          onPointerMove={(e) => {
                            if (!drag.current) return;
                            const steps = Math.round((drag.current.x - e.clientX) / 9);
                            dirty.current = true;
                            setRevealed(false);
                            setKg(Math.min(400, Math.max(20, Math.round((drag.current.kg + steps * step01) * 100) / 100)));
                          }}
                          onPointerUp={() => (drag.current = null)}
                          className="relative h-16 flex-1 cursor-ew-resize touch-none overflow-hidden rounded-2xl border border-outline bg-surface select-none"
                        >
                          <div className="absolute inset-y-0 left-1/2 flex items-end" style={{ transform: `translateX(${-(fromKg(kg, unit) * 10 - Math.round(fromKg(kg, unit) * 10)) * 9}px)` }}>
                            {Array.from({ length: 61 }, (_, i) => i - 30).map((t) => {
                              const val = Math.round(fromKg(kg, unit) * 10) + t;
                              const major = val % 10 === 0;
                              return (
                                <span key={t} className="absolute bottom-0 flex flex-col items-center" style={{ left: `${t * 9}px` }}>
                                  {major && <span className="absolute bottom-9 -translate-x-1/2 font-display text-xs font-bold text-ink-subtle">{val / 10}</span>}
                                  <span className={`block w-px ${major ? "h-7 bg-ink-variant" : val % 5 === 0 ? "h-5 bg-ink-subtle" : "h-3 bg-ink-subtle/60"}`} />
                                </span>
                              );
                            })}
                          </div>
                          <span className="absolute inset-y-2 left-1/2 w-1 -translate-x-1/2 rounded-full bg-ink" aria-hidden />
                        </div>
                        <button type="button" aria-label={`0.1 ${unit} more`} onClick={() => nudge(1)} className="grid size-12 shrink-0 place-items-center rounded-full border border-outline text-ink-variant hover:bg-hover hover:text-ink">
                          <Plus className="size-5" aria-hidden />
                        </button>
                      </div>

                      <AnimatePresence>
                        {revealed && delta !== null && (
                          <motion.span
                            initial={reduce ? { opacity: 0 } : { opacity: 0, y: delta < 0 ? -30 : 30, scale: 0.6 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: "spring", stiffness: 320, damping: 14 }}
                            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-display text-2xl font-bold ${verdict === "toward" ? "bg-primary text-primary-foreground" : "border border-outline text-ink"}`}
                          >
                            {delta > 0 ? "▲" : delta < 0 ? "▼" : "="} {Math.abs(fromKg(delta, unit)).toFixed(1)} {unit}
                            <span className="text-sm font-semibold opacity-70">since {dShort.format(utc(prev!.day))}</span>
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {revealed && verdict === "toward" && !reduce && <ChalkBurst />}
                    </div>

                    {!data.goalFromProfile && (
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold tracking-[0.14em] text-ink-subtle uppercase">Your goal (so I know how to react)</span>
                        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Goal">
                          {(
                            [
                              ["lose", "Cut"],
                              ["maintain", "Maintain"],
                              ["gain", "Bulk"],
                            ] as const
                          ).map(([g, l]) => (
                            <button key={g} type="button" role="radio" aria-checked={effGoal === g} onClick={() => setGoalCookie(g)} className={`h-11 rounded-full border text-sm font-bold ${effGoal === g ? "border-ink bg-primary text-primary-foreground" : "border-outline text-ink-variant hover:bg-hover"}`}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {step === 2 && (
                  <>
                    <h2 className="font-display text-4xl font-bold uppercase">Did you train?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { v: true, label: "Hit the gym", sub: `Gym day ${gymNumber}`, Icon: PlateStack },
                        { v: false, label: "Rest day", sub: "Recovery counts", Icon: Moon },
                      ].map(({ v, label, sub, Icon }) => {
                        const on = gym === v;
                        return (
                          <motion.button
                            key={label}
                            type="button"
                            aria-pressed={on}
                            onClick={() => chooseGym(v)}
                            whileTap={reduce ? undefined : { scale: 0.95 }}
                            animate={on && !reduce ? { y: [0, -8, 0] } : { y: 0 }}
                            className={`flex h-40 flex-col items-start justify-between rounded-3xl border p-4 text-left transition-colors ${on ? "border-ink bg-primary text-primary-foreground" : "border-outline bg-surface hover:bg-hover"}`}
                          >
                            <Icon className="size-8" aria-hidden />
                            <span>
                              <span className="block font-display text-2xl font-bold uppercase">{label}</span>
                              <span className={`text-sm ${on ? "text-primary-foreground/70" : "text-ink-subtle"}`}>{sub}</span>
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <h2 className={`font-display text-4xl font-bold uppercase transition-opacity duration-200 ${toast ? "opacity-0" : ""}`}>What did you hit?</h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {MUSCLES.map((m) => {
                        const on = muscles.includes(m);
                        return (
                          <motion.button
                            key={m}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleMuscle(m)}
                            whileTap={reduce ? undefined : { scale: 0.94 }}
                            className={`relative flex h-28 flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border transition-colors ${on ? "border-ink bg-surface-high" : "border-outline bg-surface hover:bg-hover"}`}
                          >
                            <motion.span
                              key={on ? `${m}-on` : m}
                              initial={false}
                              animate={on && !reduce ? MUSCLE_MOVE[m] : {}}
                              transition={{ duration: 0.55, ease: "easeOut" }}
                              className="grid size-14 place-items-center rounded-full font-display text-lg font-bold"
                              style={on ? { background: PLATE[m].fill, color: PLATE[m].ink } : { boxShadow: `inset 0 0 0 4px ${PLATE[m].fill}` }}
                            >
                              {on && <Check className="size-6" aria-hidden />}
                            </motion.span>
                            {on && !reduce && (
                              <motion.span
                                className="pointer-events-none absolute top-1/2 left-1/2 size-14 -translate-x-1/2 -translate-y-[60%] rounded-full border-2"
                                style={{ borderColor: PLATE[m].fill }}
                                initial={{ scale: 1, opacity: 0.9 }}
                                animate={{ scale: 2.6, opacity: 0 }}
                                transition={{ duration: 0.7, ease: "easeOut" }}
                              />
                            )}
                            <span className="text-sm font-bold">{muscleLabel(m)}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </>
                )}

                {step === 4 && (
                  <div className="flex flex-col items-center gap-5 text-center">
                    <h2 className="font-display text-4xl font-bold uppercase">{done === "saved" ? "Bar loaded" : done === "error" ? "Missed rep" : "Loading the bar…"}</h2>
                    {done === "saved" && (
                      <>
                        <div className="w-full">
                          <Barbell days={finaleDays} unit={unit} />
                        </div>
                        <ul className="flex flex-wrap justify-center gap-2">
                          <li className="rounded-full border border-outline px-3 py-1.5 text-sm font-bold">{dayLabel}</li>
                          <li className="rounded-full border border-outline px-3 py-1.5 font-display text-lg font-bold">
                            {fromKg(kg, unit).toFixed(1)} {unit}
                            {delta !== null && delta !== 0 && <span className="ml-1 text-sm text-ink-subtle">{delta > 0 ? "▲" : "▼"}{Math.abs(fromKg(delta, unit)).toFixed(1)}</span>}
                          </li>
                          {gym && <li className="rounded-full bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground">Gym day {gymNumber}</li>}
                          {muscles.map((m) => (
                            <li key={m} className="inline-flex items-center gap-1.5 rounded-full border border-outline px-3 py-1.5 text-sm font-bold">
                              <span className="size-2.5 rounded-full" style={{ background: PLATE[m].fill }} aria-hidden />
                              {muscleLabel(m)}
                            </li>
                          ))}
                        </ul>
                        {!reduce && <ChalkBurst big />}
                      </>
                    )}
                    {done === "error" && <p className="text-sm text-ink-variant">{err}</p>}
                  </div>
                )}
              </motion.section>
            </AnimatePresence>
          </div>

          {/* Primary action */}
          <div className="sticky bottom-0 bg-background/95 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
            {step < 4 ? (
              <motion.button
                type="button"
                disabled={!canNext || pending}
                onClick={onPrimary}
                whileTap={reduce ? undefined : { scale: 0.97 }}
                className="h-14 w-full rounded-full bg-primary text-lg font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-40"
              >
                {primaryLabel}
              </motion.button>
            ) : done === "saved" ? (
              <div className="flex gap-2">
                <a href="/log#sets" className="inline-flex h-14 flex-1 items-center justify-center rounded-full border border-outline font-bold text-ink-variant hover:bg-hover hover:text-ink" onClick={() => close(true)}>
                  Log sets
                </a>
                <button type="button" onClick={() => close(true)} className="h-14 flex-1 rounded-full bg-primary text-lg font-bold text-primary-foreground hover:bg-primary-hover">
                  Done
                </button>
              </div>
            ) : done === "error" ? (
              <button type="button" onClick={save} className="h-14 w-full rounded-full bg-primary text-lg font-bold text-primary-foreground hover:bg-primary-hover">
                Try again
              </button>
            ) : (
              <div className="h-14" />
            )}
          </div>
        </D.Popup>
      </D.Portal>
    </D.Root>
  );
}

/** A burst of chalk squares (celebration in palette: chalk only). */
function ChalkBurst({ big = false }: { big?: boolean }) {
  const n = big ? 26 : 16;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center" aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        const r = (big ? 170 : 120) + (i % 3) * 18;
        return (
          <motion.span
            key={i}
            className="absolute size-2 rounded-[2px] bg-ink"
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
            animate={{ x: Math.cos(a) * r, y: Math.sin(a) * r + 40, opacity: 0, rotate: 180 + i * 20, scale: 0.6 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: (i % 5) * 0.02 }}
          />
        );
      })}
    </div>
  );
}

/** Three plates edge-on: the gym-day icon (a second dumbbell would echo Dumbo). */
function PlateStack({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      {[6, 13, 20].map((x, i) => (
        <rect key={x} x={x} y={4 + i * 2} width={5} height={24 - i * 4} rx={1.5} fill="currentColor" opacity={1 - i * 0.25} />
      ))}
      <rect x={2} y={15} width={28} height={2} rx={1} fill="currentColor" />
    </svg>
  );
}
