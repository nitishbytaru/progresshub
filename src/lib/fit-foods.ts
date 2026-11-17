/**
 * Built-in food list for the fit diary and meal planner. Values are typical per stated serving
 * (home-style Indian portions plus everyday and gym foods), rounded; good for tracking, not lab exact.
 * Client-safe: no I/O.
 */

export type Diet = "vegan" | "veg" | "egg" | "nonveg";
export type Meal = "breakfast" | "lunch" | "dinner" | "snack" | "custom";
/** The four everyday meals (the planner and coach plan these; "custom" is an optional extra in the diary). */
export type CoreMeal = Exclude<Meal, "custom">;

export type Food = {
  key: string;
  name: string;
  serving: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Dietary fiber per serving, g (typical values; 0 for meat, eggs, dairy, plain drinks). */
  fiber: number;
  diet: Diet;
  /** Meals this food usually belongs to (b l d s). */
  meals: CoreMeal[];
  /** Role in a plate, used by the meal planner. */
  role: "main" | "protein" | "side" | "snack" | "drink" | "fruit";
  /** Usual amount in servings (liquids are per 100 ml, so a 250 ml glass is 2.5). */
  portion: number;
  /** Food group: colours the icon disc and drives the Browse filters. */
  group: FoodGroup;
  /** Icon drawn on the disc (see components/fit/food-icon.tsx). */
  icon: FoodIconName;
};

export type FoodGroup = "grains" | "dals" | "dairy" | "eggs" | "meat" | "veg" | "fruit" | "nuts" | "snacks" | "protein" | "drinks" | "sweets";

export type FoodIconName =
  | "roti" | "rice" | "dosa" | "idli" | "samosa" | "shaker" | "bread" | "paneer"
  | "apple" | "banana" | "beef" | "cherry" | "citrus" | "coffee" | "cookie" | "cup-soda" | "drumstick" | "egg" | "egg-fried"
  | "fish" | "grape" | "ice-cream-bowl" | "ice-cream-cone" | "milk" | "nut" | "pizza" | "popcorn" | "salad" | "sandwich"
  | "soup" | "wheat" | "carrot" | "candy" | "hamburger" | "cake-slice" | "donut" | "leafy" | "bean" | "shrimp" | "dessert"
  | "cooking-pot" | "glass" | "sprout" | "droplet" | "flame" | "leaf" | "utensils";

/** Food groups: label, data colour (CSS var from fit.css, rubber ink on top) and the default icon. */
export const FOOD_GROUPS: Record<FoodGroup, { label: string; color: string; icon: FoodIconName }> = {
  grains: { label: "Grains", color: "var(--food-grains)", icon: "roti" },
  dals: { label: "Dals", color: "var(--food-dals)", icon: "soup" },
  dairy: { label: "Dairy", color: "var(--food-dairy)", icon: "milk" },
  eggs: { label: "Eggs", color: "var(--food-eggs)", icon: "egg" },
  meat: { label: "Meat & fish", color: "var(--food-meat)", icon: "drumstick" },
  veg: { label: "Veg", color: "var(--food-veg)", icon: "leafy" },
  fruit: { label: "Fruit", color: "var(--food-fruit)", icon: "apple" },
  nuts: { label: "Nuts & seeds", color: "var(--food-nuts)", icon: "nut" },
  snacks: { label: "Snacks", color: "var(--food-snacks)", icon: "cookie" },
  protein: { label: "Protein", color: "var(--food-protein)", icon: "shaker" },
  drinks: { label: "Drinks", color: "var(--food-drinks)", icon: "glass" },
  sweets: { label: "Sweets", color: "var(--food-sweets)", icon: "dessert" },
};
export const GROUP_ORDER: FoodGroup[] = ["grains", "dals", "dairy", "eggs", "meat", "veg", "fruit", "nuts", "snacks", "protein", "drinks", "sweets"];

