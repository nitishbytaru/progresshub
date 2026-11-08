import "server-only";
import { getPublicProgress } from "./public";
import type { ShareData } from "./share-cards";

/** A public creator's numbers in the shape every share card reads (see lib/share-cards.ts). */
export async function getPublicShareData(handle: string): Promise<ShareData | null> {
  const data = await getPublicProgress(handle);
  if (!data) return null;
  return {
    handle: data.profile.handle,
    rows: data.rows,
    latest: data.latest,
    streak: data.streak,
    rank: data.rank,
    eta: data.eta,
    today: new Date().toISOString().slice(0, 10),
  };
}
