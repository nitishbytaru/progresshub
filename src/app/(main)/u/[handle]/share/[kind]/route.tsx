import { richCardImage } from "@/lib/og-rich";
import { buildShareCard, isImageKind } from "@/lib/share-cards";
import { getPublicShareData } from "@/lib/share-data";

/**
 * Share images for the streak, rank, gain and milestone cards (1200×630 PNG), shown by X under a
 * /u/<handle>?share=<kind> link. Served at /u/<handle>/share/<kind>?v=<version>.
 */
export async function GET(request: Request, { params }: { params: Promise<{ handle: string; kind: string }> }) {
  const { handle, kind } = await params;
  if (!isImageKind(kind)) return new Response("Not found", { status: 404 });

  const data = await getPublicShareData(handle);
  if (!data) return new Response("Not found", { status: 404 });
  const milestone = Number(new URL(request.url).searchParams.get("m")) || undefined;
  return richCardImage(buildShareCard(kind, data, { milestone }), data);
}