/** Per-food icons where the group default doesn't fit. */
const ICON: Record<string, FoodIconName> = {
  // grains
  "rice-white": "rice", "rice-brown": "rice", "jeera-rice": "rice", "veg-pulao": "rice", "veg-biryani": "rice", "chicken-biryani": "rice",
  "egg-biryani": "rice", "mutton-biryani": "rice", "curd-rice": "rice", "lemon-rice": "rice", "khichdi": "rice", "dal-rice": "rice", "quinoa": "rice",
  "fried-rice-veg": "rice", "chicken-fried-rice": "rice", "pongal": "rice", "upma": "rice", "poha": "rice",
  "oats": "wheat", "muesli": "wheat", "oats-milk": "ice-cream-bowl", "cornflakes-milk": "ice-cream-bowl",
  "bread-white": "bread", "bread-brown": "bread", "idli": "idli", "dosa-plain": "dosa", "masala-dosa": "dosa", "pesarattu": "dosa",
  "vada": "donut", "dhokla": "cake-slice", "pasta-veg": "cooking-pot", "maggi": "cooking-pot", "veg-noodles": "cooking-pot",
  // dals
  "sprouts": "sprout", "sprouts-chaat": "sprout", "chickpeas-boiled": "bean", "chana-masala": "bean", "rajma": "bean", "hummus": "bean",
  "soya-chunks": "bean", "soya-curry": "bean", "tofu": "paneer", "tempeh": "paneer",
  // nuts & seeds
  "chia": "sprout", "flax": "sprout", "pumpkin-seeds": "sprout", "sunflower-seeds": "sprout", "sesame-seeds": "sprout", "makhana": "popcorn", "roasted-chana": "bean",
  // dairy
  "curd": "ice-cream-bowl", "greek-yogurt": "ice-cream-bowl", "raita": "ice-cream-bowl", "buttermilk": "glass", "lassi-sweet": "glass",
  "paneer": "paneer", "paneer-bhurji": "paneer", "palak-paneer": "soup", "paneer-butter-masala": "soup", "paneer-tikka": "paneer",
  "cottage-cheese-low": "paneer", "cheese-slice": "paneer", "butter": "droplet", "ghee": "droplet", "soy-milk": "milk",
  // eggs
  "omelette-2": "egg-fried", "egg-bhurji": "egg-fried", "egg-curry": "soup", "french-toast": "bread",
  // meat & fish
  "chicken-curry": "soup", "butter-chicken": "soup", "chicken-sandwich": "sandwich", "chicken-wrap": "sandwich", "fish-curry": "fish",
  "fish-fry": "fish", "salmon": "fish", "tuna-can": "fish", "prawns": "shrimp", "mutton-curry": "beef", "keema": "beef",
  // veg
  "salad-green": "salad", "cucumber": "salad", "sweet-potato": "carrot", "potato-boiled": "carrot", "corn-boiled": "popcorn",
  "veg-soup": "soup", "chicken-soup": "soup", "pickle": "flame", "papad": "roti", "coconut-chutney": "leaf", "green-chutney": "leaf",
  // fruit
  "banana": "banana", "orange": "citrus", "papaya": "citrus", "mango": "apple", "watermelon": "citrus", "grapes": "grape",
  "pomegranate": "grape", "pineapple": "citrus", "dates": "bean", "berries": "cherry",
  // snacks
  "protein-bar": "cookie", "dark-chocolate": "candy", "samosa": "samosa", "pakora": "flame", "bhel": "salad", "pani-puri": "donut",
  "pav-bhaji": "sandwich", "vada-pav": "hamburger", "chole-bhature": "roti", "veg-sandwich": "sandwich", "burger-veg": "hamburger",
  "pizza-slice": "pizza", "french-fries": "flame", "chips": "popcorn", "rusk": "bread",
  // drinks
  "tea-milk": "coffee", "coffee-milk": "coffee", "black-coffee": "coffee", "green-tea": "coffee", "orange-juice": "cup-soda",
  "soft-drink": "cup-soda", "banana-shake": "milk", "coconut-water": "glass",
  // sweets
  "kheer": "ice-cream-bowl", "ice-cream": "ice-cream-cone", "honey": "droplet", "sugar": "candy",
};

type Row = [key: string, name: string, serving: string, grams: number, kcal: number, p: number, c: number, f: number, diet: Diet, meals: string, role: Food["role"], group: FoodGroup];

const M: Record<string, CoreMeal> = { b: "breakfast", l: "lunch", d: "dinner", s: "snack" };

