import React, { useState } from 'react';
import { ChefHat, ArrowRight, Sparkles, Check } from 'lucide-react';

interface OnboardingProps {
  onComplete: (firstIngredients: string[]) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([
    'chicken breast', 'eggs', 'spinach', 'tomatoes', 'ground beef', 'avocado'
  ]);
  const [selected, setSelected] = useState<string[]>([]);

  const handleToggleSuggest = (item: string) => {
    if (selected.includes(item)) {
      setSelected(selected.filter(i => i !== item));
    } else {
      setSelected([...selected, item]);
    }
  };

  const handleNext = () => {
    // Collect typed items
    const typed = inputValue
      .split(',')
      .map(i => i.trim().toLowerCase())
      .filter(i => i.length > 0);
    
    // Combine typed + selected suggested items
    const combined = Array.from(new Set([...typed, ...selected]));
    onComplete(combined);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNext();
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-50 z-50 flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="max-w-md w-full space-y-8 text-center">
        
        {/* App Logo Emblem */}
        <div className="mx-auto w-16 h-16 bg-stone-900 rounded-2xl flex items-center justify-center text-white shadow-md">
          <ChefHat className="w-8 h-8" />
        </div>

        <div className="space-y-3">
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-stone-950">
            Dinner Planner
          </h1>
          <p className="text-stone-500 font-medium text-sm leading-relaxed max-w-xs mx-auto">
            Zero setup. Seamless suggestions. Let's cook with what is currently available.
          </p>
        </div>

        {/* Big Onboarding Card */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-md space-y-6 text-left">
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
              Question 1 of 1
            </label>
            <h2 className="font-display font-bold text-xl text-stone-900">
              What's in your fridge?
            </h2>
            <p className="text-xs text-stone-400 font-medium">
              Enter ingredients, separated by commas (e.g. eggs, spinach, bacon)
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="e.g. chicken breast, broccoli, cheddar"
              className="w-full bg-stone-50 border border-stone-200/80 focus:border-stone-900 focus:bg-white outline-hidden rounded-xl px-4 py-3.5 text-stone-900 text-sm transition-all shadow-xs font-medium"
            />

            {/* Quick selectors */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                Or tap popular items:
              </span>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((item) => {
                  const isSelected = selected.includes(item);
                  return (
                    <button
                      key={item}
                      onClick={() => handleToggleSuggest(item)}
                      className={`text-xs px-3 py-2 rounded-xl border transition-all flex items-center gap-1 cursor-pointer font-medium capitalize ${
                        isSelected
                          ? 'bg-stone-950 border-stone-950 text-white shadow-xs'
                          : 'bg-stone-50 border-stone-100 hover:border-stone-200 text-stone-600'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleNext}
              className="w-full bg-stone-900 text-white hover:bg-stone-800 font-medium py-3.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 text-sm"
            >
              <span>Generate Recipes</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Defaults info footer */}
          <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-stone-400 leading-normal">
              We assumed standard spices, olive oil, salt, pepper, rice, and garlic are already in your pantry. You can edit defaults anytime in Settings.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
