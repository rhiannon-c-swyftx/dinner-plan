import React, { useState } from 'react';
import { 
  CheckCircle, PlusCircle, Clock, ChevronDown, ChevronUp, AlertCircle, 
  Flame, Sparkles, ThumbsUp, ThumbsDown, Smile, ShoppingCart, BookOpen
} from 'lucide-react';
import { Recipe, RatedRecipe } from '../types';

interface RecipeCardProps {
  key?: string | number;
  recipe: Recipe;
  onShopForThis: (missing: string[]) => void;
  onRateRecipe: (recipeId: string, rating: 'up' | 'meh' | 'down', feedbackAnswer?: string) => void;
  onCookCompleted: (usedIngredients: string[]) => void;
}

export default function RecipeCard({ recipe, onShopForThis, onRateRecipe, onCookCompleted }: RecipeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [cookingMode, setCookingMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [selectedRating, setSelectedRating] = useState<'up' | 'meh' | 'down' | null>(null);
  const [completedStepsState, setCompletedStepsState] = useState<boolean[]>(
    new Array(recipe.steps.length).fill(false)
  );

  // Micro-questions based on recipe context
  const getMicroQuestion = () => {
    const titleLower = recipe.title.toLowerCase();
    if (titleLower.includes('spicy') || titleLower.includes('chilli')) {
      return "Was the heat level just right?";
    }
    if (titleLower.includes('garlic')) {
      return "Would you add even more garlic next time?";
    }
    if (titleLower.includes('lemon') || titleLower.includes('zesty')) {
      return "Was it too sour or zesty for your palate?";
    }
    return "Would you make this recipe again next week?";
  };

  const handleStepToggle = (index: number) => {
    const updated = [...completedStepsState];
    updated[index] = !updated[index];
    setCompletedStepsState(updated);
  };

  const handleFinishCooking = () => {
    // Deplete used items in parent state
    // Highlight that we're going to rating mode in-card
    setCookingMode(false);
    setRatingSubmitted(true);
  };

  const handleRating = (rating: 'up' | 'meh' | 'down') => {
    setSelectedRating(rating);
  };

  const handleMicroAnswer = (answer: string) => {
    if (selectedRating) {
      onRateRecipe(recipe.id, selectedRating, answer);
    }
    // Deplete used ingredients in main fridge state
    onCookCompleted(recipe.have);
    // Reset state
    setRatingSubmitted(false);
    setSelectedRating(null);
    setExpanded(false);
  };

  return (
    <div className={`bg-white rounded-[32px] overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 animate-fade-in ${
      recipe.combinedScore >= 0.8 ? 'border-2 border-orange-500' : 'border border-stone-200'
    }`}>
      
      {/* Top Banner with Scores */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-3.5">
          <div className="flex flex-wrap gap-1.5 max-w-[70%]">
            <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border flex items-center gap-1 ${
              recipe.combinedScore >= 0.8 
                ? 'bg-orange-100 text-orange-700 border-orange-200' 
                : 'bg-stone-50 text-stone-500 border-stone-200/60'
            }`}>
              <Sparkles className="w-2.5 h-2.5" />
              {recipe.combinedScore >= 0.8 ? "Tonight's Best Bet" : "Great Alternative"}
            </span>
            {recipe.expiringIngredientsUsed.length > 0 && (
              <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full uppercase tracking-wider border border-red-200 flex items-center gap-1 animate-pulse">
                <Flame className="w-2.5 h-2.5" />
                Expiring Used
              </span>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <span className={`text-xs font-black px-3 py-1 rounded-full select-none ${
              recipe.combinedScore >= 0.8 ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-900'
            }`}>
              {Math.round(recipe.combinedScore * 100)}% MATCH
            </span>
          </div>
        </div>

        <h3 className="font-sans font-extrabold text-2xl text-stone-900 capitalize tracking-tight leading-snug">
          {recipe.title}
        </h3>
        
        <p className="text-stone-500 text-sm leading-relaxed mt-2.5">
          {recipe.description}
        </p>
      </div>

      {/* Warnings block */}
      {recipe.preferenceWarnings.length > 0 && (
        <div className="mx-6 mb-4 bg-amber-50 rounded-2xl p-3.5 border border-amber-200/60 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5">
            {recipe.preferenceWarnings.map((warning, idx) => (
              <p key={idx} className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">
                {warning}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Ingredient Statistics Bar - Bento Grid Style Segment */}
      <div className="mx-6 p-4 rounded-2xl bg-stone-50 border border-stone-150 flex items-center justify-between text-xs font-bold font-sans">
        <div className="text-center flex-1">
          <span className="text-[9px] uppercase text-stone-400 block tracking-widest mb-1">Have</span>
          <span className="text-green-600 text-sm font-black">✓ {recipe.have.length} item{recipe.have.length === 1 ? '' : 's'}</span>
        </div>
        <div className="border-r border-stone-200 h-8 mx-2" />
        <div className="text-center flex-1">
          <span className="text-[9px] uppercase text-stone-400 block tracking-widest mb-1">Need To Buy</span>
          <span className={`text-sm font-black ${recipe.missing.length > 0 ? "text-orange-600" : "text-stone-400"}`}>
            {recipe.missing.length > 0 ? `+ ${recipe.missing.length} missing` : 'None!'}
          </span>
        </div>
        <div className="border-r border-stone-200 h-8 mx-2" />
        <div className="text-center flex-1">
          <span className="text-[9px] uppercase text-stone-400 block tracking-widest mb-1">Taste Match</span>
          <span className="text-stone-800 text-sm font-black">{Math.round(recipe.tasteMatch * 100)}%</span>
        </div>
      </div>

      {/* Quick Info bar */}
      <div className="px-6 py-4 flex items-center justify-between text-xs text-stone-500 font-bold">
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-stone-400" />
          <span>Ready in {recipe.cookTimeMinutes} mins</span>
        </div>
        
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-orange-600 hover:text-orange-700 transition-colors"
        >
          <span>{expanded ? 'Hide Details' : 'View Details'}</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-stone-100 bg-stone-50/50 p-6 space-y-6 animate-fade-in max-h-[500px] overflow-y-auto">
          
          {/* Missing Ingredients Section */}
          {recipe.missing.length > 0 ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-widest block">
                  Missing Ingredients
                </span>
                <span className="text-[10px] font-mono font-bold bg-orange-100 text-orange-850 px-2 py-0.5 rounded-md">
                  Est: ${recipe.missingEstimatedCost.toFixed(2)}
                </span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-stone-250/50 space-y-3.5">
                <div className="flex flex-wrap gap-1.5">
                  {recipe.missing.map((item, idx) => (
                    <span 
                      key={idx} 
                      className="text-xs bg-orange-50 text-orange-900 border border-orange-100 px-3 py-1.5 rounded-xl capitalize font-bold flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-orange-500" />
                      {item}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => onShopForThis(recipe.missing)}
                  className="w-full flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 active:scale-98 text-white transition-all py-3 rounded-xl text-xs font-bold mt-2 cursor-pointer shadow-xs"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Shop for missing items</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 p-4 rounded-2xl text-center">
              <p className="text-xs text-green-800 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                <span>🎉 Perfect Match! You have all ingredients</span>
              </p>
            </div>
          )}

          {/* possessed Ingredients */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-widest block">
              In Your Kitchen
            </span>
            <div className="flex flex-wrap gap-1.5">
              {recipe.have.map((item, idx) => {
                const isExpiring = recipe.expiringIngredientsUsed.includes(item);
                return (
                  <span 
                    key={idx} 
                    className={`text-xs px-3 py-1.5 rounded-xl capitalize font-semibold flex items-center gap-1.5 ${
                      isExpiring 
                        ? 'bg-rose-50 text-rose-900 border border-rose-200' 
                        : 'bg-white text-stone-700 border border-stone-200'
                    }`}
                  >
                    <CheckCircle className={`w-3.5 h-3.5 ${isExpiring ? 'text-red-500' : 'text-green-600'}`} />
                    <span>{item}</span>
                    {isExpiring && <span className="text-[9px] font-extrabold text-red-500 uppercase tracking-widest ml-1">(expiring)</span>}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Stepper cooking tool/instructions */}
          {!cookingMode ? (
            <div className="pt-2">
              <button
                onClick={() => setCookingMode(true)}
                className="w-full bg-stone-900 hover:bg-stone-850 active:scale-98 text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm cursor-pointer shadow-xs"
              >
                <BookOpen className="w-4 h-4" />
                <span>Start Cooking Mode</span>
              </button>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-3xl border border-stone-200 space-y-4 animate-fade-in shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Cooking Steps</span>
                <span className="text-xs font-mono font-black bg-orange-100 text-orange-850 px-2 py-1 rounded-md">
                  {completedStepsState.filter(Boolean).length}/{recipe.steps.length} Done
                </span>
              </div>

              {/* Steps checkbox checklist */}
              <div className="space-y-3">
                {recipe.steps.map((step, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleStepToggle(idx)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex gap-3 text-xs leading-relaxed ${
                      completedStepsState[idx]
                        ? 'bg-stone-50 border-stone-150 text-stone-400 line-through'
                        : 'bg-white border-stone-200 hover:border-orange-200 text-stone-850'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 transition-all flex-shrink-0 ${
                      completedStepsState[idx] 
                        ? 'bg-green-600 border-green-600 text-white' 
                        : 'border-stone-300'
                    }`}>
                      {completedStepsState[idx] && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="flex-1 font-semibold">{step}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setCookingMode(false)}
                  className="px-4 py-3 border border-stone-200 text-stone-500 font-bold hover:bg-stone-50 transition-colors rounded-xl text-xs cursor-pointer"
                >
                  Quit
                </button>
                <button
                  onClick={handleFinishCooking}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Meal Finished</span>
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Swipe meal completion ratings pop-up overlay */}
      {ratingSubmitted && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full border border-stone-250/50 shadow-xl text-center space-y-6 animate-fade-in">
            
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto text-orange-600">
              <Smile className="w-6 h-6" />
            </div>

            <div>
              <h4 className="font-sans font-black text-xl text-stone-900">How was your meal?</h4>
              <p className="text-xs text-stone-500 font-medium mt-1">Provide a simple rating to train your taste match AI profile.</p>
            </div>

            {!selectedRating ? (
              <div className="flex gap-2.5 w-full">
                <button
                  onClick={() => handleRating('down')}
                  className="flex-1 flex flex-col items-center gap-1 py-4 bg-red-50 hover:bg-red-100 border border-red-100 rounded-2xl text-red-700 transition-all font-bold text-xs cursor-pointer"
                >
                  <ThumbsDown className="w-5 h-5 mb-0.5" />
                  👎 Trash
                </button>
                <button
                  onClick={() => handleRating('meh')}
                  className="flex-1 flex flex-col items-center gap-1 py-4 bg-stone-50 hover:bg-stone-150 border border-stone-200 rounded-2xl text-stone-600 transition-all font-bold text-xs cursor-pointer"
                >
                  <Smile className="w-5 h-5 mb-0.5" />
                  😐 Meh
                </button>
                <button
                  onClick={() => handleRating('up')}
                  className="flex-1 flex flex-col items-center gap-1 py-4 bg-orange-50 hover:bg-orange-100 border border-orange-150 rounded-2xl text-orange-700 transition-all font-bold text-xs cursor-pointer"
                >
                  <ThumbsUp className="w-5 h-5 mb-0.5" />
                  👍 Loved It
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <p className="text-stone-850 text-xs font-bold bg-orange-50 py-1.5 px-3 rounded-full inline-block border border-orange-100 text-orange-850">
                  Your rating: <span className="capitalize text-orange-600 font-black">{selectedRating}</span>
                </p>
                <div className="space-y-3 text-left">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block text-center">Micro Match Refining</span>
                  <h5 className="font-sans font-extrabold text-sm text-stone-900 text-center">
                    {getMicroQuestion()}
                  </h5>
                  <div className="flex gap-2 pt-1.5">
                    <button
                      onClick={() => handleMicroAnswer('Yes')}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all text-xs text-center cursor-pointer shadow-xs"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => handleMicroAnswer('No')}
                      className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3 rounded-xl transition-all text-xs text-center cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!selectedRating && (
              <button
                onClick={() => {
                  setRatingSubmitted(false);
                  onCookCompleted([]);
                }}
                className="text-stone-400 hover:text-stone-900 text-xs font-bold block mx-auto pt-2 transition-all"
              >
                Skip Rating
              </button>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
