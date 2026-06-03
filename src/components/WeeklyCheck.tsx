import React, { useState } from 'react';
import { Check, X, RotateCcw, Award, AlertTriangle, Calendar } from 'lucide-react';
import { FridgeItem } from '../types';

interface WeeklyCheckProps {
  inventory: FridgeItem[];
  onConfirmInventory: (updatedInventory: FridgeItem[]) => void;
  onClose: () => void;
}

export default function WeeklyCheck({ inventory, onConfirmInventory, onClose }: WeeklyCheckProps) {
  const [items, setItems] = useState<Array<FridgeItem & { confirmed: boolean | null }>>(
    inventory.map(item => ({ ...item, confirmed: null }))
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleAction = (keep: boolean) => {
    const updated = [...items];
    updated[currentIndex].confirmed = keep;
    setItems(updated);
    
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Finished all items, apply inventory updates
      const confirmedItems = updated
        .filter(i => i.confirmed === true)
        .map(({ id, name, flaggedExpiring, addedDate }) => ({ id, name, flaggedExpiring, addedDate }));
      onConfirmInventory(confirmedItems);
    }
  };

  const handleReset = () => {
    setItems(inventory.map(item => ({ ...item, confirmed: null })));
    setCurrentIndex(0);
  };

  if (inventory.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl border border-stone-100 text-center">
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-display font-medium text-lg mb-2">No ingredients to check</h3>
          <p className="text-zinc-500 text-sm mb-6">
            Add some items to your fridge first before running a freshness check-in.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-stone-900 text-white font-medium py-3 rounded-xl hover:bg-stone-800 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  const isDone = currentIndex >= items.length || items[currentIndex]?.confirmed !== null;
  const currentItem = items[currentIndex];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-xl border border-stone-100 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div>
            <h3 className="font-display font-semibold text-stone-950">Weekly Fridge Audit</h3>
            <p className="text-xs text-stone-500 font-medium">Keep your inventory fresh & accurate</p>
          </div>
          <button 
            onClick={onClose}
            className="text-stone-400 hover:text-stone-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[280px]">
          {!isDone && currentItem ? (
            <div className="text-center w-full max-w-[260px] animate-fade-in flex flex-col items-center justify-center">
              {/* Progress Bar */}
              <div className="w-full bg-stone-100 h-1.5 rounded-full mb-8 relative overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${((currentIndex) / items.length) * 100}%` }}
                />
              </div>

              {/* Card Indicator */}
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full mb-4 uppercase tracking-wider">
                Item {currentIndex + 1} of {items.length}
              </span>

              {/* Name */}
              <h4 className="font-display font-bold text-2xl text-stone-900 mb-1 capitalize">
                {currentItem.name}
              </h4>
              
              {/* Added Date */}
              <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-6">
                <Calendar className="w-3.5 h-3.5" />
                <span>Added {new Date(currentItem.addedDate).toLocaleDateString()}</span>
              </div>

              <p className="text-sm text-stone-500 font-medium mb-8">
                Is this still in your fridge and fresh?
              </p>

              {/* Interactive buttons */}
              <div className="flex gap-4 w-full">
                <button
                  onClick={() => handleAction(false)}
                  className="flex-1 flex flex-col items-center justify-center gap-1 bg-red-50 text-red-600 hover:bg-red-100 py-3.5 rounded-2xl border border-red-100 transition-all font-medium text-sm"
                >
                  <X className="w-5 h-5 mb-0.5" />
                  <span>Gone / Empty</span>
                </button>
                <button
                  onClick={() => handleAction(true)}
                  className="flex-1 flex flex-col items-center justify-center gap-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 py-3.5 rounded-2xl border border-emerald-100 transition-all font-medium text-sm"
                >
                  <Check className="w-5 h-5 mb-0.5" />
                  <span>Still Fresh</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center w-full max-w-[260px]">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
                <Award className="w-8 h-8" />
              </div>
              <h4 className="font-display font-bold text-xl text-stone-900 mb-2">
                Audit Completed!
              </h4>
              <p className="text-sm text-stone-500 mb-6">
                Excellent. Your recipe suggestion accuracy has been improved by up to 34% based on active ingredients.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    const finalItems = items.filter(i => i.confirmed === true).map(({ id, name, flaggedExpiring, addedDate }) => ({ id, name, flaggedExpiring, addedDate }));
                    onConfirmInventory(finalItems);
                    onClose();
                  }}
                  className="w-full bg-emerald-600 text-white font-medium py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  Apply Updates
                </button>
                <button
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-2 text-stone-500 font-medium py-2 rounded-xl text-xs hover:text-stone-800 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart Audit</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
