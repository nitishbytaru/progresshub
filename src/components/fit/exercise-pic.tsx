import { Dumbbell } from "lucide-react";
import type { Exercise } from "@/lib/fit-exercises";
import { PLATE } from "@/lib/fit-units";

/**
 * An exercise's photo (public-domain free-exercise-db). `move` loops the start and end frames so it
 * shows the movement; otherwise just the start frame. Own exercises without a photo get their muscle's
 * plate colour with a dumbbell.
 */
export function ExercisePic({ ex, move = false, className = "", round = false }: { ex: Exercise; move?: boolean; className?: string; round?: boolean }) {
  const shape = round ? "rounded-full" : "rounded-xl";
  if (!ex.image) {
    return (
      <span className={`relative grid shrink-0 place-items-center overflow-hidden ${shape} ${className}`} style={{ background: PLATE[ex.muscle].fill, color: PLATE[ex.muscle].ink }} aria-hidden>
        <Dumbbell className="size-1/2" />
      </span>
    );
  }
  return (
    <span className={`relative block shrink-0 overflow-hidden bg-white ${shape} ${className}`} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static frames; next/image adds nothing here */}
      <img src={`${ex.image}-0.webp`} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
      {move && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`${ex.image}-1.webp`} alt="" loading="lazy" decoding="async" className="ex-move absolute inset-0 size-full object-cover" />
      )}
    </span>
  );
}
