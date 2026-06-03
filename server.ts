import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { AppState, RecipeResponse, ShoppingResponse, Recipe } from "./src/types.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with named parameters & telemetry user-agent
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini API initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini API:", err);
  }
} else {
  console.log("No GEMINI_API_KEY found, using intelligent local engine for previews.");
}

// Healthy route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", usingGemini: !!ai });
});

/**
 * Procedural Fallback Engine for Recipes
 * Used if Gemini API is not configured or fails.
 */
function getProceduralRecipes(state: AppState, useItUp: boolean): RecipeResponse {
  const mode = state.settings.toggleMode;
  const currency = state.settings.currency || "AUD";
  const numIngredients = state.fridge.length;
  const emptyFridgeAlert = numIngredients < 5;

  // Compile available items
  const fridgeNames = state.fridge.map(i => i.name.toLowerCase());
  const pantryNames = state.pantryDefaults.map(p => p.toLowerCase());
  const allAvailable = [...fridgeNames, ...pantryNames];
  const expiringNames = state.fridge.filter(i => i.flaggedExpiring).map(i => i.name.toLowerCase());

  // Set of pool recipes
  const pool = [
    {
      id: "r1",
      title: "Lemon Garlic Chicken Breast",
      ingredients: ["chicken breast", "lemon", "garlic", "olive oil", "salt", "pepper"],
      description: "Crispy-seared chicken with a sizzling, zesty buttery glaze.",
      cookTimeMinutes: 20,
      steps: [
        "Season chicken breasts with salt, pepper, and a splash of lemon juice.",
        "Heat olive oil in a pan and sear chicken for 6-8 minutes on each side until golden.",
        "Add minced garlic directly to the pan pan list, squeeze the remaining lemon juice over, and spoon pan juices over the chicken.",
        "Rest for 3 minutes, then slice and serve warm."
      ]
    },
    {
      id: "r2",
      title: "Spicy Garlic Pasta Bar",
      ingredients: ["pasta", "garlic", "olive oil", "chilli", "salt", "pepper"],
      description: "Fiery, garlic-infused olive oil tossed with perfectly al dente noodles.",
      cookTimeMinutes: 15,
      steps: [
        "Boil pasta in a pot of heavily salted water according to package instructions.",
        "While pasta cooks, heat a generous amount of olive oil over low heat. Add thin garlic slices and chilli flakes to infuse.",
        "Toss the drained pasta directly in the garlic chilli oil, adding splash of pasta water.",
        "Season with fresh pepper and salt to taste."
      ]
    },
    {
      id: "r3",
      title: "Fragrant Herb Rice Bowl",
      ingredients: ["rice", "olive oil", "garlic", "salt", "lemon"],
      description: "Bright, aromatic steamed rice with sweet simmered garlic and citrus highlights.",
      cookTimeMinutes: 25,
      steps: [
        "Rinse rice under cold water until it runs clear.",
        "Sauté minced garlic in olive oil in a saucepan until lightweight golden.",
        "Add rice and stir to coat. Add water and bring to a boil; cover and simmer for 15 minutes.",
        "Fluff with a fork, squeeze fresh lemon juice, and stir in optional salt."
      ]
    },
    {
      id: "r4",
      title: "Zesty Pan-Seared Beef",
      ingredients: ["beef steak", "garlic", "olive oil", "lemon", "salt"],
      description: "Rich savory beef with a surprising citrus touch that cuts the fat.",
      cookTimeMinutes: 18,
      steps: [
        "Pat beef dry and season generously with salt and olive oil.",
        "Heat a skillet on high and sear beef for 3-4 minutes per side.",
        "Toss in crushed garlic cloves in the last 2 minutes.",
        "Remove, drizzle with fresh lemon, and let rest before slicing."
      ]
    },
    {
      id: "r5",
      title: "Tomato Chili Sauté",
      ingredients: ["tomatoes", "chilli", "garlic", "olive oil", "pasta"],
      description: "Plump stewed tomatoes with a slow-burning volcanic chilli kick.",
      cookTimeMinutes: 15,
      steps: [
        "Chop tomatoes and finely mince garlic and chilli.",
        "Heat oil in a pan, cook garlic and chilli block for 1 minute.",
        "Add tomatoes and cook down until they form a thick jammy sauce.",
        "Toss with cooked pasta or scoop up with crispy bread."
      ]
    }
  ];

  // Dynamic user specific recipes based on their actual fridge ingredients
  const dynamicRecipes = [...pool];
  
  // Let's add customized recipes if user added something special in their fridge
  state.fridge.forEach(item => {
    const fn = item.name.toLowerCase();
    if (!pool.some(r => r.ingredients.includes(fn)) && fn.trim().length > 0) {
      dynamicRecipes.push({
        id: `custom_${item.id}`,
        title: `Pan-Seared ${item.name}`,
        ingredients: [fn, "olive oil", "salt", "garlic"],
        description: `Warm caramelized ${item.name} cooked with a light crispy garlic crush.`,
        cookTimeMinutes: 12,
        steps: [
          `Prep the ${item.name} by washing and dry patting.`,
          "Heat olive oil in a pan, toss in minced garlic.",
          `Add ${item.name} and sauté until fully cooked through and fragrant.`,
          "Season with salt and pepper to taste."
        ]
      });
    }
  });

  // Calculate scores
  const evaluated: Recipe[] = dynamicRecipes.map((item, idx) => {
    const listLower = item.ingredients.map(i => i.toLowerCase());
    
    // Have
    const have = listLower.filter(ing => allAvailable.includes(ing) || ing === "salt" || ing === "pepper" || ing === "olive oil");
    const missing = listLower.filter(ing => !allAvailable.includes(ing) && ing !== "salt" && ing !== "pepper" && ing !== "olive oil");

    // Ingredient Match
    const ingredientMatch = listLower.length > 0 ? have.length / listLower.length : 0;

    // Taste Match
    let tasteScore = 0.5;
    // Boost if contains liked
    item.ingredients.forEach(ing => {
      if (state.preferences.liked.some(l => ing.includes(l.toLowerCase()))) tasteScore += 0.15;
      if (state.preferences.disliked.some(d => ing.includes(d.toLowerCase()))) tasteScore -= 0.3;
    });
    tasteScore = Math.max(0.1, Math.min(1.0, tasteScore));

    // Combined Score based on Mode
    let combinedScore = 0.5;
    if (mode === "use_what_i_have") {
      combinedScore = (ingredientMatch * 0.7) + (tasteScore * 0.3);
    } else {
      combinedScore = (ingredientMatch * 0.3) + (tasteScore * 0.7);
    }

    // Prioritize expiring ingredients if Use It Up is active
    const expiringUsed = listLower.filter(ing => expiringNames.includes(ing));
    if (useItUp && expiringUsed.length > 0) {
      combinedScore += 0.2; // Significant boost
    }

    combinedScore = Math.min(1.0, Math.max(0.0, combinedScore));

    // Preference warnings
    const preferenceWarnings: string[] = [];
    item.ingredients.forEach(ing => {
      if (state.preferences.disliked.some(d => ing.includes(d.toLowerCase()))) {
        preferenceWarnings.push(`Contains disliked: ${ing}`);
      }
    });

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      ingredientMatch: parseFloat(ingredientMatch.toFixed(2)),
      tasteMatch: parseFloat(tasteScore.toFixed(2)),
      combinedScore: parseFloat(combinedScore.toFixed(2)),
      have: item.ingredients.filter(ing => allAvailable.includes(ing) || ["salt", "pepper", "olive oil"].includes(ing)),
      missing: missing,
      missingEstimatedCost: missing.length * 2.5,
      expiringIngredientsUsed: expiringUsed,
      preferenceWarnings,
      steps: item.steps,
      cookTimeMinutes: item.cookTimeMinutes
    };
  });

  // Sort by combined score descending
  evaluated.sort((a, b) => b.combinedScore - a.combinedScore);

  // Return top 3 plus 1 wildcard
  const recipes = evaluated.slice(0, 3);
  const wildcardRecipe = evaluated[3] || evaluated[0];

  // Staples suggestion if empty
  const suggestedStaples: string[] = [];
  if (emptyFridgeAlert) {
    suggestedStaples.push("chicken breast", "eggs", "pasta", "spinach", "tomatoes");
  }

  return {
    mode,
    recipes,
    wildcardRecipe,
    emptyFridgeAlert,
    suggestedStaples
  };
}

