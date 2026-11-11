/**
 * Renders the dense share card (components/share/rich-card.tsx) as the static 1200×630 PNG X shows
 * under a progresshub link. Server-only. Avatars are inlined as data URLs first, so a slow or
 * missing photo falls back to an initial instead of breaking the image.
 */
import { ImageResponse } from "next/og";
import { RichCard } from "@/components/share/rich-card";
import { OG_CACHE, OG_SIZE, ogFonts } from "./og";
import { getOrigin } from "./public";
import { buildRichCard } from "./rich-card";
import type { ShareCard, ShareData } from "./share-cards";

const AVATAR_TIMEOUT_MS = 2500;

async function inline(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(AVATAR_TIMEOUT_MS) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(png|jpe?g|webp|gif)/.test(type)) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

/** The card's PNG, or a 404 when the card is locked for this creator. */
export async function richCardImage(card: ShareCard, data: ShareData): Promise<Response> {
  const site = (await getOrigin()).replace(/^https?:\/\//, "");
  const props = buildRichCard(card, data, site);
  if (!props) return new Response("Not found", { status: 404 });

  const [fonts, avatarUrl, racers] = await Promise.all([
    ogFonts(),
    inline(props.avatarUrl),
    Promise.all(props.racers.map(async (r) => ({ ...r, avatarUrl: await inline(r.avatarUrl) }))),
  ]);

  return new ImageResponse(<RichCard p={{ ...props, avatarUrl, racers }} />, {
    ...OG_SIZE,
    fonts,
    headers: { "Cache-Control": OG_CACHE },
  });
}
