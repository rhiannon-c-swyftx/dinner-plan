import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Loader2, Sparkles, Globe, Utensils, Flame } from "lucide-react";

interface CookingLoaderProps {
  ingredients: string[];
}

const SEARCH_STEPS = [
  { id: "query", text: "Formulating culinary search queries...", icon: Search },
  { id: "web", text: "Searching the internet for recipes...", icon: Globe },
  { id: "blog", text: "Analyzing highly-rated culinary posts...", icon: Sparkles },
  { id: "simmer", text: "Simmering findings and tasting virtually...", icon: Flame },
  { id: "plate", text: "Plating three customized suggestions...", icon: Utensils },
];

export function CookingLoader({ ingredients }: CookingLoaderProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  useEffect(() => {
    // Cycle through steps every 1800ms
    const interval = setInterval(() => {
      setCurrentStepIdx((prev) => (prev < SEARCH_STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const displayedIngredients = ingredients.slice(0, 4);
  const remainingCount = ingredients.length - displayedIngredients.length;

  return (
    <div className="p-8 md:p-12 border rounded-[32px] bg-white border-stone-200/80 text-center space-y-8 shadow-xs relative overflow-hidden">
      {/* Background soft glow decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-orange-100/30 rounded-full blur-3xl -z-10 animate-pulse" />

      {/* Hero Visual: Sauté Pan & Steam Simulating Pure CSS */}
      <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
        {/* Pulsing glow under pan */}
        <div className="absolute inset-0 bg-orange-500/5 rounded-full animate-ping duration-1500" />
        
        {/* Main Cooking Station Container */}
        <div className="relative">
          {/* Steam vectors rising */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex space-x-1.5 h-6 overflow-hidden">
            <span className="w-1.5 bg-orange-200 rounded-full animate-bounce" style={{ animationDelay: "0ms", animationDuration: "1200ms" }} />
            <span className="w-1.5 bg-orange-300 rounded-full animate-bounce" style={{ animationDelay: "200ms", animationDuration: "1000ms" }} />
            <span className="w-1.5 bg-orange-200 rounded-full animate-bounce" style={{ animationDelay: "400ms", animationDuration: "1400ms" }} />
          </div>

          {/* Sauté Skillet Icon / Flame Loop */}
          <motion.div
            animate={{
              y: [0, -4, 0],
              rotate: [0, 2, -2, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 2.5,
              ease: "easeInOut",
            }}
            className="w-20 h-20 bg-stone-900 shadow-lg rounded-2xl flex items-center justify-center text-white border-2 border-stone-800"
          >
            <div className="relative">
              <Flame className="w-10 h-10 text-orange-500 fill-orange-500/20 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white text-stone-900 rounded-full flex items-center justify-center border border-stone-900">
                <Loader2 className="w-2.5 h-2.5 animate-spin text-orange-500" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Title & Rotating Messages */}
      <div className="space-y-4 max-w-sm mx-auto">
        <h3 className="text-xl font-extrabold text-stone-900 tracking-tight leading-none">
          Cooking up suggestions...
        </h3>

        {/* Dynamic State Status Line */}
        <div className="min-h-[44px] flex items-center justify-center px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepIdx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-2 text-stone-600 font-bold text-xs"
            >
              {(() => {
                const StepIcon = SEARCH_STEPS[currentStepIdx].icon;
                return <StepIcon className="w-4 h-4 text-orange-500 flex-shrink-0 animate-pulse" />;
              })()}
              <span className="leading-snug">{SEARCH_STEPS[currentStepIdx].text}</span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Internet Search Ingredient Target Indicators */}
      {ingredients.length > 0 && (
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/50 max-w-sm mx-auto space-y-2.5">
          <p className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wider text-center">
            Internet Search Parameters
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {displayedIngredients.map((item, idx) => (
              <span
                key={idx}
                className="text-[11px] bg-white text-stone-700 font-bold px-2.5 py-1 rounded-lg border border-stone-200/60 shadow-2xs capitalize"
              >
                🔍 {item}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="text-[11px] bg-orange-50 text-orange-700 font-extrabold px-2 py-1 rounded-lg border border-orange-100 shadow-2xs">
                + {remainingCount} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Interactive Progress Bar */}
      <div className="w-full max-w-xs mx-auto space-y-1.5">
        <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: "5%" }}
            animate={{ width: `${((currentStepIdx + 1) / SEARCH_STEPS.length) * 100}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
          />
        </div>
        <div className="flex justify-between text-[9px] text-stone-400 font-black uppercase tracking-wider">
          <span>Search Start</span>
          <span>Plating</span>
        </div>
      </div>
    </div>
  );
}