/**
 * Procedural Fallback Engine for Store Comparisons
 */
function getProceduralShopping(missingIngredients: string[], budget: number, currency: string, groceryStores: string[]): ShoppingResponse {
  if (missingIngredients.length === 0) {
    return {
      missingIngredients: [],
      stores: [],
      recommendedStore: groceryStores[0] || "Grocery Store",
      recommendationReason: "You have all ingredients!"
    };
  }

  const stores = groceryStores.map((store, idx) => {
    // Generate a price from $1.5 to $4.5 per missing ingredient
    let totalCost = 0;
    missingIngredients.forEach(ing => {
      // Seed a bit based on store names to differentiate
      let seed = store.charCodeAt(0) % 5;
      totalCost += 1.8 + seed + (idx * 0.5);
    });

    // Distance in Km from 0.4 to 3.5
    const distanceKm = parseFloat((0.4 + (idx * 1.1) + ((store.charCodeAt(1) % 5) * 0.2)).toFixed(1));

    // Specials
    const specials: string[] = [];
    if (idx === 0) {
      specials.push(`${missingIngredients[0]} - on special, save 20%`);
    } else if (idx === 1 && missingIngredients.length > 1) {
      specials.push(`10% off pantry essentials`);
    }

    return {
      name: store,
      totalCost: parseFloat(totalCost.toFixed(2)),
      distanceKm,
      specials,
      withinBudget: totalCost <= budget
    };
  });

  // Sort by cost ascending
  const sortedStores = [...stores].sort((a, b) => a.totalCost - b.totalCost);
  const recommendedStore = sortedStores[0].name;

  return {
    missingIngredients,
    stores,
    recommendedStore,
    recommendationReason: `Cheapest options available at ${recommendedStore} with an average distance of ${sortedStores[0].distanceKm}km.`
  };
}