// prettier-ignore
const ROWS: Row[] = [
  // Breads & grains
  ["roti", "Roti / chapati", "1 pc", 40, 104, 3.1, 18, 2.5, "vegan", "bld", "main", "grains"],
  ["phulka", "Phulka (no ghee)", "1 pc", 30, 80, 2.7, 16, 0.4, "vegan", "ld", "main", "grains"],
  ["paratha-plain", "Plain paratha", "1 pc", 60, 210, 4.5, 28, 9, "veg", "bld", "main", "grains"],
  ["aloo-paratha", "Aloo paratha", "1 pc", 120, 290, 6, 40, 12, "veg", "bl", "main", "grains"],
  ["paneer-paratha", "Paneer paratha", "1 pc", 130, 330, 12, 36, 15, "veg", "bl", "main", "grains"],
  ["naan", "Naan", "1 pc", 90, 260, 8, 45, 5, "veg", "ld", "main", "grains"],
  ["butter-naan", "Butter naan", "1 pc", 100, 320, 8, 46, 11, "veg", "ld", "main", "grains"],
  ["puri", "Puri", "1 pc", 25, 100, 1.6, 11, 5.5, "vegan", "b", "main", "grains"],
  ["bhatura", "Bhatura", "1 pc", 80, 300, 6, 38, 14, "veg", "l", "main", "grains"],
  ["rice-white", "White rice (cooked)", "100 g", 100, 128, 2.7, 28.1, 0.3, "vegan", "ld", "main", "grains"],
  ["rice-brown", "Brown rice (cooked)", "1 cup", 195, 215, 5, 45, 1.8, "vegan", "ld", "main", "grains"],
  ["jeera-rice", "Jeera rice", "1 cup", 170, 250, 4.5, 46, 5.5, "vegan", "ld", "main", "grains"],
  ["veg-pulao", "Veg pulao", "1 cup", 180, 270, 5.5, 44, 8, "vegan", "ld", "main", "grains"],
  ["veg-biryani", "Veg biryani", "1 plate", 250, 390, 8, 60, 13, "veg", "ld", "main", "grains"],
  ["chicken-biryani", "Chicken biryani", "1 plate", 300, 520, 26, 62, 18, "nonveg", "ld", "main", "grains"],
  ["egg-biryani", "Egg biryani", "1 plate", 280, 450, 16, 60, 15, "egg", "ld", "main", "grains"],
  ["mutton-biryani", "Mutton biryani", "1 plate", 300, 560, 24, 60, 24, "nonveg", "ld", "main", "grains"],
  ["curd-rice", "Curd rice", "1 cup", 200, 230, 7, 36, 6, "veg", "ld", "main", "grains"],
  ["lemon-rice", "Lemon rice", "1 cup", 180, 260, 4.5, 44, 7.5, "vegan", "l", "main", "grains"],
  ["khichdi", "Moong dal khichdi", "1 cup", 200, 240, 9, 40, 5, "vegan", "ld", "main", "grains"],
  // 250 g plate = 100 g toor dal (40%) + 150 g cooked white rice (60%), summed from those two rows.
  ["dal-rice", "Dal rice (40% dal · 60% rice)", "1 plate", 250, 287, 9.6, 56.2, 2.5, "vegan", "ld", "main", "grains"],
  ["quinoa", "Quinoa (cooked)", "1 cup", 185, 222, 8, 39, 3.6, "vegan", "ld", "main", "grains"],
  ["oats", "Oats (dry)", "40 g", 40, 150, 5.3, 27, 2.6, "vegan", "b", "main", "grains"],
  ["oats-milk", "Oats with milk", "1 bowl", 250, 270, 11, 40, 7, "veg", "b", "main", "grains"],
  ["muesli", "Muesli", "50 g", 50, 190, 5, 33, 4, "vegan", "b", "main", "grains"],
  ["cornflakes-milk", "Cornflakes with milk", "1 bowl", 230, 240, 8, 42, 4.5, "veg", "b", "main", "grains"],
  ["bread-white", "White bread", "1 slice", 28, 75, 2.5, 14, 1, "vegan", "bs", "main", "grains"],
  ["bread-brown", "Brown / whole wheat bread", "1 slice", 30, 80, 3.6, 13, 1.1, "vegan", "bs", "main", "grains"],
  ["poha", "Poha", "1 plate", 180, 270, 5, 45, 7.5, "vegan", "b", "main", "grains"],
  ["upma", "Upma", "1 plate", 200, 290, 7, 42, 10, "vegan", "b", "main", "grains"],
  ["idli", "Idli", "1 pc", 40, 58, 2, 12, 0.4, "vegan", "bs", "main", "grains"],
  ["dosa-plain", "Plain dosa", "1 pc", 90, 170, 4, 28, 4.5, "vegan", "bd", "main", "grains"],
  ["masala-dosa", "Masala dosa", "1 pc", 180, 360, 7, 50, 15, "vegan", "bl", "main", "grains"],
  ["uttapam", "Uttapam", "1 pc", 140, 250, 6, 38, 8, "vegan", "bd", "main", "grains"],
  ["pesarattu", "Pesarattu (moong dosa)", "1 pc", 110, 180, 9, 26, 5, "vegan", "b", "main", "grains"],
  ["vada", "Medu vada", "1 pc", 50, 150, 4, 14, 9, "vegan", "bs", "snack", "grains"],
  ["pongal", "Ven pongal", "1 cup", 200, 300, 8, 42, 11, "veg", "b", "main", "grains"],
  ["dhokla", "Dhokla", "1 pc", 40, 65, 2.5, 10, 1.8, "vegan", "bs", "snack", "grains"],
  ["thepla", "Methi thepla", "1 pc", 45, 130, 3.5, 18, 5, "veg", "bs", "main", "grains"],
  ["pasta-veg", "Veg pasta", "1 plate", 250, 380, 11, 60, 10, "veg", "ld", "main", "grains"],
  ["maggi", "Instant noodles", "1 pack", 70, 310, 7, 45, 12, "veg", "s", "main", "grains"],
  ["veg-noodles", "Veg hakka noodles", "1 plate", 250, 400, 9, 60, 13, "vegan", "ld", "main", "grains"],
  ["fried-rice-veg", "Veg fried rice", "1 plate", 250, 410, 8, 66, 12, "vegan", "ld", "main", "grains"],
  ["chicken-fried-rice", "Chicken fried rice", "1 plate", 280, 480, 22, 64, 15, "nonveg", "ld", "main", "grains"],

  // Dals & legumes
  ["dal-toor", "Toor dal", "1 bowl", 200, 190, 11, 28, 4, "vegan", "ld", "protein", "dals"],
  ["dal-moong", "Moong dal", "1 bowl", 200, 170, 11, 25, 3, "vegan", "ld", "protein", "dals"],
  ["dal-masoor", "Masoor dal", "1 bowl", 200, 180, 12, 26, 3.5, "vegan", "ld", "protein", "dals"],
  ["dal-tadka", "Dal tadka", "1 bowl", 200, 230, 11, 28, 8, "vegan", "ld", "protein", "dals"],
  ["dal-makhani", "Dal makhani", "1 bowl", 200, 330, 12, 30, 18, "veg", "ld", "protein", "dals"],
  ["chana-masala", "Chana masala", "1 bowl", 200, 290, 12, 38, 10, "vegan", "ld", "protein", "dals"],
  ["rajma", "Rajma", "1 bowl", 200, 260, 13, 36, 7, "vegan", "ld", "protein", "dals"],
  ["sambar", "Sambar", "1 bowl", 200, 140, 6, 20, 4, "vegan", "bld", "side", "dals"],
  ["sprouts", "Moong sprouts", "1 cup", 100, 105, 7.5, 18, 0.5, "vegan", "bs", "protein", "dals"],
  ["sprouts-chaat", "Sprouts chaat", "1 bowl", 150, 160, 9, 24, 3, "vegan", "s", "protein", "dals"],
  ["chickpeas-boiled", "Boiled chickpeas", "1 cup", 160, 270, 14.5, 45, 4.2, "vegan", "ls", "protein", "dals"],
  ["hummus", "Hummus", "2 tbsp", 30, 80, 2.4, 6, 5.3, "vegan", "s", "side", "dals"],
  ["soya-chunks", "Soya chunks (dry)", "30 g", 30, 105, 15.6, 9.9, 0.2, "vegan", "ld", "protein", "dals"],
  ["soya-curry", "Soya chunk curry", "1 bowl", 200, 230, 20, 16, 9, "vegan", "ld", "protein", "dals"],
  ["tofu", "Tofu (firm)", "100 g", 100, 145, 15.8, 3.5, 8.7, "vegan", "ld", "protein", "dals"],
  ["tempeh", "Tempeh", "100 g", 100, 195, 20, 7.6, 11, "vegan", "ld", "protein", "dals"],
  ["peanuts", "Peanuts (roasted)", "30 g", 30, 170, 7.5, 5, 14.5, "vegan", "s", "snack", "nuts"],
  ["peanut-butter", "Peanut butter", "1 tbsp", 16, 95, 3.5, 3.5, 8, "vegan", "bs", "side", "nuts"],

  // Dairy & paneer
  ["milk-toned", "Toned milk", "100 ml", 100, 60, 3.2, 4.8, 3, "veg", "bs", "drink", "dairy"],
  ["milk-skim", "Skimmed milk", "100 ml", 100, 36, 3.4, 5, 0.1, "veg", "bs", "drink", "dairy"],
  ["milk-full", "Full cream milk", "100 ml", 100, 66, 3.2, 4.8, 3.6, "veg", "bs", "drink", "dairy"],
  ["curd", "Curd / dahi", "1 bowl", 150, 90, 5, 7, 4.5, "veg", "lds", "side", "dairy"],
  ["greek-yogurt", "Greek yogurt (plain)", "150 g", 150, 145, 15, 6, 6.5, "veg", "bs", "protein", "dairy"],
  ["raita", "Raita", "1 bowl", 150, 100, 4.5, 8, 5, "veg", "ld", "side", "dairy"],
  ["buttermilk", "Buttermilk / chaas", "100 ml", 100, 24, 1.4, 2, 1, "veg", "ls", "drink", "dairy"],
  ["lassi-sweet", "Sweet lassi", "100 ml", 100, 92, 2.8, 14.4, 2.4, "veg", "s", "drink", "dairy"],
  ["paneer", "Paneer", "100 g", 100, 265, 18, 3.5, 20, "veg", "ld", "protein", "dairy"],
  ["paneer-bhurji", "Paneer bhurji", "1 bowl", 150, 330, 19, 8, 25, "veg", "bld", "protein", "dairy"],
  ["palak-paneer", "Palak paneer", "1 bowl", 200, 300, 14, 12, 22, "veg", "ld", "protein", "dairy"],
  ["paneer-butter-masala", "Paneer butter masala", "1 bowl", 200, 410, 15, 16, 32, "veg", "ld", "protein", "dairy"],
  ["paneer-tikka", "Paneer tikka", "1 pc", 25, 55, 3.5, 1.3, 4, "veg", "ds", "protein", "dairy"],
  ["cottage-cheese-low", "Low-fat paneer", "100 g", 100, 180, 20, 4, 9, "veg", "ld", "protein", "dairy"],
  ["cheese-slice", "Cheese slice", "1 slice", 20, 65, 4, 1, 5, "veg", "bs", "side", "dairy"],
  ["butter", "Butter", "1 tsp", 5, 36, 0, 0, 4, "veg", "b", "side", "dairy"],
  ["ghee", "Ghee", "1 tsp", 5, 45, 0, 0, 5, "veg", "ld", "side", "dairy"],
  ["whey", "Whey protein", "1 scoop", 32, 125, 24, 3, 1.8, "veg", "bs", "protein", "protein"],
  ["whey-milk", "Whey shake with milk", "100 ml", 100, 96.4, 11.4, 5.4, 3.2, "veg", "bs", "protein", "protein"],
  ["plant-protein", "Plant protein powder", "1 scoop", 33, 125, 22, 4, 2.5, "vegan", "bs", "protein", "protein"],
  ["yeast-protein", "Yeast protein powder", "1 scoop", 33, 125, 25, 3, 1.5, "vegan", "bs", "protein", "protein"],
  ["soy-milk", "Soy milk (unsweetened)", "100 ml", 100, 40, 3.2, 1.6, 2, "vegan", "bs", "drink", "dairy"],

  // Eggs
  ["egg-boiled", "Boiled egg", "1 pc", 50, 78, 6.3, 0.6, 5.3, "egg", "bs", "protein", "eggs"],
  ["egg-white", "Boiled egg white", "1 pc", 33, 17, 3.6, 0.2, 0.1, "egg", "bs", "protein", "eggs"],
  ["omelette-2", "Omelette (2 eggs)", "1 pc", 120, 190, 13, 2, 14, "egg", "b", "protein", "eggs"],
  ["egg-bhurji", "Egg bhurji (2 eggs)", "1 plate", 130, 210, 13, 4, 16, "egg", "bd", "protein", "eggs"],
  ["egg-curry", "Egg curry (2 eggs)", "1 bowl", 220, 280, 14, 10, 20, "egg", "ld", "protein", "eggs"],
  ["french-toast", "French toast", "1 slice", 65, 150, 5.5, 16, 7, "egg", "b", "main", "eggs"],

  // Chicken, fish, meat
  ["chicken-breast", "Chicken breast (grilled)", "100 g", 100, 165, 31, 0, 3.6, "nonveg", "ld", "protein", "meat"],
  ["chicken-curry", "Chicken curry", "1 bowl", 220, 320, 26, 8, 20, "nonveg", "ld", "protein", "meat"],
  ["butter-chicken", "Butter chicken", "1 bowl", 220, 440, 28, 12, 31, "nonveg", "ld", "protein", "meat"],
  ["tandoori-chicken", "Tandoori chicken", "1 pc", 100, 150, 20, 2, 6.5, "nonveg", "ld", "protein", "meat"],
  ["chicken-tikka", "Chicken tikka", "1 pc", 25, 38.3, 5.7, 0.7, 1.3, "nonveg", "ds", "protein", "meat"],
  ["chicken-65", "Chicken 65", "1 plate", 150, 360, 24, 14, 23, "nonveg", "s", "protein", "meat"],
  ["chicken-sandwich", "Grilled chicken sandwich", "1 pc", 200, 380, 28, 36, 13, "nonveg", "ls", "main", "meat"],
  ["chicken-wrap", "Chicken wrap", "1 pc", 220, 430, 28, 42, 16, "nonveg", "ls", "main", "meat"],
  ["fish-curry", "Fish curry", "1 bowl", 220, 280, 25, 8, 16, "nonveg", "ld", "protein", "meat"],
  ["fish-fry", "Fish fry", "1 pc", 120, 260, 22, 6, 16, "nonveg", "ld", "protein", "meat"],
  ["salmon", "Salmon (cooked)", "100 g", 100, 206, 22, 0, 12, "nonveg", "ld", "protein", "meat"],
  ["tuna-can", "Tuna (canned in water)", "100 g", 100, 116, 26, 0, 1, "nonveg", "ls", "protein", "meat"],
  ["prawns", "Prawn curry", "1 bowl", 200, 260, 24, 8, 14, "nonveg", "ld", "protein", "meat"],
  ["mutton-curry", "Mutton curry", "1 bowl", 220, 420, 30, 8, 30, "nonveg", "ld", "protein", "meat"],
  ["keema", "Chicken keema", "1 bowl", 180, 330, 27, 8, 21, "nonveg", "ld", "protein", "meat"],

  // Vegetables & sides
  ["mixed-veg", "Mixed veg sabzi", "1 bowl", 150, 140, 3.5, 14, 8, "vegan", "ld", "side", "veg"],
  ["aloo-gobi", "Aloo gobi", "1 bowl", 150, 170, 3.5, 20, 9, "vegan", "ld", "side", "veg"],
  ["bhindi", "Bhindi fry", "1 bowl", 150, 160, 3, 12, 11, "vegan", "ld", "side", "veg"],
  ["baingan-bharta", "Baingan bharta", "1 bowl", 150, 150, 3, 12, 10, "vegan", "ld", "side", "veg"],
  ["palak", "Palak sabzi", "1 bowl", 150, 110, 4, 8, 7, "vegan", "ld", "side", "veg"],
  ["aloo-sabzi", "Aloo sabzi", "1 bowl", 150, 190, 3, 26, 9, "vegan", "ld", "side", "veg"],
  ["cabbage-poriyal", "Cabbage poriyal", "1 bowl", 150, 110, 2.5, 10, 7, "vegan", "ld", "side", "veg"],
  ["salad-green", "Green salad", "1 bowl", 150, 35, 1.8, 7, 0.3, "vegan", "ld", "side", "veg"],
  ["cucumber", "Cucumber", "1 cup", 120, 18, 0.8, 4, 0.1, "vegan", "lds", "side", "veg"],
  ["broccoli", "Broccoli (steamed)", "1 cup", 150, 50, 4, 10, 0.5, "vegan", "ld", "side", "veg"],
  ["sweet-potato", "Sweet potato (boiled)", "1 pc (medium)", 150, 130, 2.4, 30, 0.2, "vegan", "ls", "side", "veg"],
  ["potato-boiled", "Boiled potato", "1 pc (medium)", 150, 130, 3, 30, 0.2, "vegan", "ld", "side", "veg"],
  ["corn-boiled", "Sweet corn (boiled)", "1 cup", 150, 145, 5, 32, 2, "vegan", "s", "snack", "veg"],
  ["veg-soup", "Veg soup", "1 bowl", 250, 90, 3, 14, 2.5, "vegan", "ds", "side", "veg"],
  ["chicken-soup", "Chicken clear soup", "1 bowl", 250, 110, 12, 6, 4, "nonveg", "ds", "side", "veg"],
  ["pickle", "Pickle", "1 tbsp", 15, 30, 0.2, 1, 2.8, "vegan", "ld", "side", "veg"],
  ["papad", "Roasted papad", "1 pc", 12, 40, 3, 7, 0.3, "vegan", "ld", "side", "veg"],
  ["coconut-chutney", "Coconut chutney", "2 tbsp", 40, 90, 1, 3, 8.5, "vegan", "b", "side", "veg"],
  ["green-chutney", "Mint chutney", "2 tbsp", 30, 20, 0.6, 3, 0.5, "vegan", "lds", "side", "veg"],

  // Fruit
  ["banana", "Banana", "1 pc (medium)", 118, 105, 1.3, 27, 0.4, "vegan", "bs", "fruit", "fruit"],
  ["apple", "Apple", "1 pc (medium)", 182, 95, 0.5, 25, 0.3, "vegan", "bs", "fruit", "fruit"],
  ["orange", "Orange", "1 pc (medium)", 130, 62, 1.2, 15, 0.2, "vegan", "bs", "fruit", "fruit"],
  ["papaya", "Papaya", "1 cup", 145, 62, 0.7, 16, 0.4, "vegan", "bs", "fruit", "fruit"],
  ["mango", "Mango", "1 cup", 165, 99, 1.4, 25, 0.6, "vegan", "s", "fruit", "fruit"],
  ["watermelon", "Watermelon", "1 cup", 152, 46, 0.9, 11.5, 0.2, "vegan", "s", "fruit", "fruit"],
  ["grapes", "Grapes", "1 cup", 150, 104, 1.1, 27, 0.2, "vegan", "s", "fruit", "fruit"],
  ["pomegranate", "Pomegranate seeds", "1 cup", 174, 144, 2.9, 32, 2, "vegan", "bs", "fruit", "fruit"],
  ["guava", "Guava", "1 pc (medium)", 100, 68, 2.6, 14, 1, "vegan", "s", "fruit", "fruit"],
  ["pineapple", "Pineapple", "1 cup", 165, 82, 0.9, 22, 0.2, "vegan", "s", "fruit", "fruit"],
  ["dates", "Dates", "1 pc", 8, 22.3, 0.2, 6, 0, "vegan", "s", "fruit", "fruit"],
  ["berries", "Mixed berries", "1 cup", 150, 70, 1, 17, 0.5, "vegan", "bs", "fruit", "fruit"],

  // Nuts, seeds & snacks
  ["almonds", "Almonds", "1 pc", 1.2, 7, 0.2, 0.3, 0.6, "vegan", "bs", "snack", "nuts"],
  ["walnuts", "Walnut halves", "1 pc", 3.5, 23, 0.5, 0.5, 2.3, "vegan", "s", "snack", "nuts"],
  ["cashews", "Cashews", "1 pc", 1.5, 8.5, 0.3, 0.5, 0.7, "vegan", "s", "snack", "nuts"],
  ["mixed-nuts", "Mixed nuts", "30 g", 30, 180, 5, 6, 16, "vegan", "s", "snack", "nuts"],
  ["chia", "Chia seeds", "1 tbsp", 12, 58, 2, 5, 3.7, "vegan", "b", "side", "nuts"],
  ["flax", "Flax seeds", "1 tbsp", 10, 55, 1.9, 3, 4.3, "vegan", "b", "side", "nuts"],
  // Per 100 g (roasted, USDA): pumpkin 574 kcal · 29.8 P · 14.7 C · 49 F · 6.5 fiber; sunflower 584 · 20.8 · 20 · 51.5 · 8.6; sesame 573 · 17.7 · 23.5 · 49.7 · 11.8.
  ["pumpkin-seeds", "Pumpkin seeds (pepitas)", "1 tbsp", 10, 57, 3, 1.5, 4.9, "vegan", "bs", "side", "nuts"],
  ["sunflower-seeds", "Sunflower seeds", "1 tbsp", 10, 58, 2.1, 2, 5.2, "vegan", "bs", "side", "nuts"],
  ["sesame-seeds", "Sesame seeds (til)", "1 tbsp", 9, 52, 1.6, 2.1, 4.5, "vegan", "b", "side", "nuts"],
  ["makhana", "Roasted makhana", "1 cup", 30, 110, 3, 20, 1.5, "vegan", "s", "snack", "nuts"],
  ["roasted-chana", "Roasted chana", "30 g", 30, 110, 6.5, 18, 1.8, "vegan", "s", "snack", "nuts"],
  ["protein-bar", "Protein bar", "1 pc", 60, 220, 20, 22, 7, "veg", "s", "snack", "protein"],
  ["granola-bar", "Granola bar", "1 pc", 40, 180, 3, 28, 6, "vegan", "s", "snack", "snacks"],
  ["dark-chocolate", "Dark chocolate", "1 pc", 10, 57.5, 0.8, 4.5, 4.2, "vegan", "s", "snack", "snacks"],
  ["samosa", "Samosa", "1 pc", 100, 260, 4, 30, 14, "vegan", "s", "snack", "snacks"],
  ["pakora", "Veg pakora", "1 pc", 20, 58, 1.2, 5.2, 3.6, "vegan", "s", "snack", "snacks"],
  ["bhel", "Bhel puri", "1 plate", 150, 250, 6, 40, 8, "vegan", "s", "snack", "snacks"],
  ["pani-puri", "Pani puri", "1 pc", 20, 36.7, 0.7, 5.7, 1.3, "vegan", "s", "snack", "snacks"],
  ["pav-bhaji", "Pav bhaji", "1 plate", 300, 500, 12, 66, 21, "veg", "ld", "main", "snacks"],
  ["vada-pav", "Vada pav", "1 pc", 150, 300, 7, 42, 12, "vegan", "s", "main", "snacks"],
  ["chole-bhature", "Chole bhature", "1 plate", 350, 650, 18, 80, 28, "veg", "l", "main", "snacks"],
  ["veg-sandwich", "Veg sandwich", "1 pc", 180, 290, 9, 40, 10, "veg", "bs", "main", "snacks"],
  ["burger-veg", "Veg burger", "1 pc", 200, 420, 11, 52, 18, "veg", "ls", "main", "snacks"],
  ["pizza-slice", "Pizza slice", "1 slice", 110, 285, 12, 36, 10, "veg", "ls", "main", "snacks"],
  ["french-fries", "French fries", "1 medium pack", 117, 365, 4, 48, 17, "vegan", "s", "snack", "snacks"],
  ["chips", "Potato chips", "1 small pack", 28, 150, 2, 15, 10, "vegan", "s", "snack", "snacks"],
  ["biscuits", "Biscuits", "1 pc", 10, 47.5, 0.7, 7, 1.9, "veg", "s", "snack", "snacks"],
  ["rusk", "Rusk", "1 pc", 10, 40, 1.2, 7, 0.8, "veg", "bs", "snack", "snacks"],

  // Drinks & sweets
  ["tea-milk", "Tea with milk & sugar", "100 ml", 100, 53.3, 1.3, 8, 1.7, "veg", "bs", "drink", "drinks"],
  ["coffee-milk", "Coffee with milk & sugar", "100 ml", 100, 60, 2, 8, 2, "veg", "bs", "drink", "drinks"],
  ["black-coffee", "Black coffee", "100 ml", 100, 0.8, 0.1, 0, 0, "vegan", "bs", "drink", "drinks"],
  ["green-tea", "Green tea", "100 ml", 100, 0.8, 0, 0, 0, "vegan", "bs", "drink", "drinks"],
  ["coconut-water", "Coconut water", "100 ml", 100, 18.8, 0.7, 3.8, 0.2, "vegan", "s", "drink", "drinks"],
  ["orange-juice", "Orange juice", "100 ml", 100, 44.8, 0.7, 10.4, 0.2, "vegan", "bs", "drink", "drinks"],
  ["soft-drink", "Soft drink", "100 ml", 100, 42.4, 0, 10.6, 0, "vegan", "s", "drink", "drinks"],
  ["banana-shake", "Banana milkshake", "100 ml", 100, 100, 3.3, 16, 2.7, "veg", "bs", "drink", "drinks"],
  ["gulab-jamun", "Gulab jamun", "1 pc", 50, 150, 2, 22, 6, "veg", "s", "snack", "sweets"],
  ["rasgulla", "Rasgulla", "1 pc", 50, 125, 2.5, 26, 1.5, "veg", "s", "snack", "sweets"],
  ["kheer", "Kheer", "1 bowl", 150, 230, 6, 34, 8, "veg", "s", "snack", "sweets"],
  ["ice-cream", "Ice cream", "1 scoop", 66, 140, 2.4, 16, 7.3, "veg", "s", "snack", "sweets"],
  ["jalebi", "Jalebi", "1 pc", 25, 90, 0.5, 15, 3.5, "veg", "s", "snack", "sweets"],
  ["honey", "Honey", "1 tbsp", 21, 64, 0.1, 17, 0, "veg", "b", "side", "sweets"],
  ["sugar", "Sugar", "1 tsp", 4, 16, 0, 4, 0, "vegan", "b", "side", "sweets"],
];

