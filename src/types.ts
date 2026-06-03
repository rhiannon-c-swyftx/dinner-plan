export interface FridgeItem {
  id: string;
  name: string;
  flaggedExpiring: boolean;
  addedDate: string;
}

export interface RecipeRefinements {
  tooSpicy?: boolean;
  tooSweet?: boolean;
  moreGarlic?: boolean;
  easyCleanup?: boolean;
  moreSeasoning?: boolean;
  [key: string]: boolean | undefined;
}

export interface RatedRecipe {
  recipeId: string;
  rating: 'up' | 'meh' | 'down';
  refinements?: RecipeRefinements;
  feedbackQuestion?: string;
  feedbackAnswer?: string;
}

export interface UserPreferences {
  liked: string[];
  disliked: string[];
  recipesRated: RatedRecipe[];
}

export interface UserSettings {
  budget: number;
  currency: string;
  groceryStores: string[];
  toggleMode: 'use_what_i_have' | 'go_to_shops';
}

export interface AppState {
  fridge: FridgeItem[];
  pantryDefaults: string[];
  preferences: UserPreferences;
  settings: UserSettings;
  recentIngredients: string[];
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredientMatch: number; // 0.0 to 1.0
  tasteMatch: number;      // 0.0 to 1.0
  combinedScore: number;   // 0.0 to 1.0
  have: string[];
  missing: string[];
  missingEstimatedCost: number;
  expiringIngredientsUsed: string[];
  preferenceWarnings: string[];
  steps: string[];
  cookTimeMinutes: number;
}

export interface RecipeResponse {
  mode: 'use_what_i_have' | 'go_to_shops';
  recipes: Recipe[];
  wildcardRecipe?: Recipe;
  emptyFridgeAlert: boolean;
  suggestedStaples: string[];
  apiQuotaError?: boolean;
  isMockFallback?: boolean;
}

export interface StoreComparison {
  name: string;
  totalCost: number;
  distanceKm: number;
  specials: string[];
  withinBudget: boolean;
}

export interface ShoppingResponse {
  missingIngredients: string[];
  stores: StoreComparison[];
  recommendedStore: string;
  recommendationReason: string;
}
