import React, { useState } from 'react';
import { 
  Plus, Trash2, Calendar, AlertOctagon, Heart, ChevronRight, 
  Flame, ScanLine, RotateCcw, Check, Sparkles, BookOpen, AlertTriangle
} from 'lucide-react';
import { FridgeItem, UserPreferences } from '../types';

interface FridgeManagerProps {
  fridge: FridgeItem[];
  pantryDefaults: string[];
  preferences: UserPreferences;
  onAddIngredient: (name: string) => void;
  onRemoveIngredient: (id: string) => void;
  onToggleExpiring: (id: string) => void;
  onUpdatePantry: (updated: string[]) => void;
  onUpdatePreferences: (updatedPref: UserPreferences) => void;
}

export default function FridgeManager({
  fridge,
  pantryDefaults,
  preferences,
  onAddIngredient,
  onRemoveIngredient,
  onToggleExpiring,
  onUpdatePantry,
  onUpdatePreferences
}: FridgeManagerProps) {
  const [typedName, setTypedName] = useState('');
  const [typedStaple, setTypedStaple] = useState('');
  const [typedLiked, setTypedLiked] = useState('');
  const [typedDisliked, setTypedDisliked] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const barcodeItemsPool = [
    'Pasta sauce', 'Heavy cream', 'Pork ribs', 'Coriander bunch', 'Avocado', 
    'Ground beef mince', 'Fresh salmon fillets', 'Smoked bacon', 'Broccoli floret', 'Parmesan block'
  ];

  const handleAddFridge = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedName.trim()) {
      onAddIngredient(typedName.trim());
      setTypedName('');
    }
  };

  const handleAddStaple = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedStaple.trim() && !pantryDefaults.includes(typedStaple.trim().toLowerCase())) {
      onUpdatePantry([...pantryDefaults, typedStaple.trim().toLowerCase()]);
      setTypedStaple('');
    }
  };

  const handleAddPreference = (type: 'liked' | 'disliked', name: string) => {
    const list = type === 'liked' ? [...preferences.liked] : [...preferences.disliked];
    if (name.trim() && !list.includes(name.trim().toLowerCase())) {
      list.push(name.trim().toLowerCase());
      onUpdatePreferences({
        ...preferences,
        [type]: list
      });
    }
  };

  const handleRemovePreference = (type: 'liked' | 'disliked', item: string) => {
    const list = type === 'liked' ? [...preferences.liked] : [...preferences.disliked];
    onUpdatePreferences({
      ...preferences,
      [type]: list.filter(i => i !== item)
    });
  };

  const simulateBarcodeScan = () => {
    setScanning(true);
    setScanResult(null);
    setTimeout(() => {
      const idx = Math.floor(Math.random() * barcodeItemsPool.length);
      const chosen = barcodeItemsPool[idx];
      setScanning(false);
      setScanResult(chosen);
      onAddIngredient(chosen);
    }, 1800);
  };

  return (
    <div className="space-y-6">
      
      {/* Search Input Quick Add */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
        <h4 className="font-display font-bold text-stone-900 text-lg">Quick-Add Ingredient</h4>
        
        <form onSubmit={handleAddFridge} className="flex gap-2">
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Type ingredient name (e.g. cherry tomatoes)"
            className="flex-1 bg-stone-50 border border-stone-200/80 focus:border-stone-900 focus:bg-white outline-hidden rounded-xl px-4 py-2.5 text-stone-900 text-sm transition-all font-medium"
          />
          <button
            type="submit"
            className="bg-stone-950 text-white px-4 rounded-xl hover:bg-stone-850 transition-colors flex items-center justify-center"
          >
            <Plus className="w-5 h-5" />
          </button>
        </form>

        {/* Barcode scan simulator */}
        <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium">
            <ScanLine className="w-4 h-4 text-stone-400" />
            <span>Simulate packaging barcode scan</span>
          </div>
          <button
            onClick={simulateBarcodeScan}
            disabled={scanning}
            className={`text-xs font-bold border rounded-lg px-3 py-1.5 flex items-center gap-1 cursor-pointer transition-all ${
              scanning 
                ? 'bg-stone-100 border-stone-200 text-stone-400' 
                : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            {scanning ? 'Sensing...' : 'Scan Barcode'}
          </button>
        </div>

        {scanResult && (
          <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-xl text-xs border border-emerald-100 flex items-center gap-2 animate-fade-in font-medium">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Successfully scanned: <strong className="capitalize">{scanResult}</strong> added to fridge list.</span>
          </div>
        )}
      </div>

      {/* Live fridge list */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h4 className="font-display font-bold text-stone-900 text-lg">My Fridge Items ({fridge.length})</h4>
            <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">Tap flame button or hold to toggle expiring warning</p>
          </div>
        </div>

        {fridge.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-sm text-stone-400 font-medium">Your fridge is empty!</p>
            <p className="text-xs text-stone-400 leading-normal max-w-xs mx-auto">
              Suggested: Tap "Start Fresh list" inside Tonight's suggestions dashboard, or enter articles.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 select-none">
            {fridge.map((item) => (
              <div 
                key={item.id}
                className="p-3.5 flex items-center justify-between hover:bg-stone-50/50 transition-colors"
              >
                {/* Info */}
                <div 
                  className="flex items-center gap-2.5 cursor-pointer flex-1"
                  onClick={() => onToggleExpiring(item.id)}
                >
                  <button 
                    className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                      item.flaggedExpiring 
                        ? 'bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100' 
                        : 'bg-stone-100 border-stone-200/60 text-stone-400 hover:text-rose-500'
                    }`}
                    title={item.flaggedExpiring ? "Expiring soon warning active" : "Mark as expiring soon"}
                  >
                    <Flame className={`w-4 h-4 ${item.flaggedExpiring ? 'animate-pulse' : ''}`} />
                  </button>
                  <div>
                    <span className="text-sm font-semibold capitalize text-stone-900 block">{item.name}</span>
                    <span className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      In details: {new Date(item.addedDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Remove */}
                <button
                  onClick={() => onRemoveIngredient(item.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assumed Pantry Staples */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
        <div className="space-y-0.5">
          <h4 className="font-display font-bold text-stone-900 text-lg">Assumed Pantry Defaults</h4>
          <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">Assumed ingredients that are always available by default</p>
        </div>

        <form onSubmit={handleAddStaple} className="flex gap-2">
          <input
            type="text"
            value={typedStaple}
            onChange={(e) => setTypedStaple(e.target.value)}
            placeholder="Add pantry default (e.g. olive oil)"
            className="flex-1 bg-stone-50 border border-stone-200/80 focus:border-stone-900 focus:bg-white outline-hidden rounded-xl px-3 py-2 text-stone-900 text-xs font-medium"
          />
          <button
            type="submit"
            className="bg-stone-100 text-stone-700 px-3.5 rounded-xl hover:bg-stone-900 hover:text-white transition-all text-xs font-bold"
          >
            Add
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {pantryDefaults.map((staple) => (
            <span 
              key={staple}
              className="text-xs bg-stone-50 border border-stone-200/60 rounded-lg px-2.5 py-1 text-stone-700 capitalize flex items-center gap-1 font-medium"
            >
              <span>{staple}</span>
              <button 
                onClick={() => onUpdatePantry(pantryDefaults.filter(s => s !== staple))}
                className="text-stone-300 hover:text-stone-700 ml-1 font-bold"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Preferences Profile Management */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs space-y-5">
        <h4 className="font-display font-bold text-stone-900 text-lg">My Food Taste Settings</h4>
        
        {/* Liked list */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Loved Ingredients / Tastes</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={typedLiked}
              onChange={(e) => setTypedLiked(e.target.value)}
              placeholder="e.g. Chilli, Coconut"
              className="flex-1 bg-stone-50 border border-stone-200/80 outline-hidden rounded-xl px-3 py-1.5 text-xs text-stone-900"
            />
            <button
              onClick={() => {
                if (typedLiked.trim()) {
                  handleAddPreference('liked', typedLiked);
                  setTypedLiked('');
                }
              }}
              className="bg-emerald-50 text-emerald-700 px-3 rounded-xl hover:bg-emerald-600 hover:text-white transition-all text-xs font-bold"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {preferences.liked.length === 0 ? (
              <span className="text-[10px] text-stone-400 italic">No preferred ingredients registered. Click UP ratings to auto-train.</span>
            ) : (
              preferences.liked.map((item) => (
                <span key={item} className="bg-emerald-50 text-emerald-800 text-xs rounded-lg px-2 py-0.5 capitalize font-semibold flex items-center gap-1 border border-emerald-100">
                  {item}
                  <button onClick={() => handleRemovePreference('liked', item)} className="text-emerald-400 hover:text-emerald-900">×</button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Disliked list */}
        <div className="space-y-3 pt-3 border-t border-stone-100">
          <label className="text-xs font-bold text-rose-800 uppercase tracking-wider block">Disliked / Excluded items</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={typedDisliked}
              onChange={(e) => setTypedDisliked(e.target.value)}
              placeholder="e.g. Cilantro, Blue cheese"
              className="flex-1 bg-stone-50 border border-stone-200/80 outline-hidden rounded-xl px-3 py-1.5 text-xs text-stone-900"
            />
            <button
              onClick={() => {
                if (typedDisliked.trim()) {
                  handleAddPreference('disliked', typedDisliked);
                  setTypedDisliked('');
                }
              }}
              className="bg-rose-50 text-rose-700 px-3 rounded-xl hover:bg-rose-600 hover:text-white transition-all text-xs font-bold"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {preferences.disliked.length === 0 ? (
              <span className="text-[10px] text-stone-400 italic">No disliked items registered. Any suggested recipe containing registered dislikes will show warnings.</span>
            ) : (
              preferences.disliked.map((item) => (
                <span key={item} className="bg-rose-50 text-rose-800 text-xs rounded-lg px-2 py-0.5 capitalize font-semibold flex items-center gap-1 border border-rose-100">
                  {item}
                  <button onClick={() => handleRemovePreference('disliked', item)} className="text-rose-400 hover:text-rose-900">×</button>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
