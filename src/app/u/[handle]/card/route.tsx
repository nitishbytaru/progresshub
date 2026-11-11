import { richCardImage } from "@/lib/og-rich";
import { buildShareCard } from "@/lib/share-cards";
import { getPublicShareData } from "@/lib/share-data";

/**
 * The share card X shows under a progresshub link (1200×630 PNG): the dense "My race to 500K" card.
 * Served at /u/<handle>/card?v=<version>; the version changes whenever the numbers on the card do,
 * so browsers and X fetch a fresh image instead of a cached one.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const data = await getPublicShareData(handle);
  if (!data) return new Response("Not found", { status: 404 });
  return richCardImage(buildShareCard("progress", data), data);
}