/**
 * Recipe suggestion endpoint
 */
app.post("/api/recipes", async (req, res) => {
  const { state, useItUpActivated } = req.body as { state: AppState; useItUpActivated?: boolean };

  if (!state) {
    return res.status(400).json({ error: "State parameter is required" });
  }

  // If no Gemini AI initialized or user requested local fallback, use state-aware procedural generator
  if (!ai || state.settings.bypassGemini) {
    console.log("Using procedural generator fallback for recipes. Bypass active:", !!state.settings.bypassGemini);
    const fallbackData = getProceduralRecipes(state, !!useItUpActivated);
    return res.json({
      ...fallbackData,
      apiQuotaError: false,
      isMockFallback: true
    });
  }

  const mode = state.settings.toggleMode || "use_what_i_have";
  const numIngredients = state.fridge.length;
  const emptyFridgeAlert = numIngredients < 5;

  try {
    const prompt = `
      You are the AI engine behind "Dinner Planner", a mobile-first dinner planning app.
      Evaluate the user's current fridge ingredients and preferences to return exactly three recipe suggestions plus one wildcard option.

      USER STATE:
      ${JSON.stringify({
        fridge: state.fridge,
        pantryDefaults: state.pantryDefaults,
        preferences: state.preferences,
        settings: state.settings,
        recentIngredients: state.recentIngredients,
        useItUpFilterActive: !!useItUpActivated
      }, null, 2)}

      CORE RULES & SCORING:
      1. Toggle Mode rule: 
         - Mode = "use_what_i_have": weight ingredient availability heavily. Prioritize recipes where the user already has most of the ingredients in their fridge or pantry.
         - Mode = "go_to_shops": weight taste match heavily and relax ingredient availability. Focus on user preferred foods even if they need to buy ingredients.
      2. "Use it up" filter is active if useItUpFilterActive is true. In this case, prioritize recipes using ingredients that are flagged is expiring soon ("flaggedExpiring" is true). Give them a hefty ranking boost.
      3. Taste profile rules:
         - Incorporate "preferences.liked" (e.g. ingredients they love) to boost "tasteMatch" score.
         - Do NOT use "preferences.disliked" ingredients without highlighting them in "preferenceWarnings".
      4. Recent ingredients cooked with should not be over-suggested or repeated.
      5. Empty fridge logic:
         - If fewer than 5 ingredients exist in their fridge, set emptyFridgeAlert=true and output a "Start fresh" staples list of 5-6 grocery items based on what appeared most in successfully rated recipes (liked, past rating "up" ingredients).
      6. Return exactly 3 recipe cards in the main "recipes" array.
      7. Return exactly one "wildcardRecipe" for when they swipe past all three suggestions. Use an ingredient they haven't cooked with recently, or suggest a highly creative, unique option that respects their preferences.
      8. Search the internet using the googleSearch tool to locate real, trending, highly-rated recipes using the user's ingredients. CRITICAL: You must ONLY search and reference recipes available at https://www.taste.com.au/. All generated recipe suggestions must correspond to real recipes from https://www.taste.com.au/. Ensure all search queries passed to the googleSearch tool include site:taste.com.au alongside the ingredients (for example, "site:taste.com.au chicken spinach").

      OUTPUT FORMAT:
      You must respond in a valid JSON format matching the following structural specification:
      {
        "mode": "use_what_i_have" | "go_to_shops",
        "recipes": [
          {
            "id": "recipe_1",
            "title": "Clean, Humble Title",
            "description": "One sentence only — focus strictly on what it TASTES like (e.g., Creamy, sweet garlic with a sharp citrus burn), not what it physically is.",
            "ingredientMatch": 0.9, -- float 0.0 to 1.0
            "tasteMatch": 0.85, -- float 0.0 to 1.0
            "combinedScore": 0.88, -- float 0.0 to 1.0
            "have": ["chicken breast", "garlic", "lemon"], -- ingredients they already possess
            "missing": ["capers"], -- ingredients they need to shop for
            "missingEstimatedCost": 2.50, -- in the current user settings currency
            "expiringIngredientsUsed": ["chicken breast"], -- populated from flaggedExpiring items
            "preferenceWarnings": [], -- warnings if containing disliked items or potential dietary mismatches
            "steps": ["Step 1 description", "Step 2 description"],
            "cookTimeMinutes": 25
          }
        ],
        "wildcardRecipe": { ... }, -- exact same schema as recipe item above
        "emptyFridgeAlert": false,
        "suggestedStaples": ["spinach", "pasta"]
      }
    `;

    const recipeSchema = {
      type: Type.OBJECT,
      required: ["mode", "recipes", "emptyFridgeAlert", "suggestedStaples"],
      properties: {
        mode: { type: Type.STRING },
        recipes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            required: [
              "id", "title", "description", "ingredientMatch", "tasteMatch", 
              "combinedScore", "have", "missing", "missingEstimatedCost", 
              "expiringIngredientsUsed", "preferenceWarnings", "steps", "cookTimeMinutes"
            ],
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              ingredientMatch: { type: Type.NUMBER },
              tasteMatch: { type: Type.NUMBER },
              combinedScore: { type: Type.NUMBER },
              have: { type: Type.ARRAY, items: { type: Type.STRING } },
              missing: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingEstimatedCost: { type: Type.NUMBER },
              expiringIngredientsUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
              preferenceWarnings: { type: Type.ARRAY, items: { type: Type.STRING } },
              steps: { type: Type.ARRAY, items: { type: Type.STRING } },
              cookTimeMinutes: { type: Type.INTEGER }
            }
          }
        },
        wildcardRecipe: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            ingredientMatch: { type: Type.NUMBER },
            tasteMatch: { type: Type.NUMBER },
            combinedScore: { type: Type.NUMBER },
            have: { type: Type.ARRAY, items: { type: Type.STRING } },
            missing: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingEstimatedCost: { type: Type.NUMBER },
            expiringIngredientsUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
            preferenceWarnings: { type: Type.ARRAY, items: { type: Type.STRING } },
            steps: { type: Type.ARRAY, items: { type: Type.STRING } },
            cookTimeMinutes: { type: Type.INTEGER }
          }
        },
        emptyFridgeAlert: { type: Type.BOOLEAN },
        suggestedStaples: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    };

    let responseText = "";
    let apiQuotaError = false;
    let isMockFallback = false;

    try {
      console.log("Calling Gemini with internet search...");
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: recipeSchema
        }
      });
      responseText = response.text || "{}";
    } catch (primaryErr: any) {
      console.log("Primary search-grounded Gemini call reached limit (typical Google Search tool quota limit). Retrying with secondary fallback...");
      apiQuotaError = true;

      // Stage 2: Retry WITHOUT the googleSearch tool (which uses much less quota)
      try {
        console.log("Retrying standard Gemini generation without Google Search grounding...");
        const responseWithoutTools = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt + "\nFallback Instruction: Internet search matches are temporarily disabled. Please construct high-quality, authentic culinary suggestions directly from your knowledge base of recipe databases, but make sure they only refer to real recipes available at https://www.taste.com.au/.",
          config: {
            responseMimeType: "application/json",
            responseSchema: recipeSchema
          }
        });
        responseText = responseWithoutTools.text || "{}";
      } catch (secondaryErr: any) {
        console.log("Secondary standard Gemini call also reached limits. Initiating local procedural fallback...");
        isMockFallback = true;
      }
    }

    if (isMockFallback) {
      const fallbackData = getProceduralRecipes(state, !!useItUpActivated);
      return res.json({
        ...fallbackData,
        apiQuotaError: true,
        isMockFallback: true
      });
    }

    const parsed = JSON.parse(responseText || "{}") as RecipeResponse;
    if (apiQuotaError) {
      parsed.apiQuotaError = true;
    }
    return res.json(parsed);

  } catch (err: any) {
    console.log("Gemini recipe fetch completed via fallback route gracefully.");
    // Fall back gracefully so they never see a blank screen
    const fallbackData = getProceduralRecipes(state, !!useItUpActivated);
    return res.json({
      ...fallbackData,
      apiQuotaError: true,
      isMockFallback: true
    });
  }
});

