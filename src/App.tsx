import React, { useState, useEffect } from 'react';
import { 
  ChefHat, Sparkles, Sliders, RefreshCw, ShoppingCart, HelpCircle, 
  Settings, Check, Compass, BookOpen, AlertTriangle, PlayCircle, ShieldAlert
} from 'lucide-react';
import { AppState, RecipeResponse, Recipe, FridgeItem, UserPreferences, UserSettings } from './types';
import Onboarding from './components/Onboarding';
import RecipeCard from './components/RecipeCard';
import FridgeManager from './components/FridgeManager';
import WeeklyCheck from './components/WeeklyCheck';
import ShoppingModal from './components/ShoppingModal';

// Constants for initial state
const INITIAL_STATE: AppState = {
  fridge: [
    { id: '1', name: 'chicken breast', flaggedExpiring: false, addedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
    { id: '2', name: 'lemon', flaggedExpiring: true, addedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
    { id: '3', name: 'milk', flaggedExpiring: false, addedDate: new Date().toISOString() },
    { id: '4', name: 'eggs', flaggedExpiring: false, addedDate: new Date().toISOString() }
  ],
  pantryDefaults: ["olive oil", "salt", "pepper", "pasta", "rice", "garlic"],
  preferences: {
    liked: ["lemon", "garlic", "chilli"],
    disliked: ["cilantro", "blue cheese"],
    recipesRated: []
  },
  settings: {
    budget: 30,
    currency: "AUD",
    groceryStores: ["Woolworths", "Coles", "Aldi"],
    toggleMode: "use_what_i_have"
  },
  recentIngredients: ["broccoli"]
};

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('dinner_planner_state');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return INITIAL_STATE; }
    }
    return INITIAL_STATE;
  });

  const [onboardingActive, setOnboardingActive] = useState(() => {
    return !localStorage.getItem('dinner_planner_state');
  });

  // UI state variables
  const [activeTab, setActiveTab] = useState<'tonight' | 'inventory' | 'settings'>('tonight');
  const [recipesResponse, setRecipesResponse] = useState<RecipeResponse | null>(null);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [useItUpActive, setUseItUpActive] = useState(false);
  const [weeklyAuditOpen, setWeeklyAuditOpen] = useState(false);
  const [shoppingIngredients, setShoppingIngredients] = useState<string[] | null>(null);
  
  // Carousel tracking for tonight's suggestions 
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);

  // Settings local state variables
  const [settingBudget, setSettingBudget] = useState(state.settings.budget);
  const [settingCurrency, setSettingCurrency] = useState(state.settings.currency);
  const [settingStores, setSettingStores] = useState<string[]>(state.settings.groceryStores);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('dinner_planner_state', JSON.stringify(state));
  }, [state]);

  // Fetch tonight's suggestions from server when mode/inventories change
  const fetchRecipes = async (forcedState = state, forcedUseItUp = useItUpActive) => {
    setRecipesLoading(true);
    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          state: forcedState,
          useItUpActivated: forcedUseItUp
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setRecipesResponse(data);
        setCurrentRecipeIndex(0); // reset index
      } else {
        console.error("HTTP error loading suggestions");
      }
    } catch (err) {
      console.error("Failed to load recipes list:", err);
    } finally {
      setRecipesLoading(false);
    }
  };

  useEffect(() => {
    if (!onboardingActive) {
      fetchRecipes();
    }
  }, [state.settings.toggleMode, state.fridge, onboardingActive]);

  // Handle minimal onboarding completion
  const handleOnboardingComplete = (firstIngredients: string[]) => {
    const freshFridge: FridgeItem[] = firstIngredients.map((item, idx) => ({
      id: `init_${idx}_${Date.now()}`,
      name: item.trim().toLowerCase(),
      flaggedExpiring: false,
      addedDate: new Date().toISOString()
    }));

    const newState: AppState = {
      ...state,
      fridge: freshFridge
    };

    setState(newState);
    setOnboardingActive(false);
    // Fetch suggestions immediately
    fetchRecipes(newState);
  };

  // Toggle modes
  const handleToggleMode = (mode: 'use_what_i_have' | 'go_to_shops') => {
    const updatedState = {
      ...state,
      settings: {
        ...state.settings,
        toggleMode: mode
      }
    };
    setState(updatedState);
  };

  // Toggle use it up filter
  const handleToggleUseItUp = () => {
    const nextVal = !useItUpActive;
    setUseItUpActive(nextVal);
    fetchRecipes(state, nextVal);
  };

  // Quick Ingredient management triggers
  const handleAddFridgeItem = (name: string) => {
    const newItem: FridgeItem = {
      id: `${Date.now()}`,
      name: name.toLowerCase().trim(),
      flaggedExpiring: false,
      addedDate: new Date().toISOString()
    };
    setState(prev => ({
      ...prev,
      fridge: [newItem, ...prev.fridge]
    }));
  };

  const handleRemoveFridgeItem = (id: string) => {
    setState(prev => ({
      ...prev,
      fridge: prev.fridge.filter(i => i.id !== id)
    }));
  };

  const handleToggleExpiringItem = (id: string) => {
    setState(prev => ({
      ...prev,
      fridge: prev.fridge.map(i => i.id === id ? { ...i, flaggedExpiring: !i.flaggedExpiring } : i)
    }));
  };

  const handleUpdatePantry = (updated: string[]) => {
    setState(prev => ({
      ...prev,
      pantryDefaults: updated
    }));
  };

  const handleUpdatePreferences = (updatedPref: UserPreferences) => {
    setState(prev => ({
      ...prev,
      preferences: updatedPref
    }));
  };

  // Recipe finished / eaten cooking depletion handler
  const handleCookCompleted = (usedIngredients: string[]) => {
    // 1. Trace which real fridge items were consumed
    // Deplete them automatically!
    const namesToDeplete = usedIngredients.map(i => i.toLowerCase().trim());
    const remainingFridge = state.fridge.filter(item => {
      return !namesToDeplete.includes(item.name.toLowerCase().trim());
    });

    // 2. Append consumed items to "recentIngredients" register
    const updatedRecent = Array.from(new Set([...usedIngredients, ...state.recentIngredients])).slice(0, 8);

    setState(prev => ({
      ...prev,
      fridge: remainingFridge,
      recentIngredients: updatedRecent
    }));
  };

  // User rated food handler
  const handleRateRecipe = (recipeId: string, rating: 'up' | 'meh' | 'down', feedbackAnswer?: string) => {
    // Improve silenty over time!
    // Try to find if this recipe item exists in currently loaded response response to harvest their ingredients
    const selectedRecipe = recipesResponse?.recipes.find(r => r.id === recipeId) || recipesResponse?.wildcardRecipe;
    if (!selectedRecipe) return;

    // Mutate preferences liked/disliked dynamically based on rating values!
    let updatedLiked = [...state.preferences.liked];
    let updatedDisliked = [...state.preferences.disliked];

    if (rating === 'up') {
      selectedRecipe.have.forEach(ing => {
        if (!updatedLiked.includes(ing) && !state.pantryDefaults.includes(ing)) {
          updatedLiked.push(ing);
        }
      });
      // Filter out of dislikes if rated positively
      updatedDisliked = updatedDisliked.filter(i => !selectedRecipe.have.includes(i));
    } else if (rating === 'down') {
      selectedRecipe.have.forEach(ing => {
        if (!updatedDisliked.includes(ing) && !state.pantryDefaults.includes(ing)) {
          updatedDisliked.push(ing);
        }
      });
      updatedLiked = updatedLiked.filter(i => !selectedRecipe.have.includes(i));
    }

    setState(prev => {
      const existingRatings = prev.preferences.recipesRated || [];
      const updatedRatings = [
        ...existingRatings.filter(r => r.recipeId !== recipeId),
        { recipeId, rating, refinementAnswer: feedbackAnswer }
      ];
      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          liked: updatedLiked,
          disliked: updatedDisliked,
          recipesRated: updatedRatings
        }
      };
    });
  };

  // Apply settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        budget: settingBudget,
        currency: settingCurrency,
        groceryStores: settingStores
      }
    }));
    setActiveTab('tonight');
  };

  // Empty fridge state "start fresh" staples replenishment trigger
  const handleReplenishStaples = () => {
    const staplesToAdd = recipesResponse?.suggestedStaples || ["chicken breast", "eggs", "spinach", "pasta", "tomatoes"];
    
    const freshNewItems: FridgeItem[] = staplesToAdd.map((name, idx) => ({
      id: `staple_${idx}_${Date.now()}`,
      name: name.toLowerCase().trim(),
      flaggedExpiring: false,
      addedDate: new Date().toISOString()
    }));

    setState(prev => ({
      ...prev,
      fridge: [...prev.fridge, ...freshNewItems]
    }));
  };

  const getCurrencySymbol = (code: string) => {
    switch (code) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return '$';
    }
  };

  const currencySymbol = getCurrencySymbol(state.settings.currency);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-start p-0 md:p-6 lg:p-8 font-sans">
      
      {/* Onboarding Overlay */}
      {onboardingActive && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}

      {/* Main viewport Container (Simulated viewport framework supporting Bento Grid split on desktop) */}
      <div className="w-full max-w-md md:max-w-6xl bg-[#f7f6f3] min-h-screen md:min-h-[820px] md:max-h-[880px] md:rounded-[40px] md:shadow-2xl md:border-[10px] md:border-stone-900 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Left column / Sidebar - Desktop only */}
        <div className="hidden md:flex flex-col w-[300px] shrink-0 border-r border-stone-200 p-6 bg-white overflow-y-auto gap-6 select-none">
          {/* Brand branding */}
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-orange-600 flex items-center gap-2">
              <ChefHat className="w-6 h-6 text-orange-500" />
              <span>DinnerPlan</span>
            </h1>
            <p className="text-[9px] text-stone-400 font-extrabold uppercase tracking-widest block font-sans">AI-CRAFTED BENTO KITCHEN</p>
          </div>

          {/* Mode Toggles */}
          <div className="space-y-2">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block">Decider Mode</span>
            <div className="bg-stone-50 p-1.5 rounded-2xl border border-stone-150 flex flex-col gap-1">
              <button
                onClick={() => handleToggleMode('use_what_i_have')}
                className={`w-full text-left font-bold text-xs py-2 px-3 rounded-xl transition-all capitalize cursor-pointer flex items-center justify-between ${
                  state.settings.toggleMode === 'use_what_i_have'
                    ? 'bg-[#f7f6f3] text-stone-850 shadow-xs border border-stone-250/20'
                    : 'text-stone-400 hover:text-stone-600 border border-transparent'
                }`}
              >
                <span>🥗 Use what I have</span>
                {state.settings.toggleMode === 'use_what_i_have' && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
              </button>
              <button
                onClick={() => handleToggleMode('go_to_shops')}
                className={`w-full text-left font-bold text-xs py-2 px-3 rounded-xl transition-all capitalize cursor-pointer flex items-center justify-between ${
                  state.settings.toggleMode === 'go_to_shops'
                    ? 'bg-[#f7f6f3] text-stone-850 shadow-xs border border-stone-250/20'
                    : 'text-stone-400 hover:text-stone-600 border border-transparent'
                }`}
              >
                <span>🛒 Go to the shops</span>
                {state.settings.toggleMode === 'go_to_shops' && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
              </button>
            </div>
          </div>

          {/* Live Fridge summary widget */}
          <div className="bg-stone-50/50 rounded-[24px] p-4.5 border border-stone-150 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">In the Fridge</span>
              <span className="text-[10px] font-mono font-black bg-orange-100 text-orange-850 px-2 py-0.5 rounded-md">
                {state.fridge.length} Items
              </span>
            </div>

            <div className="max-h-[190px] overflow-y-auto space-y-1.5 pr-1">
              {state.fridge.map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded-xl border border-stone-150">
                  <span className="text-xs font-semibold text-stone-800 capitalize truncate flex-1">{item.name}</span>
                  {item.flaggedExpiring && (
                    <span className="text-[8px] bg-red-100 text-red-700 font-extrabold uppercase px-1.5 py-0.5 rounded-md tracking-wider flex-shrink-0 animate-pulse border border-red-200">
                      Expiring
                    </span>
                  )}
                </div>
              ))}
              {state.fridge.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-[10px] text-stone-400 font-bold italic">Fridge is empty</p>
                </div>
              )}
            </div>

            {/* Quick adding input */}
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const input = form.elements.namedItem('sidebarItem') as HTMLInputElement;
              if (input && input.value.trim()) {
                handleAddFridgeItem(input.value.trim());
                input.value = '';
              }
            }} className="flex gap-1.5 border-t border-stone-150 pt-3">
              <input 
                name="sidebarItem"
                placeholder="Quick add ingredient..." 
                className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs flex-1 text-stone-850 outline-none focus:border-stone-400 font-bold"
              />
              <button type="submit" className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-3 rounded-lg flex items-center justify-center">
                +
              </button>
            </form>

            <button 
              onClick={() => setWeeklyAuditOpen(true)}
              className="w-full bg-[#1c1c1a] text-white hover:bg-stone-850 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer mt-1 text-center"
            >
              WEEKLY FRIDGE CHECK ✔
            </button>
          </div>
          
          <div className="mt-auto pt-4 text-[9px] text-stone-400 font-bold border-t border-stone-100 text-center uppercase tracking-wider">
            DinnerPlan © 2026 Bento System
          </div>
        </div>

        {/* Right Pane / Workspace */}
        <div className="flex-1 flex flex-col md:overflow-hidden min-h-0">
          
          {/* Mobile Header Banner */}
          <header className="bg-white px-5 py-4 border-b border-stone-200/60 shadow-xs flex items-center justify-between md:hidden">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-stone-900 text-white rounded-xl flex items-center justify-center">
                <ChefHat className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <h1 className="font-sans font-black text-stone-900 leading-none text-sm">DinnerPlan</h1>
                <p className="text-[9px] text-orange-500 font-bold uppercase tracking-wider mt-0.5">Bento Command Center</p>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveTab(activeTab === 'settings' ? 'tonight' : 'settings');
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                activeTab === 'settings' 
                  ? 'bg-stone-950 text-white' 
                  : 'bg-stone-100 text-stone-500 hover:text-stone-900'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </header>

          {/* Mobile-only Mode Toggle Control */}
          <div className="bg-white px-5 py-3 border-b border-stone-200/50 flex md:hidden flex-col gap-3">
            <div className="bg-stone-100 p-1 rounded-2xl flex">
              <button
                onClick={() => handleToggleMode('use_what_i_have')}
                className={`flex-1 text-center font-bold text-xs py-2 rounded-xl transition-all capitalize cursor-pointer ${
                  state.settings.toggleMode === 'use_what_i_have'
                    ? 'bg-[#f7f6f3] text-stone-900 shadow-xs border border-stone-200/40'
                    : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                🥗 Use what I have
              </button>
              <button
                onClick={() => handleToggleMode('go_to_shops')}
                className={`flex-1 text-center font-bold text-xs py-2 rounded-xl transition-all capitalize cursor-pointer ${
                  state.settings.toggleMode === 'go_to_shops'
                    ? 'bg-[#f7f6f3] text-[#1c1c1a] shadow-xs border border-stone-200/40'
                    : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                🛒 Go to shops
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold">
              <div className="flex items-center gap-1.5 text-stone-600">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-505 bg-orange-500" />
                <span>{state.fridge.length} items in fridge</span>
              </div>
              <button
                onClick={() => setWeeklyAuditOpen(true)}
                className="text-orange-600 border border-orange-100 bg-orange-50 px-2 py-0.5 rounded-md text-[10px]"
              >
                Weekly Check ✔
              </button>
            </div>
          </div>

          {/* Inner Navigation Header tab buttons */}
          <div className="bg-white/80 p-3.5 border-b border-stone-200/50 hidden md:flex items-center justify-between select-none">
            <div className="flex gap-2 bg-stone-100 p-1 rounded-2xl border border-stone-200/50">
              <button 
                onClick={() => setActiveTab('tonight')}
                className={`py-2 px-4 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'tonight' 
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/55' 
                    : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                <Compass className="w-3.5 h-3.5 animate-pulse text-orange-500" />
                <span>Tonight's Best Bets</span>
              </button>
              <button 
                onClick={() => setActiveTab('inventory')}
                className={`py-2 px-4 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'inventory' 
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/55' 
                    : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-stone-500" />
                <span>Fridge & Preferences</span>
              </button>
            </div>

            {/* Quick Status Bar element on desktop */}
            <div className="flex items-center gap-4 text-xs font-bold text-stone-500">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-stone-400" />
                <span>Budget Max: {currencySymbol}{state.settings.budget}</span>
              </div>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`p-2 rounded-xl transition-all border cursor-pointer ${
                  activeTab === 'settings' 
                    ? 'bg-stone-900 text-white border-stone-900' 
                    : 'hover:bg-stone-50 border-stone-200 text-stone-500'
                }`}
                title="Application Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Workspace Frame Scroll Container */}
          <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 md:pb-6 space-y-6">

            {/* TONIGHT RECIPES suggestion flow view */}
            {activeTab === 'tonight' && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Optional filters panel: Use It Up */}
                <div className="bg-white p-5 rounded-[24px] border border-stone-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">"Use it up" Smart Optimizer</h4>
                    <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-widest mt-0.5">PRIORITISE INGREDIENTS EXPIRING IN 48 HOURS</p>
                  </div>
                  <button
                    onClick={handleToggleUseItUp}
                    className={`w-12 h-6.5 rounded-full transition-all relative cursor-pointer ${
                      useItUpActive ? 'bg-orange-500' : 'bg-stone-200'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${
                      useItUpActive ? 'left-6.5' : 'left-0.5'
                    }`} />
                  </button>
                </div>

                {recipesLoading ? (
                  <div className="p-16 border rounded-3xl bg-white border-stone-150 text-center space-y-3.5 shadow-xs">
                    <div className="w-9 h-9 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-stone-500 font-bold">Chef's AI engine is cooking up custom suggestions...</p>
                  </div>
                ) : recipesResponse ? (
                  <div className="space-y-6">
                    
                    {/* Empty Fridge State Suggestion Prompt */}
                    {recipesResponse.emptyFridgeAlert && (
                      <div className="bg-orange-50/80 rounded-[28px] p-5 border border-orange-200 space-y-4">
                        <div className="flex gap-2.5 items-start">
                          <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-sans font-black text-orange-950 leading-snug">Fridge is running thin!</h4>
                            <p className="text-xs text-orange-800 leading-relaxed mt-1 font-medium">
                              You have fewer than 5 ingredients left. Ready to start fresh? Suggesting items based on your past rated favorites:
                            </p>
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl p-4 border border-orange-100 space-y-3">
                          <div className="flex flex-wrap gap-1.5">
                            {recipesResponse.suggestedStaples.map((stap, sI) => (
                              <span key={sI} className="text-[10px] bg-orange-100/60 text-orange-900 border border-orange-200/50 font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg capitalize">
                                + {stap}
                              </span>
                            ))}
                          </div>
                          <button
                            onClick={handleReplenishStaples}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                          >
                            Fill fridge with "Start Fresh" staples
                          </button>
                        </div>
                      </div>
                    )}

                    {/* suggest limits warning card */}
                    {recipesResponse.recipes.length === 0 && (
                      <div className="bg-white p-8 border border-stone-200/80 rounded-3xl text-center space-y-1 shadow-xs">
                        <p className="text-sm text-stone-400 font-semibold mb-2">No matching meals found.</p>
                        <button 
                          onClick={() => handleToggleMode('go_to_shops')} 
                          className="bg-orange-500 text-white font-extrabold px-5 py-3 rounded-xl text-xs hover:bg-orange-600 shadow-xs cursor-pointer transition-colors"
                        >
                          Switch to "I'll go to the shops" to expand suggestions
                        </button>
                      </div>
                    )}

                    {/* Suggestion Card Selection Deck */}
                    {recipesResponse.recipes.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-stone-400 uppercase tracking-widest">Dinner Deck SUGGESTIONS</span>
                          <div className="flex items-center gap-1.5">
                            {recipesResponse.recipes.map((_, index) => {
                              const isSelected = currentRecipeIndex === index;
                              return (
                                <button
                                  key={index}
                                  onClick={() => setCurrentRecipeIndex(index)}
                                  className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                                    isSelected ? 'bg-orange-500 w-5' : 'bg-stone-300'
                                  }`}
                                />
                              );
                            })}
                            {recipesResponse.wildcardRecipe && (
                              <button
                                onClick={() => setCurrentRecipeIndex(3)}
                                className={`text-[9px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg transition-all border cursor-pointer ${
                                  currentRecipeIndex === 3 
                                    ? 'bg-orange-100 border-orange-250 text-orange-900 font-extrabold' 
                                    : 'bg-stone-100 border-stone-200 text-stone-500'
                                }`}
                              >
                                Wildcard 🃏
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Render Active index recipe */}
                        {currentRecipeIndex < 3 ? (
                          <RecipeCard
                            key={recipesResponse.recipes[currentRecipeIndex].id}
                            recipe={recipesResponse.recipes[currentRecipeIndex]}
                            onShopForThis={(missing) => setShoppingIngredients(missing)}
                            onRateRecipe={handleRateRecipe}
                            onCookCompleted={handleCookCompleted}
                          />
                        ) : (
                          recipesResponse.wildcardRecipe && (
                            <div className="space-y-2">
                              <RecipeCard
                                key={recipesResponse.wildcardRecipe.id}
                                recipe={recipesResponse.wildcardRecipe}
                                onShopForThis={(missing) => setShoppingIngredients(missing)}
                                onRateRecipe={handleRateRecipe}
                                onCookCompleted={handleCookCompleted}
                              />
                              <div className="bg-amber-50 border border-amber-250 rounded-[28px] p-5 text-center">
                                <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                                  🃏 Wildcard recommendation active!
                                </p>
                                <p className="text-[11px] text-amber-700 leading-normal mt-1 font-medium">
                                  Suggesting culinary highlights based on ingredients you cook with rarely, to keep things fresh.
                                </p>
                              </div>
                            </div>
                          )
                        )}

                        {/* Navigation Carousel button bars */}
                        <div className="flex justify-between gap-3 text-xs pt-2">
                          <button
                            disabled={currentRecipeIndex === 0}
                            onClick={() => setCurrentRecipeIndex(prev => prev - 1)}
                            className={`flex-1 py-3 px-4 border rounded-xl font-bold transition-all cursor-pointer text-center ${
                              currentRecipeIndex === 0
                                ? 'border-stone-150 text-stone-300 bg-white/20'
                                : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                            }`}
                          >
                            Previous Suggestion
                          </button>
                          <button
                            disabled={currentRecipeIndex === 3 || (!recipesResponse.wildcardRecipe && currentRecipeIndex === 2)}
                            onClick={() => setCurrentRecipeIndex(prev => prev + 1)}
                            className="flex-1 py-3 px-4 bg-[#1c1c1a] hover:bg-stone-850 text-white rounded-xl font-bold transition-all text-center cursor-pointer shadow-xs"
                          >
                            {currentRecipeIndex === 2 && recipesResponse.wildcardRecipe ? 'Try Wildcard 🃏' : 'Explore Next'}
                          </button>
                        </div>

                      </div>
                    )}

                    {/* Bento Grid Bottom row featuring Grocery Budget Price Compare & Taste Trainer */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
                      
                      {/* SMART GROCERY PRICE COMPARISON BENTO WIDGET */}
                      {(() => {
                        const activeRecipe = recipesResponse?.recipes[currentRecipeIndex] || recipesResponse?.wildcardRecipe;
                        const comparedItem = activeRecipe?.missing[0] || "lemon";
                        
                        return (
                          <div className="bg-stone-900 rounded-[32px] p-6 text-white flex flex-col justify-between col-span-1 md:col-span-2">
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-stone-500 block mb-1">SMART SHOP COMPARISON</span>
                              <h4 className="text-sm font-black uppercase tracking-wide text-orange-400 capitalize pt-0.5">Item: {comparedItem}</h4>
                            </div>

                            <div className="grid grid-cols-2 gap-3.5 my-4">
                              <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                <span className="text-[10px] text-stone-400 block font-bold">Woolworths (1.2km)</span>
                                <p className="text-lg font-black mt-1">{currencySymbol}{(comparedItem === "lemon" ? 1.20 : 3.50).toFixed(2)}</p>
                                <span className="text-[9px] font-bold text-green-400 block mt-1.5 uppercase tracking-wider">ON SPECIAL</span>
                              </div>
                              <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                <span className="text-[10px] text-stone-400 block font-bold">Coles (1.5km)</span>
                                <p className="text-lg font-black mt-1">{currencySymbol}{(comparedItem === "lemon" ? 1.50 : 4.20).toFixed(2)}</p>
                                <span className="text-[9px] font-bold text-stone-500 block mt-1.5 uppercase tracking-wider">REGULAR</span>
                              </div>
                            </div>

                            <div className="border-t border-white/5 pt-2.5 text-xs text-stone-300">
                              <span className="font-bold text-white block">Recommendation: </span>
                              <span>Woolies is cheapest and closest today.</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* TASTE TRAINER BENTO WIDGET */}
                      {(() => {
                        const recentCooked = state.recentIngredients[0] || "lemon";
                        return (
                          <div className="bg-orange-50 rounded-[32px] p-6 border border-orange-100 flex flex-col justify-between text-center min-h-[220px]">
                            <div>
                              <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest block mb-1">TASTE PROFILE TRAINER</span>
                              <p className="text-xs font-black text-stone-900 uppercase leading-snug pt-0.5">HOW WAS YOUR RECENT {recentCooked.toUpperCase()}?</p>
                            </div>

                            <div className="flex gap-2.5 justify-center py-2">
                              <button
                                onClick={() => {
                                  let updatedDisliked = [...state.preferences.disliked];
                                  if (!updatedDisliked.includes(recentCooked)) {
                                    updatedDisliked.push(recentCooked);
                                    const newState = {
                                      ...state,
                                      preferences: { ...state.preferences, disliked: updatedDisliked }
                                    };
                                    setState(newState);
                                  }
                                }}
                                className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer border border-stone-200"
                                title="Dislike ingredient"
                              >
                                👎
                              </button>
                              <button
                                onClick={() => {
                                  const newState = {
                                    ...state,
                                    preferences: {
                                      ...state.preferences,
                                      liked: state.preferences.liked.filter(i => i !== recentCooked),
                                      disliked: state.preferences.disliked.filter(i => i !== recentCooked)
                                    }
                                  };
                                  setState(newState);
                                }}
                                className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer border border-stone-200"
                                title="Neutral"
                              >
                                😐
                              </button>
                              <button
                                onClick={() => {
                                  let updatedLiked = [...state.preferences.liked];
                                  if (!updatedLiked.includes(recentCooked)) {
                                    updatedLiked.push(recentCooked);
                                    const newState = {
                                      ...state,
                                      preferences: { ...state.preferences, liked: updatedLiked }
                                    };
                                    setState(newState);
                                  }
                                }}
                                className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer border border-stone-200"
                                title="Like ingredient"
                              >
                                👍
                              </button>
                            </div>

                            <div className="text-[9px] text-orange-600/70 font-bold uppercase tracking-widest">
                              Learning pref history...
                            </div>
                          </div>
                        );
                      })()}

                    </div>

                  </div>
                ) : null}

              </div>
            )}

            {/* INVENTORY FRIDGE MANAGEMENT SCREEN VIEW */}
            {activeTab === 'inventory' && (
              <div className="animate-fade-in">
                <FridgeManager
                  fridge={state.fridge}
                  pantryDefaults={state.pantryDefaults}
                  preferences={state.preferences}
                  onAddIngredient={handleAddFridgeItem}
                  onRemoveIngredient={handleRemoveFridgeItem}
                  onToggleExpiring={handleToggleExpiringItem}
                  onUpdatePantry={handleUpdatePantry}
                  onUpdatePreferences={handleUpdatePreferences}
                />
              </div>
            )}

            {/* STANDING SETTINGS SCREEN VIEW */}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-[32px] p-6 border border-stone-200 shadow-xs space-y-5 animate-fade-in">
                <h3 className="font-sans font-black text-[#1c1c1a] text-xl">App Settings</h3>
                
                <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-semibold">
                  
                  {/* Budget Limit range */}
                  <div className="space-y-1">
                    <label className="text-xs uppercase text-stone-400 font-bold tracking-wider block">Default Grocery Budget Limit</label>
                    <p className="text-[10px] text-stone-400 font-semibold mb-2">Used to warn you if required ingredient cost exceeds this budget</p>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="10"
                        max="150"
                        step="5"
                        value={settingBudget}
                        onChange={(e) => setSettingBudget(Number(e.target.value))}
                        className="flex-1 accent-orange-500 bg-stone-100 rounded-lg h-1.5 cursor-pointer"
                      />
                      <span className="font-mono text-sm block min-w-[50px] text-right font-bold bg-stone-50 py-1.5 px-3 rounded-lg border border-stone-100">
                        {settingCurrency} {settingBudget}
                      </span>
                    </div>
                  </div>

                  {/* Currency selector */}
                  <div className="space-y-1">
                    <label className="text-xs uppercase text-stone-400 font-bold tracking-wider block">Currency Code</label>
                    <select 
                      value={settingCurrency} 
                      onChange={(e) => setSettingCurrency(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200/80 outline-hidden rounded-xl px-3 py-2.5 font-medium cursor-pointer"
                    >
                      <option value="AUD">AUD ($)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>

                  {/* Local grocery store lists selector */}
                  <div className="space-y-2">
                    <label className="text-xs uppercase text-stone-400 font-bold tracking-wider block">Nominated Local Grocery Stores</label>
                    <p className="text-[10px] text-stone-400 font-semibold mb-2">Check the supermarkets near you to compare prices</p>
                    
                    {['Woolworths', 'Coles', 'Aldi', 'Harris Farm', 'IGA'].map(store => (
                      <label key={store} className="flex items-center gap-2.5 py-1 text-sm font-medium text-stone-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settingStores.includes(store)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSettingStores([...settingStores, store]);
                            } else {
                              setSettingStores(settingStores.filter(s => s !== store));
                            }
                          }}
                          className="accent-orange-500 w-4 h-4 rounded-md"
                        />
                        <span>{store}</span>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => setActiveTab('tonight')}
                      className="flex-1 border border-stone-200 font-bold py-3 rounded-xl hover:bg-stone-50 transition-all text-stone-600 block text-center cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all shadow-sm block text-center cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>

                </form>
              </div>
            )}

          </main>

        </div>

        {/* Global Footer Navigation dock for mobile frame */}
        <nav className="fixed md:absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md px-6 py-4.5 border-t border-stone-200/50 flex justify-around select-none md:hidden z-20">
          <button 
            onClick={() => setActiveTab('tonight')}
            className={`flex flex-col items-center gap-1.5 cursor-pointer ${
              activeTab === 'tonight' ? 'text-orange-600 scale-105 font-black' : 'text-stone-400 hover:text-stone-700'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[10px] font-extrabold uppercase tracking-wide">Suggestions</span>
          </button>

          <button 
            onClick={() => setActiveTab('inventory')}
            className={`flex flex-col items-center gap-1.5 cursor-pointer ${
              activeTab === 'inventory' ? 'text-orange-600 scale-105 font-black' : 'text-stone-400 hover:text-stone-700'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-extrabold uppercase tracking-wide">Fridge</span>
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1.5 cursor-pointer ${
              activeTab === 'settings' ? 'text-orange-600 scale-105 font-black' : 'text-stone-400 hover:text-stone-700'
            }`}
          >
            <Sliders className="w-5 h-5" />
            <span className="text-[10px] font-extrabold uppercase tracking-wide">Settings</span>
          </button>
        </nav>

        {/* Audit Weekly Modal triggers */}
        {weeklyAuditOpen && (
          <WeeklyCheck
            inventory={state.fridge}
            onConfirmInventory={(confirmed) => {
              setState(prev => ({
                ...prev,
                fridge: confirmed
              }));
            }}
            onClose={() => setWeeklyAuditOpen(false)}
          />
        )}

        {/* Shopping list triggers modal */}
        {shoppingIngredients && (
          <ShoppingModal
            missingIngredients={shoppingIngredients}
            settings={state.settings}
            onClose={() => setShoppingIngredients(null)}
          />
        )}

      </div>
    </div>
  );
}
