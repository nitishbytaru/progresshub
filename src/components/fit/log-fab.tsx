"use client";

import { useEffect, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import { Plus } from "lucide-react";
import { LogFlow, type FlowData } from "./log-flow";
import { OPEN_LOG_EVENT } from "./open-log-button";

/** The chalk "+" that opens the load-the-bar flow from any fit page. */
export function LogFab({ data }: { data: FlowData }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_LOG_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_LOG_EVENT, onOpen);
  }, []);
  const loggedToday = data.logs.some((l) => l.day === data.today);
  // reducedMotion="user": motion drops transform animations itself, so server and client render the same markup.
  return (
    <MotionConfig reducedMotion="user">
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={loggedToday ? "Update today's log" : "Log today"}
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92, rotate: 90 }}
        transition={{ type: "spring", stiffness: 380, damping: 18 }}
        className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 inline-flex h-16 items-center gap-2 rounded-full bg-primary px-5 text-primary-foreground shadow-[0_12px_30px_#000b] md:right-8 md:bottom-8"
      >
        <Plus className="size-7" strokeWidth={2.6} aria-hidden />
        <span className="font-display text-xl font-bold uppercase">{loggedToday ? "Update" : "Log"}</span>
        {!loggedToday && (
          <motion.span className="absolute inset-0 rounded-full border-2 border-ink" initial={{ scale: 1, opacity: 0.7 }} animate={{ scale: 1.35, opacity: 0 }} transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.2 }} aria-hidden />
        )}
      </motion.button>
      <LogFlow open={open} onOpenChange={setOpen} data={data} />
    </MotionConfig>
  );
}