/** Fiber per serving (g). Anything not listed has ~0 (meat, eggs, plain dairy, oils, plain drinks). */
const FIBER: Record<string, number> = { "roti": 2.4, "phulka": 1.8, "paratha-plain": 2.4, "aloo-paratha": 3.5, "paneer-paratha": 3, "naan": 2, "butter-naan": 2, "puri": 0.6, "bhatura": 1.5, "rice-white": 0.4, "rice-brown": 3.5, "jeera-rice": 0.9, "veg-pulao": 2, "veg-biryani": 3.5, "chicken-biryani": 2, "egg-biryani": 2, "mutton-biryani": 2, "curd-rice": 0.6, "lemon-rice": 1, "khichdi": 4, "dal-rice": 3.1, "quinoa": 5.2, "oats": 4.2, "oats-milk": 4, "muesli": 4, "cornflakes-milk": 1, "bread-white": 0.7, "bread-brown": 1.9, "poha": 2, "upma": 2.5, "idli": 0.8, "dosa-plain": 1.2, "masala-dosa": 3, "uttapam": 2.5, "pesarattu": 4, "vada": 2, "pongal": 2.5, "dhokla": 1, "thepla": 2, "pasta-veg": 4, "maggi": 1, "veg-noodles": 3, "fried-rice-veg": 2.5, "chicken-fried-rice": 2, "dal-toor": 5, "dal-moong": 4.5, "dal-masoor": 5, "dal-tadka": 5, "dal-makhani": 6, "chana-masala": 9, "rajma": 9, "sambar": 4, "sprouts": 1.8, "sprouts-chaat": 4, "chickpeas-boiled": 12.5, "hummus": 1.8, "soya-chunks": 4, "soya-curry": 6, "tofu": 1, "tempeh": 1.5, "peanuts": 2.6, "peanut-butter": 1.5, "raita": 0.5, "paneer-bhurji": 1, "palak-paneer": 3, "paneer-butter-masala": 2, "paneer-tikka": 0.3, "whey": 0.5, "plant-protein": 1.5, "yeast-protein": 1, "soy-milk": 0.4, "omelette-2": 0.3, "egg-bhurji": 1, "egg-curry": 2, "french-toast": 0.6, "chicken-curry": 1.5, "butter-chicken": 1.5, "tandoori-chicken": 0.3, "chicken-tikka": 0.1, "chicken-65": 0.8, "chicken-sandwich": 3, "chicken-wrap": 3, "fish-curry": 1.5, "fish-fry": 0.5, "prawns": 1.5, "mutton-curry": 1.5, "keema": 1.5, "mixed-veg": 4, "aloo-gobi": 3.5, "bhindi": 4.5, "baingan-bharta": 4.5, "palak": 3.5, "aloo-sabzi": 2.5, "cabbage-poriyal": 3, "salad-green": 3, "cucumber": 0.6, "broccoli": 5, "sweet-potato": 4.5, "potato-boiled": 3, "corn-boiled": 4, "veg-soup": 2.5, "chicken-soup": 0.5, "pickle": 0.5, "papad": 1, "coconut-chutney": 2.5, "green-chutney": 1, "banana": 3.1, "apple": 4.4, "orange": 3.1, "papaya": 2.5, "mango": 2.6, "watermelon": 0.6, "grapes": 1.4, "pomegranate": 7, "guava": 5.4, "pineapple": 2.3, "dates": 0.6, "berries": 4, "almonds": 0.15, "walnuts": 0.2, "cashews": 0.05, "mixed-nuts": 2.5, "chia": 4.1, "flax": 2.8, "pumpkin-seeds": 0.7, "sunflower-seeds": 0.9, "sesame-seeds": 1.1, "makhana": 2, "roasted-chana": 5, "protein-bar": 5, "granola-bar": 2, "dark-chocolate": 1.1, "samosa": 2.5, "pakora": 0.6, "bhel": 3, "pani-puri": 0.5, "pav-bhaji": 7, "vada-pav": 3, "chole-bhature": 9, "veg-sandwich": 4, "burger-veg": 3, "pizza-slice": 2, "french-fries": 4, "chips": 1.2, "biscuits": 0.2, "rusk": 0.3, "coconut-water": 0.4, "orange-juice": 0.2, "banana-shake": 0.5, "gulab-jamun": 0.2, "kheer": 0.5, "ice-cream": 0.5, "jalebi": 0.1 };

