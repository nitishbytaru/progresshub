import { cookies } from "next/headers";
import { getProfile, getUnit, getWeights } from "@/lib/fit";
import type { FlowGoal } from "@/lib/fit-mascot";
import { LogFab } from "./log-fab";

const isGoal = (v: unknown): v is FlowGoal => v === "lose" || v === "maintain" || v === "gain";

/**
 * Server side of the log flow: a year of logs (so "first chest day" is true: muscle tags only began
 * with this feature), unit and goal (profile first, else the flow's cookie).
 */
export async function LogFabLoader() {
  const [{ today, logs, gymBefore }, profile, unit, jar] = await Promise.all([getWeights(), getProfile(), getUnit(), cookies()]);
  const cookieGoal = jar.get("fit_goal")?.value;
  const goal = profile?.goal ?? (isGoal(cookieGoal) ? cookieGoal : null);
  return <LogFab data={{ today, logs, gymBefore, unit, goal, goalFromProfile: Boolean(profile) }} />;
}
