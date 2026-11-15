import type { SVGProps } from "react";
import {
  Apple,
  Banana,
  Bean,
  Beef,
  CakeSlice,
  Candy,
  Carrot,
  Cherry,
  Citrus,
  Coffee,
  Cookie,
  CookingPot,
  CupSoda,
  Dessert,
  Donut,
  Droplet,
  Drumstick,
  Egg,
  EggFried,
  Fish,
  Flame,
  GlassWater,
  Grape,
  Hamburger,
  IceCreamBowl,
  IceCreamCone,
  Leaf,
  LeafyGreen,
  Milk,
  Nut,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Shrimp,
  Soup,
  Sprout,
  Utensils,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { FOOD_BY_KEY, FOOD_GROUPS, guessFood, type Food, type FoodIconName } from "@/lib/fit-foods";

/**
 * Food icons: a disc in the food's group colour with a rubber-ink line icon on it. Lucide covers most
 * foods; the Indian staples it lacks (roti, rice, dosa, idli, samosa) plus a shaker, bread slice and
 * paneer cube are drawn here on the same 24px grid with a 2px round stroke so they sit in one family.
 */

type Svg = (p: SVGProps<SVGSVGElement>) => React.ReactElement;
const draw =
  (paths: React.ReactNode): Svg =>
  // eslint-disable-next-line react/display-name
  (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
      {paths}
    </svg>
  );

const Roti = draw(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 9.5h.01M14.5 8h.01M15.5 13.5h.01M10 15h.01M12 11.5h.01" strokeWidth={2.6} />
  </>,
);
const Rice = draw(
  <>
    <path d="M3 12h18a9 8 0 0 1-18 0Z" />
    <path d="M6 12c0-3 2.7-5 6-5s6 2 6 5" />
    <path d="M9.5 9h.01M12 8h.01M14.5 9h.01" strokeWidth={2.4} />
    <path d="M9 21h6" />
  </>,
);
const Dosa = draw(
  <>
    <path d="M3 18 18.5 5.5a2.1 2.1 0 0 1 3 3L6 21Z" />
    <path d="M8 14.5l1.8 1.8M11.5 11.5l1.8 1.8M15 8.5l1.8 1.8" />
  </>,
);
const Idli = draw(
  <>
    <path d="M4 11c0-2.8 3.6-5 8-5s8 2.2 8 5Z" />
    <path d="M4 19c0-2.8 3.6-5 8-5s8 2.2 8 5Z" />
  </>,
);
const Samosa = draw(
  <>
    <path d="M12 3 21.5 19.5h-19Z" />
    <path d="M12 3c-1 6 0 11 2.5 16.5" />
  </>,
);
const Shaker = draw(
  <>
    <path d="M8.5 3h7l-.8 3.5H9.3Z" />
    <path d="M7 6.5h10l-1.2 13.6a1 1 0 0 1-1 .9H9.2a1 1 0 0 1-1-.9Z" />
    <path d="M7.6 12h8.8" />
  </>,
);
const Bread = draw(<path d="M6.5 21V11.5A4.5 4.5 0 0 1 7 3h10a4.5 4.5 0 0 1 .5 8.5V21Z" />);
const Paneer = draw(
  <>
    <path d="M3 8 12 3l9 5v8l-9 5-9-5Z" />
    <path d="M3 8l9 5 9-5M12 13v8" />
  </>,
);

const ICONS: Record<FoodIconName, LucideIcon | Svg> = {
  roti: Roti,
  rice: Rice,
  dosa: Dosa,
  idli: Idli,
  samosa: Samosa,
  shaker: Shaker,
  bread: Bread,
  paneer: Paneer,
  apple: Apple,
  banana: Banana,
  beef: Beef,
  cherry: Cherry,
  citrus: Citrus,
  coffee: Coffee,
  cookie: Cookie,
  "cup-soda": CupSoda,
  drumstick: Drumstick,
  egg: Egg,
  "egg-fried": EggFried,
  fish: Fish,
  grape: Grape,
  "ice-cream-bowl": IceCreamBowl,
  "ice-cream-cone": IceCreamCone,
  milk: Milk,
  nut: Nut,
  pizza: Pizza,
  popcorn: Popcorn,
  salad: Salad,
  sandwich: Sandwich,
  soup: Soup,
  wheat: Wheat,
  carrot: Carrot,
  candy: Candy,
  hamburger: Hamburger,
  "cake-slice": CakeSlice,
  donut: Donut,
  leafy: LeafyGreen,
  bean: Bean,
  shrimp: Shrimp,
  dessert: Dessert,
  "cooking-pot": CookingPot,
  glass: GlassWater,
  sprout: Sprout,
  droplet: Droplet,
  flame: Flame,
  leaf: Leaf,
  utensils: Utensils,
};

/** The built-in food behind a logged entry: its key when it came from the list, else a name match. */
export const foodFor = (e: { food_key?: string | null; name: string }): Food | null =>
  (e.food_key ? FOOD_BY_KEY.get(e.food_key) : undefined) ?? guessFood(e.name);

/** A food's icon on its group-coloured disc. `food` null = unknown food (steel disc, fork and knife). */
export function FoodIcon({ food, size = 40, className = "" }: { food: Food | null; size?: number; className?: string }) {
  const Icon = food ? ICONS[food.icon] : Utensils;
  const bg = food ? FOOD_GROUPS[food.group].color : "var(--steel)";
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center rounded-full shadow-[inset_0_0_0_2px_rgb(0_0_0/0.16)] ${className}`}
      style={{ width: size, height: size, background: bg, color: "var(--rubber)" }}
      aria-hidden
    >
      <Icon width={Math.round(size * 0.52)} height={Math.round(size * 0.52)} strokeWidth={2} />
    </span>
  );
}