/** Usual portions for per-100 ml / per-100 g foods: a glass of milk is 250 ml = 2.5, a plate of rice 150 g = 1.5. */
const PORTION: Record<string, number> = { "rice-white": 1.5, "milk-toned": 2.5, "milk-skim": 2.5, "milk-full": 2.5, "buttermilk": 2.5, "lassi-sweet": 2.5, "whey-milk": 2.8, "soy-milk": 2.5, "tea-milk": 1.5, "coffee-milk": 1.5, "black-coffee": 2.4, "green-tea": 2.4, "coconut-water": 2.4, "orange-juice": 2.5, "soft-drink": 3.3, "banana-shake": 3 };

export const FOODS: Food[] = ROWS.map(([key, name, serving, grams, kcal, protein, carbs, fat, diet, meals, role, group]) => ({
  key,
  name,
  serving,
  grams,
  kcal,
  protein,
  carbs,
  fat,
  fiber: FIBER[key] ?? 0,
  diet,
  meals: [...meals].map((ch) => M[ch]),
  role,
  portion: PORTION[key] ?? 1,
  group,
  icon: ICON[key] ?? FOOD_GROUPS[group].icon,
}));

export const FOOD_BY_KEY = new Map(FOODS.map((f) => [f.key, f]));

/** Liquids are measured in ml ("250 ml"). */
export const isLiquid = (serving: string) => /^\d+(\.\d+)? ml\b/.test(serving);

