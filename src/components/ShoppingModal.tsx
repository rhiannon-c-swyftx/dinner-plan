import React, { useState, useEffect } from 'react';
import { X, DollarSign, MapPin, Tag, ShoppingBag, TrendingUp, HelpCircle, ShieldAlert } from 'lucide-react';
import { ShoppingResponse, UserSettings } from '../types';

interface ShoppingModalProps {
  missingIngredients: string[];
  settings: UserSettings;
  onClose: () => void;
}

export default function ShoppingModal({ missingIngredients, settings, onClose }: ShoppingModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ShoppingResponse | null>(null);
  const [adHocBudget, setAdHocBudget] = useState<number>(settings.budget);
  const [error, setError] = useState<string | null>(null);

  const fetchComparison = async (currentBudget: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missingIngredients,
          groceryStores: settings.groceryStores,
          budget: currentBudget,
          currency: settings.currency || 'AUD'
        })
      });
      if (!response.ok) {
        throw new Error('Failed to retrieve store prices');
      }
      const json = await response.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong fetching store details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison(adHocBudget);
  }, [missingIngredients, settings.groceryStores]);

  const handleUpdateBudget = () => {
    fetchComparison(adHocBudget);
  };

  const getCurrencySymbol = (code: string) => {
    switch (code) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return '$'; // Default to AUD style $
    }
  };

  const currencySymbol = getCurrencySymbol(settings.currency);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-stone-50 rounded-3xl max-w-md w-full overflow-hidden shadow-xl border border-stone-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <ShoppingBag className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-stone-900 text-base">Local Shop Planner</h3>
              <p className="text-xs text-stone-500 font-medium">Smart route & price comparison</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Missing Ingredients Summary */}
        <div className="px-6 py-4 bg-emerald-50/60 border-b border-stone-100 flex items-center justify-between">
          <div className="flex-1">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block mb-1">
              Need To Buy ({missingIngredients.length})
            </span>
            <p className="text-sm font-medium text-stone-700 capitalize line-clamp-1">
              {missingIngredients.join(', ')}
            </p>
          </div>
        </div>

        {/* Scroll Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Ad-Hoc Budget Slider */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200/60 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-500 uppercase">Limit for this run</span>
              <span className="font-mono font-bold text-lg text-stone-800">
                {currencySymbol}{adHocBudget}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={adHocBudget}
                onChange={(e) => setAdHocBudget(Number(e.target.value))}
                className="flex-1 accent-stone-800 h-1 rounded-lg cursor-pointer bg-stone-200"
              />
              <button
                onClick={handleUpdateBudget}
                className="px-3 py-1.5 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-900 hover:text-white transition-all text-xs font-medium"
              >
                Apply
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10 space-y-3">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-stone-500 font-medium animate-pulse">Comparing prices at Woolworths, Coles & Aldi...</p>
            </div>
          ) : error ? (
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-amber-800 text-sm font-medium">
              {error}
            </div>
          ) : data ? (
            <div className="space-y-4">
              
              {/* Recommended box */}
              {data.recommendedStore && (
                <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xs space-y-1.5 animate-fade-in">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">AI Optimal Pick</span>
                  </div>
                  <h4 className="font-display font-bold text-lg">{data.recommendedStore}</h4>
                  <p className="text-xs text-emerald-100 leading-relaxed font-medium">
                    {data.recommendationReason}
                  </p>
                </div>
              )}

              {/* Stores comparison lists */}
              <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Competitor Analysis</h4>
              <div className="space-y-3">
                {data.stores.map((store, i) => {
                  const overBudget = store.totalCost > adHocBudget;
                  return (
                    <div 
                      key={store.name}
                      className={`bg-white p-4 rounded-2xl border transition-all ${
                        store.name === data.recommendedStore 
                          ? 'border-emerald-500 shadow-sm ring-1 ring-emerald-500/20' 
                          : 'border-stone-200/70 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-display font-bold text-stone-900 text-base">{store.name}</h5>
                            {store.name === data.recommendedStore && (
                              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-100">
                                Value Win
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-stone-500 mt-1 font-medium">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {store.distanceKm} km away
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`font-mono font-bold text-base block ${overBudget ? 'text-rose-600' : 'text-stone-900'}`}>
                            {currencySymbol}{store.totalCost.toFixed(2)}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider rounded-sm px-1 py-0.5 ${
                            overBudget ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {overBudget ? 'Over Budget' : 'Safe'}
                          </span>
                        </div>
                      </div>

                      {/* Store Specials list */}
                      {store.specials && store.specials.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-stone-100 space-y-1.5">
                          <span className="text-[10px] text-orange-600 font-bold uppercase tracking-wide flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            Store-Specific Deals
                          </span>
                          {store.specials.map((spec, sI) => (
                            <p key={sI} className="text-xs text-stone-600 font-medium">
                              {spec}
                            </p>
                          ))}
                        </div>
                      )}

                      {overBudget && (
                        <div className="mt-2 text-[10px] text-rose-500 font-medium flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 flex-shrink-0" />
                          <span>Exceeds active budget setting of {currencySymbol}{adHocBudget}.</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          ) : null}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 bg-white">
          <button
            onClick={onClose}
            className="w-full bg-stone-900 text-white hover:bg-stone-800 font-medium py-3 rounded-xl transition-all text-sm block text-center"
          >
            Finished Planning
          </button>
        </div>

      </div>
    </div>
  );
}
