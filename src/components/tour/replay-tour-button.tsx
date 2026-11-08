"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TOUR_EVENT } from "./tour";

export function ReplayTourButton() {
  return (
    <Button
      variant="outline"
      onClick={() => window.dispatchEvent(new Event(TOUR_EVENT))}
      className="h-11 shrink-0 gap-2 border-border bg-transparent px-4 text-sm font-semibold text-foreground hover:bg-hover dark:border-border dark:bg-transparent dark:hover:bg-hover"
    >
      <RotateCcw className="size-4" aria-hidden />
      Replay tutorial
    </Button>
  );
}