/** Stepper step in servings: 1 for counted items, 0.5 for the rest (on "100 ml" that is 50 ml). */
export const servingStep = (serving: string) => (isCountable(serving) ? 1 : 0.5);

/** Servings you count one at a time (1 pc, 1 slice, 1 scoop…): step by 1. Everything else steps by 0.5. */
export const isCountable = (serving: string) => /^1 (pc|piece|slice|scoop|can|egg|bar|medium pack|small pack|pack)\b/.test(serving);

const PLURAL: Record<string, string> = {
  cup: "cups", bowl: "bowls", glass: "glasses", plate: "plates", slice: "slices", scoop: "scoops",
  can: "cans", pack: "packs", shake: "shakes", piece: "pieces", serving: "servings",
};
const fmtN = (n: number) => String(Math.round(n * 100) / 100);

/**
 * How much was eaten, in the serving's own unit: (2, "1 pc") → "2 pc", (1.5, "1 plate") → "1.5 plates",
 * (1.5, "100 g") → "150 g", (2, "1 pc (medium)") → "2 pc (medium)". Unknown labels fall back to "2 × label".
 */
export function formatQty(servings: number, serving: string) {
  const m = serving.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
  if (!m) return `${fmtN(servings)} × ${serving}`;
  const n = Number(m[1]) * servings;
  const [head, ...paren] = m[2].split(" (");
  const words = head.split(" ");
  const last = words.length - 1;
  if (n > 1 && PLURAL[words[last]]) words[last] = PLURAL[words[last]];
  return `${fmtN(n)} ${words.join(" ")}${paren.length ? ` (${paren.join(" (")}` : ""}`;
}

/** Which food diets a person on `diet` can eat (vegan ⊂ veg ⊂ egg ⊂ nonveg). */
export function allowedDiets(diet: Diet): Diet[] {
  return { vegan: ["vegan"], veg: ["vegan", "veg"], egg: ["vegan", "veg", "egg"], nonveg: ["vegan", "veg", "egg", "nonveg"] }[diet] as Diet[];
}

export const MEALS: CoreMeal[] = ["breakfast", "lunch", "snack", "dinner"];
/** Every meal a diary entry can belong to: the four core meals plus the optional custom meal. */
export const ALL_MEALS: Meal[] = [...MEALS, "custom"];
export const mealLabel = (m: Meal) => ({ breakfast: "Breakfast", lunch: "Lunch", snack: "Snacks", dinner: "Dinner", custom: "Custom meal" })[m];
export const DIET_LABEL: Record<Diet, string> = { vegan: "Vegan", veg: "Vegetarian", egg: "Eggetarian", nonveg: "Non-veg" };

/** Case-insensitive search: name prefix matches first, then word matches, then contains. */
export function searchFoods(query: string, pool: Food[] = FOODS, limit = 20): Food[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = pool
    .map((f) => {
      const n = f.name.toLowerCase();
      const score = n.startsWith(q) ? 0 : n.split(/[\s/()-]+/).some((w) => w.startsWith(q)) ? 1 : n.includes(q) ? 2 : -1;
      return { f, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => a.score - b.score || a.f.name.length - b.f.name.length);
  return scored.slice(0, limit).map((x) => x.f);
}

const words = (t: string) => t.toLowerCase().replace(/\(.*?\)/g, " ").split(/[^a-z0-9]+/).filter((w) => w.length > 2).map((w) => w.replace(/s$/, ""));
const FOOD_WORDS = FOODS.map((f) => ({ f, w: new Set(words(f.name)) }));

/**
 * Best built-in match for a free-text food name (custom foods, AI estimates), used for its icon and
 * group. Exact name first, then the food sharing the most words. Null when nothing overlaps.
 */
export function guessFood(name: string): Food | null {
  const n = name.trim().toLowerCase();
  const exact = FOODS.find((f) => f.name.toLowerCase() === n);
  if (exact) return exact;
  const ws = words(n);
  if (!ws.length) return null;
  let best: { f: Food; score: number } | null = null;
  for (const { f, w } of FOOD_WORDS) {
    const hit = ws.filter((x) => w.has(x)).length;
    if (!hit) continue;
    const score = hit / Math.max(w.size, ws.length);
    if (!best || score > best.score) best = { f, score };
  }
  return best && best.score >= 0.3 ? best.f : null;
}
