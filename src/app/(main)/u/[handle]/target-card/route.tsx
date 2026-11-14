import { richCardImage } from "@/lib/og-rich";
import { buildShareCard } from "@/lib/share-cards";
import { getPublicShareData } from "@/lib/share-data";

/**
 * The share card for a creator's 500K deadline (1200×630 PNG), shown by X under a
 * /u/<handle>?target=<date> link. Served at /u/<handle>/target-card?d=<date>&v=<version>.
 */
export async function GET(request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const target = new URL(request.url).searchParams.get("d") ?? "";
  const data = await getPublicShareData(handle);
  if (!data) return new Response("Not found", { status: 404 });
  return richCardImage(buildShareCard("target", data, { target }), data);
}
