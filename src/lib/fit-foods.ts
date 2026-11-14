/**
 * Built-in food list for the fit diary and meal planner. Values are typical per stated serving
 * (home-style Indian portions plus everyday and gym foods), rounded; good for tracking, not lab exact.
 * Client-safe: no I/O.
 */

export type Diet = "vegan" | "veg" | "egg" | "nonveg";
export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export type Food = {
  key: string;
  name: string;
  serving: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  diet: Diet;
  /** Meals this food usually belongs to (b l d s). */
  meals: Meal[];
  /** Role in a plate, used by the meal planner. */
  role: "main" | "protein" | "side" | "snack" | "drink" | "fruit";
};

type Row = [key: string, name: string, serving: string, grams: number, kcal: number, p: number, c: number, f: number, diet: Diet, meals: string, role: Food["role"]];

const M: Record<string, Meal> = { b: "breakfast", l: "lunch", d: "dinner", s: "snack" };

// prettier-ignore
const ROWS: Row[] = [
  // Breads & grains
  ["roti", "Roti / chapati", "1 medium", 40, 104, 3.1, 18, 2.5, "vegan", "bld", "main"],
  ["phulka", "Phulka (no ghee)", "1 piece", 30, 80, 2.7, 16, 0.4, "vegan", "ld", "main"],
  ["paratha-plain", "Plain paratha", "1 piece", 60, 210, 4.5, 28, 9, "veg", "bld", "main"],
  ["aloo-paratha", "Aloo paratha", "1 piece", 120, 290, 6, 40, 12, "veg", "bl", "main"],
  ["paneer-paratha", "Paneer paratha", "1 piece", 130, 330, 12, 36, 15, "veg", "bl", "main"],
  ["naan", "Naan", "1 piece", 90, 260, 8, 45, 5, "veg", "ld", "main"],
  ["butter-naan", "Butter naan", "1 piece", 100, 320, 8, 46, 11, "veg", "ld", "main"],
  ["puri", "Puri", "1 piece", 25, 100, 1.6, 11, 5.5, "vegan", "b", "main"],
  ["bhatura", "Bhatura", "1 piece", 80, 300, 6, 38, 14, "veg", "l", "main"],
  ["rice-white", "White rice (cooked)", "1 cup", 160, 205, 4.3, 45, 0.4, "vegan", "ld", "main"],
  ["rice-brown", "Brown rice (cooked)", "1 cup", 195, 215, 5, 45, 1.8, "vegan", "ld", "main"],
  ["jeera-rice", "Jeera rice", "1 cup", 170, 250, 4.5, 46, 5.5, "vegan", "ld", "main"],
  ["veg-pulao", "Veg pulao", "1 cup", 180, 270, 5.5, 44, 8, "vegan", "ld", "main"],
  ["veg-biryani", "Veg biryani", "1 plate", 250, 390, 8, 60, 13, "veg", "ld", "main"],
  ["chicken-biryani", "Chicken biryani", "1 plate", 300, 520, 26, 62, 18, "nonveg", "ld", "main"],
  ["egg-biryani", "Egg biryani", "1 plate", 280, 450, 16, 60, 15, "egg", "ld", "main"],
  ["mutton-biryani", "Mutton biryani", "1 plate", 300, 560, 24, 60, 24, "nonveg", "ld", "main"],
  ["curd-rice", "Curd rice", "1 cup", 200, 230, 7, 36, 6, "veg", "ld", "main"],
  ["lemon-rice", "Lemon rice", "1 cup", 180, 260, 4.5, 44, 7.5, "vegan", "l", "main"],
  ["khichdi", "Moong dal khichdi", "1 cup", 200, 240, 9, 40, 5, "vegan", "ld", "main"],
  ["quinoa", "Quinoa (cooked)", "1 cup", 185, 222, 8, 39, 3.6, "vegan", "ld", "main"],
  ["oats", "Oats (dry)", "40 g", 40, 150, 5.3, 27, 2.6, "vegan", "b", "main"],
  ["oats-milk", "Oats with milk", "1 bowl", 250, 270, 11, 40, 7, "veg", "b", "main"],
  ["muesli", "Muesli", "50 g", 50, 190, 5, 33, 4, "vegan", "b", "main"],
  ["cornflakes-milk", "Cornflakes with milk", "1 bowl", 230, 240, 8, 42, 4.5, "veg", "b", "main"],
  ["bread-white", "White bread", "1 slice", 28, 75, 2.5, 14, 1, "vegan", "bs", "main"],
  ["bread-brown", "Brown / whole wheat bread", "1 slice", 30, 80, 3.6, 13, 1.1, "vegan", "bs", "main"],
  ["poha", "Poha", "1 plate", 180, 270, 5, 45, 7.5, "vegan", "b", "main"],
  ["upma", "Upma", "1 plate", 200, 290, 7, 42, 10, "vegan", "b", "main"],
  ["idli", "Idli", "1 piece", 40, 58, 2, 12, 0.4, "vegan", "bs", "main"],
  ["dosa-plain", "Plain dosa", "1 piece", 90, 170, 4, 28, 4.5, "vegan", "bd", "main"],
  ["masala-dosa", "Masala dosa", "1 piece", 180, 360, 7, 50, 15, "vegan", "bl", "main"],
  ["uttapam", "Uttapam", "1 piece", 140, 250, 6, 38, 8, "vegan", "bd", "main"],
  ["pesarattu", "Pesarattu (moong dosa)", "1 piece", 110, 180, 9, 26, 5, "vegan", "b", "main"],
  ["vada", "Medu vada", "1 piece", 50, 150, 4, 14, 9, "vegan", "bs", "snack"],
  ["pongal", "Ven pongal", "1 cup", 200, 300, 8, 42, 11, "veg", "b", "main"],
  ["dhokla", "Dhokla", "2 pieces", 80, 130, 5, 20, 3.5, "vegan", "bs", "snack"],
  ["thepla", "Methi thepla", "1 piece", 45, 130, 3.5, 18, 5, "veg", "bs", "main"],
  ["pasta-veg", "Veg pasta", "1 plate", 250, 380, 11, 60, 10, "veg", "ld", "main"],
  ["maggi", "Instant noodles", "1 pack", 70, 310, 7, 45, 12, "veg", "s", "main"],
  ["veg-noodles", "Veg hakka noodles", "1 plate", 250, 400, 9, 60, 13, "vegan", "ld", "main"],
  ["fried-rice-veg", "Veg fried rice", "1 plate", 250, 410, 8, 66, 12, "vegan", "ld", "main"],
  ["chicken-fried-rice", "Chicken fried rice", "1 plate", 280, 480, 22, 64, 15, "nonveg", "ld", "main"],

  // Dals & legumes
  ["dal-toor", "Toor dal", "1 bowl", 200, 190, 11, 28, 4, "vegan", "ld", "protein"],
  ["dal-moong", "Moong dal", "1 bowl", 200, 170, 11, 25, 3, "vegan", "ld", "protein"],
  ["dal-masoor", "Masoor dal", "1 bowl", 200, 180, 12, 26, 3.5, "vegan", "ld", "protein"],
  ["dal-tadka", "Dal tadka", "1 bowl", 200, 230, 11, 28, 8, "vegan", "ld", "protein"],
  ["dal-makhani", "Dal makhani", "1 bowl", 200, 330, 12, 30, 18, "veg", "ld", "protein"],
  ["chana-masala", "Chana masala", "1 bowl", 200, 290, 12, 38, 10, "vegan", "ld", "protein"],
  ["rajma", "Rajma", "1 bowl", 200, 260, 13, 36, 7, "vegan", "ld", "protein"],
  ["sambar", "Sambar", "1 bowl", 200, 140, 6, 20, 4, "vegan", "bld", "side"],
  ["sprouts", "Moong sprouts", "1 cup", 100, 105, 7.5, 18, 0.5, "vegan", "bs", "protein"],
  ["sprouts-chaat", "Sprouts chaat", "1 bowl", 150, 160, 9, 24, 3, "vegan", "s", "protein"],
  ["chickpeas-boiled", "Boiled chickpeas", "1 cup", 160, 270, 14.5, 45, 4.2, "vegan", "ls", "protein"],
  ["hummus", "Hummus", "2 tbsp", 30, 80, 2.4, 6, 5.3, "vegan", "s", "side"],
  ["soya-chunks", "Soya chunks (dry)", "30 g", 30, 105, 15.6, 9.9, 0.2, "vegan", "ld", "protein"],
  ["soya-curry", "Soya chunk curry", "1 bowl", 200, 230, 20, 16, 9, "vegan", "ld", "protein"],
  ["tofu", "Tofu (firm)", "100 g", 100, 145, 15.8, 3.5, 8.7, "vegan", "ld", "protein"],
  ["tempeh", "Tempeh", "100 g", 100, 195, 20, 7.6, 11, "vegan", "ld", "protein"],
  ["peanuts", "Peanuts (roasted)", "30 g", 30, 170, 7.5, 5, 14.5, "vegan", "s", "snack"],
  ["peanut-butter", "Peanut butter", "1 tbsp", 16, 95, 3.5, 3.5, 8, "vegan", "bs", "side"],

  // Dairy & paneer
  ["milk-toned", "Toned milk", "1 glass", 250, 150, 8, 12, 7.5, "veg", "bs", "drink"],
  ["milk-skim", "Skimmed milk", "1 glass", 250, 90, 8.5, 12.5, 0.3, "veg", "bs", "drink"],
  ["milk-full", "Full cream milk", "1 glass", 250, 165, 8, 12, 9, "veg", "bs", "drink"],
  ["curd", "Curd / dahi", "1 bowl", 150, 90, 5, 7, 4.5, "veg", "lds", "side"],
  ["greek-yogurt", "Greek yogurt (plain)", "150 g", 150, 145, 15, 6, 6.5, "veg", "bs", "protein"],
  ["raita", "Raita", "1 bowl", 150, 100, 4.5, 8, 5, "veg", "ld", "side"],
  ["buttermilk", "Buttermilk / chaas", "1 glass", 250, 60, 3.5, 5, 2.5, "veg", "ls", "drink"],
  ["lassi-sweet", "Sweet lassi", "1 glass", 250, 230, 7, 36, 6, "veg", "s", "drink"],
  ["paneer", "Paneer", "100 g", 100, 265, 18, 3.5, 20, "veg", "ld", "protein"],
  ["paneer-bhurji", "Paneer bhurji", "1 bowl", 150, 330, 19, 8, 25, "veg", "bld", "protein"],
  ["palak-paneer", "Palak paneer", "1 bowl", 200, 300, 14, 12, 22, "veg", "ld", "protein"],
  ["paneer-butter-masala", "Paneer butter masala", "1 bowl", 200, 410, 15, 16, 32, "veg", "ld", "protein"],
  ["paneer-tikka", "Paneer tikka", "6 pieces", 150, 330, 21, 8, 24, "veg", "ds", "protein"],
  ["cottage-cheese-low", "Low-fat paneer", "100 g", 100, 180, 20, 4, 9, "veg", "ld", "protein"],
  ["cheese-slice", "Cheese slice", "1 slice", 20, 65, 4, 1, 5, "veg", "bs", "side"],
  ["butter", "Butter", "1 tsp", 5, 36, 0, 0, 4, "veg", "b", "side"],
  ["ghee", "Ghee", "1 tsp", 5, 45, 0, 0, 5, "veg", "ld", "side"],
  ["whey", "Whey protein", "1 scoop", 32, 125, 24, 3, 1.8, "veg", "bs", "protein"],
  ["whey-milk", "Whey shake with milk", "1 shake", 280, 270, 32, 15, 9, "veg", "bs", "protein"],
  ["plant-protein", "Plant protein powder", "1 scoop", 33, 125, 22, 4, 2.5, "vegan", "bs", "protein"],
  ["soy-milk", "Soy milk (unsweetened)", "1 glass", 250, 100, 8, 4, 5, "vegan", "bs", "drink"],

  // Eggs
  ["egg-boiled", "Boiled egg", "1 large", 50, 78, 6.3, 0.6, 5.3, "egg", "bs", "protein"],
  ["egg-white", "Egg white", "1 large", 33, 17, 3.6, 0.2, 0.1, "egg", "bs", "protein"],
  ["omelette-2", "Omelette (2 eggs)", "1 omelette", 120, 190, 13, 2, 14, "egg", "b", "protein"],
  ["egg-bhurji", "Egg bhurji (2 eggs)", "1 plate", 130, 210, 13, 4, 16, "egg", "bd", "protein"],
  ["egg-curry", "Egg curry (2 eggs)", "1 bowl", 220, 280, 14, 10, 20, "egg", "ld", "protein"],
  ["french-toast", "French toast", "2 slices", 130, 300, 11, 32, 14, "egg", "b", "main"],

  // Chicken, fish, meat
  ["chicken-breast", "Chicken breast (grilled)", "100 g", 100, 165, 31, 0, 3.6, "nonveg", "ld", "protein"],
  ["chicken-curry", "Chicken curry", "1 bowl", 220, 320, 26, 8, 20, "nonveg", "ld", "protein"],
  ["butter-chicken", "Butter chicken", "1 bowl", 220, 440, 28, 12, 31, "nonveg", "ld", "protein"],
  ["tandoori-chicken", "Tandoori chicken", "2 pieces", 200, 300, 40, 4, 13, "nonveg", "ld", "protein"],
  ["chicken-tikka", "Chicken tikka", "6 pieces", 150, 230, 34, 4, 8, "nonveg", "ds", "protein"],
  ["chicken-65", "Chicken 65", "1 plate", 150, 360, 24, 14, 23, "nonveg", "s", "protein"],
  ["chicken-sandwich", "Grilled chicken sandwich", "1 sandwich", 200, 380, 28, 36, 13, "nonveg", "ls", "main"],
  ["chicken-wrap", "Chicken wrap", "1 wrap", 220, 430, 28, 42, 16, "nonveg", "ls", "main"],
  ["fish-curry", "Fish curry", "1 bowl", 220, 280, 25, 8, 16, "nonveg", "ld", "protein"],
  ["fish-fry", "Fish fry", "1 piece", 120, 260, 22, 6, 16, "nonveg", "ld", "protein"],
  ["salmon", "Salmon (cooked)", "100 g", 100, 206, 22, 0, 12, "nonveg", "ld", "protein"],
  ["tuna-can", "Tuna (canned in water)", "100 g", 100, 116, 26, 0, 1, "nonveg", "ls", "protein"],
  ["prawns", "Prawn curry", "1 bowl", 200, 260, 24, 8, 14, "nonveg", "ld", "protein"],
  ["mutton-curry", "Mutton curry", "1 bowl", 220, 420, 30, 8, 30, "nonveg", "ld", "protein"],
  ["keema", "Chicken keema", "1 bowl", 180, 330, 27, 8, 21, "nonveg", "ld", "protein"],

  // Vegetables & sides
  ["mixed-veg", "Mixed veg sabzi", "1 bowl", 150, 140, 3.5, 14, 8, "vegan", "ld", "side"],
  ["aloo-gobi", "Aloo gobi", "1 bowl", 150, 170, 3.5, 20, 9, "vegan", "ld", "side"],
  ["bhindi", "Bhindi fry", "1 bowl", 150, 160, 3, 12, 11, "vegan", "ld", "side"],
  ["baingan-bharta", "Baingan bharta", "1 bowl", 150, 150, 3, 12, 10, "vegan", "ld", "side"],
  ["palak", "Palak sabzi", "1 bowl", 150, 110, 4, 8, 7, "vegan", "ld", "side"],
  ["aloo-sabzi", "Aloo sabzi", "1 bowl", 150, 190, 3, 26, 9, "vegan", "ld", "side"],
  ["cabbage-poriyal", "Cabbage poriyal", "1 bowl", 150, 110, 2.5, 10, 7, "vegan", "ld", "side"],
  ["salad-green", "Green salad", "1 bowl", 150, 35, 1.8, 7, 0.3, "vegan", "ld", "side"],
  ["cucumber", "Cucumber", "1 cup", 120, 18, 0.8, 4, 0.1, "vegan", "lds", "side"],
  ["broccoli", "Broccoli (steamed)", "1 cup", 150, 50, 4, 10, 0.5, "vegan", "ld", "side"],
  ["sweet-potato", "Sweet potato (boiled)", "1 medium", 150, 130, 2.4, 30, 0.2, "vegan", "ls", "side"],
  ["potato-boiled", "Boiled potato", "1 medium", 150, 130, 3, 30, 0.2, "vegan", "ld", "side"],
  ["corn-boiled", "Sweet corn (boiled)", "1 cup", 150, 145, 5, 32, 2, "vegan", "s", "snack"],
  ["veg-soup", "Veg soup", "1 bowl", 250, 90, 3, 14, 2.5, "vegan", "ds", "side"],
  ["chicken-soup", "Chicken clear soup", "1 bowl", 250, 110, 12, 6, 4, "nonveg", "ds", "side"],
  ["pickle", "Pickle", "1 tbsp", 15, 30, 0.2, 1, 2.8, "vegan", "ld", "side"],
  ["papad", "Roasted papad", "1 piece", 12, 40, 3, 7, 0.3, "vegan", "ld", "side"],
  ["coconut-chutney", "Coconut chutney", "2 tbsp", 40, 90, 1, 3, 8.5, "vegan", "b", "side"],
  ["green-chutney", "Mint chutney", "2 tbsp", 30, 20, 0.6, 3, 0.5, "vegan", "lds", "side"],

  // Fruit
  ["banana", "Banana", "1 medium", 118, 105, 1.3, 27, 0.4, "vegan", "bs", "fruit"],
  ["apple", "Apple", "1 medium", 182, 95, 0.5, 25, 0.3, "vegan", "bs", "fruit"],
  ["orange", "Orange", "1 medium", 130, 62, 1.2, 15, 0.2, "vegan", "bs", "fruit"],
  ["papaya", "Papaya", "1 cup", 145, 62, 0.7, 16, 0.4, "vegan", "bs", "fruit"],
  ["mango", "Mango", "1 cup", 165, 99, 1.4, 25, 0.6, "vegan", "s", "fruit"],
  ["watermelon", "Watermelon", "1 cup", 152, 46, 0.9, 11.5, 0.2, "vegan", "s", "fruit"],
  ["grapes", "Grapes", "1 cup", 150, 104, 1.1, 27, 0.2, "vegan", "s", "fruit"],
  ["pomegranate", "Pomegranate seeds", "1 cup", 174, 144, 2.9, 32, 2, "vegan", "bs", "fruit"],
  ["guava", "Guava", "1 medium", 100, 68, 2.6, 14, 1, "vegan", "s", "fruit"],
  ["pineapple", "Pineapple", "1 cup", 165, 82, 0.9, 22, 0.2, "vegan", "s", "fruit"],
  ["dates", "Dates", "3 pieces", 24, 67, 0.6, 18, 0.1, "vegan", "s", "fruit"],
  ["berries", "Mixed berries", "1 cup", 150, 70, 1, 17, 0.5, "vegan", "bs", "fruit"],

  // Nuts, seeds & snacks
  ["almonds", "Almonds", "10 pieces", 12, 70, 2.5, 2.6, 6, "vegan", "bs", "snack"],
  ["walnuts", "Walnuts", "4 halves", 14, 92, 2.1, 2, 9.2, "vegan", "s", "snack"],
  ["cashews", "Cashews", "10 pieces", 15, 85, 2.7, 4.5, 6.8, "vegan", "s", "snack"],
  ["mixed-nuts", "Mixed nuts", "30 g", 30, 180, 5, 6, 16, "vegan", "s", "snack"],
  ["chia", "Chia seeds", "1 tbsp", 12, 58, 2, 5, 3.7, "vegan", "b", "side"],
  ["flax", "Flax seeds", "1 tbsp", 10, 55, 1.9, 3, 4.3, "vegan", "b", "side"],
  ["makhana", "Roasted makhana", "1 cup", 30, 110, 3, 20, 1.5, "vegan", "s", "snack"],
  ["roasted-chana", "Roasted chana", "30 g", 30, 110, 6.5, 18, 1.8, "vegan", "s", "snack"],
  ["protein-bar", "Protein bar", "1 bar", 60, 220, 20, 22, 7, "veg", "s", "snack"],
  ["granola-bar", "Granola bar", "1 bar", 40, 180, 3, 28, 6, "vegan", "s", "snack"],
  ["dark-chocolate", "Dark chocolate", "2 squares", 20, 115, 1.5, 9, 8.5, "vegan", "s", "snack"],
  ["samosa", "Samosa", "1 piece", 100, 260, 4, 30, 14, "vegan", "s", "snack"],
  ["pakora", "Veg pakora", "5 pieces", 100, 290, 6, 26, 18, "vegan", "s", "snack"],
  ["bhel", "Bhel puri", "1 plate", 150, 250, 6, 40, 8, "vegan", "s", "snack"],
  ["pani-puri", "Pani puri", "6 pieces", 120, 220, 4, 34, 8, "vegan", "s", "snack"],
  ["pav-bhaji", "Pav bhaji", "1 plate", 300, 500, 12, 66, 21, "veg", "ld", "main"],
  ["vada-pav", "Vada pav", "1 piece", 150, 300, 7, 42, 12, "vegan", "s", "main"],
  ["chole-bhature", "Chole bhature", "1 plate", 350, 650, 18, 80, 28, "veg", "l", "main"],
  ["veg-sandwich", "Veg sandwich", "1 sandwich", 180, 290, 9, 40, 10, "veg", "bs", "main"],
  ["burger-veg", "Veg burger", "1 burger", 200, 420, 11, 52, 18, "veg", "ls", "main"],
  ["pizza-slice", "Pizza slice", "1 slice", 110, 285, 12, 36, 10, "veg", "ls", "main"],
  ["french-fries", "French fries", "1 medium", 117, 365, 4, 48, 17, "vegan", "s", "snack"],
  ["chips", "Potato chips", "1 small pack", 28, 150, 2, 15, 10, "vegan", "s", "snack"],
  ["biscuits", "Biscuits", "2 pieces", 20, 95, 1.4, 14, 3.8, "veg", "s", "snack"],
  ["rusk", "Rusk", "2 pieces", 20, 80, 2.4, 14, 1.6, "veg", "bs", "snack"],

  // Drinks & sweets
  ["tea-milk", "Tea with milk & sugar", "1 cup", 150, 80, 2, 12, 2.5, "veg", "bs", "drink"],
  ["coffee-milk", "Coffee with milk & sugar", "1 cup", 150, 90, 3, 12, 3, "veg", "bs", "drink"],
  ["black-coffee", "Black coffee", "1 cup", 240, 2, 0.3, 0, 0, "vegan", "bs", "drink"],
  ["green-tea", "Green tea", "1 cup", 240, 2, 0, 0, 0, "vegan", "bs", "drink"],
  ["coconut-water", "Coconut water", "1 glass", 240, 45, 1.7, 9, 0.5, "vegan", "s", "drink"],
  ["orange-juice", "Orange juice", "1 glass", 250, 112, 1.7, 26, 0.5, "vegan", "bs", "drink"],
  ["soft-drink", "Soft drink", "1 can", 330, 140, 0, 35, 0, "vegan", "s", "drink"],
  ["banana-shake", "Banana milkshake", "1 glass", 300, 300, 10, 48, 8, "veg", "bs", "drink"],
  ["gulab-jamun", "Gulab jamun", "1 piece", 50, 150, 2, 22, 6, "veg", "s", "snack"],
  ["rasgulla", "Rasgulla", "1 piece", 50, 125, 2.5, 26, 1.5, "veg", "s", "snack"],
  ["kheer", "Kheer", "1 bowl", 150, 230, 6, 34, 8, "veg", "s", "snack"],
  ["ice-cream", "Ice cream", "1 scoop", 66, 140, 2.4, 16, 7.3, "veg", "s", "snack"],
  ["jalebi", "Jalebi", "2 pieces", 50, 180, 1, 30, 7, "veg", "s", "snack"],
  ["honey", "Honey", "1 tbsp", 21, 64, 0.1, 17, 0, "veg", "b", "side"],
  ["sugar", "Sugar", "1 tsp", 4, 16, 0, 4, 0, "vegan", "b", "side"],
];

export const FOODS: Food[] = ROWS.map(([key, name, serving, grams, kcal, protein, carbs, fat, diet, meals, role]) => ({
  key,
  name,
  serving,
  grams,
  kcal,
  protein,
  carbs,
  fat,
  diet,
  meals: [...meals].map((ch) => M[ch]),
  role,
}));

export const FOOD_BY_KEY = new Map(FOODS.map((f) => [f.key, f]));

/** Which food diets a person on `diet` can eat (vegan ⊂ veg ⊂ egg ⊂ nonveg). */
export function allowedDiets(diet: Diet): Diet[] {
  return { vegan: ["vegan"], veg: ["vegan", "veg"], egg: ["vegan", "veg", "egg"], nonveg: ["vegan", "veg", "egg", "nonveg"] }[diet] as Diet[];
}

export const MEALS: Meal[] = ["breakfast", "lunch", "snack", "dinner"];
export const mealLabel = (m: Meal) => ({ breakfast: "Breakfast", lunch: "Lunch", snack: "Snacks", dinner: "Dinner" })[m];
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