/**
 * Shopping run comparison endpoint
 */
app.post("/api/shop", async (req, res) => {
  const { missingIngredients, groceryStores, budget, currency, bypassGemini } = req.body as {
    missingIngredients: string[];
    groceryStores: string[];
    budget: number;
    currency: string;
    bypassGemini?: boolean;
  };

  if (!missingIngredients) {
    return res.status(400).json({ error: "missingIngredients parameter is required" });
  }

  // Fallback if no Gemini is configured or bypass requested
  if (!ai || bypassGemini) {
    console.log("Using procedural generator fallback for shopping run. Bypass active:", !!bypassGemini);
    return res.json(getProceduralShopping(missingIngredients, budget, currency || "AUD", groceryStores || ["Woolworths", "Coles", "Aldi"]));
  }

  try {
    const prompt = `
      You are the AI engine behind "Dinner Planner".
      The user wants to buy these missing ingredients: ${JSON.stringify(missingIngredients)}.
      Provide a cost comparison across their nominated stores: ${JSON.stringify(groceryStores)}.
      Set the currency code to ${currency || "AUD"}.
      The user's budget limit is ${budget || 30}. Any total cost exceeding this should have withinBudget = false.

      Respond in a valid JSON matching this schema:
      {
        "missingIngredients": ${JSON.stringify(missingIngredients)},
        "stores": [
          {
            "name": "Store Name",
            "totalCost": 12.50, -- estimated amount for all missing ingredients
            "distanceKm": 1.2, -- realistic distance in km (e.g. 0.5 to 5.0)
            "specials": ["optional special promo text, e.g., capers 200g — was $4.50, now $3.20"],
            "withinBudget": true -- totalCost <= budget
          }
        ],
        "recommendedStore": "Store Name",
        "recommendationReason": "Short, human-friendly, scannable sentence why this one wins (e.g. Cheapest and closest, capers on special)"
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["missingIngredients", "stores", "recommendedStore", "recommendationReason"],
          properties: {
            missingIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
            stores: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["name", "totalCost", "distanceKm", "specials", "withinBudget"],
                properties: {
                  name: { type: Type.STRING },
                  totalCost: { type: Type.NUMBER },
                  distanceKm: { type: Type.NUMBER },
                  specials: { type: Type.ARRAY, items: { type: Type.STRING } },
                  withinBudget: { type: Type.BOOLEAN }
                }
              }
            },
            recommendedStore: { type: Type.STRING },
            recommendationReason: { type: Type.STRING }
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}") as ShoppingResponse;
    return res.json(parsed);
  } catch (err: any) {
    console.log("Gemini shopping fetch completed via fallback route gracefully.");
    return res.json(getProceduralShopping(missingIngredients, budget, currency || "AUD", groceryStores || ["Woolworths", "Coles", "Aldi"]));
  }
});


async function start() {
  // Dev vs Production static asset routing
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind to port 3000 and interface 0.0.0.0
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully operational on port ${PORT}`);
  });
}

start();
