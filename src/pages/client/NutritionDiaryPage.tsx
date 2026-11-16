import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Apple,
  Check,
  ChevronDown,
  Droplets,
  Dumbbell,
  Flame,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../../components/layout/AppShell';
import { GlassButton } from '../../components/ui/GlassButton';
import {
  computeNutritionTotals,
  INDIAN_FOOD_DATABASE,
  NUTRITION_DISCLAIMER,
  NUTRITION_SLOT_LABELS,
  scaleFoodToLoggedItem,
} from '../../data/indianFoods';
import type { LoggedFoodItem, NutritionDiaryEntry, NutritionMealSlot } from '../../types/domain';
import { uid } from '../../lib/engines';

export const NutritionDiaryPage: React.FC = () => {
  const {
    todayKey,
    activeClient,
    activeCoach,
    nutritionLogs,
    todayHydrationGlasses,
    setTodayHydrationGlasses,
    saveNutritionDiaryEntry,
  } = useApp();

  // Find or initialize today's diary entry
  const todayEntry = useMemo(() => {
    return nutritionLogs.find(
      (l) => (!activeClient || l.clientId === activeClient.id) && l.dateKey === todayKey,
    );
  }, [nutritionLogs, activeClient, todayKey]);

  const [items, setItems] = useState<LoggedFoodItem[]>(() => todayEntry?.items || []);
  const [completedSlots, setCompletedSlots] = useState<NutritionMealSlot[]>(
    () => todayEntry?.completedSlots || [],
  );
  const [waterGlasses, setWaterGlasses] = useState<number>(() => todayEntry?.waterGlasses || todayHydrationGlasses || 8);
  const [personalNotes, setPersonalNotes] = useState<string>(() => todayEntry?.personalNotes || '');

  // Food Picker Modal State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<NutritionMealSlot>('breakfast');
  const [searchFoodQuery, setSearchFoodQuery] = useState('');
  const [selectedFoodCategory, setSelectedFoodCategory] = useState<string>('all');
  const [portionMultiplier, setPortionMultiplier] = useState<number>(1.0);

  // Custom Item Quick Add State
  const [showCustomAdd, setShowCustomAdd] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');

  // Daily totals
  const totals = useMemo(() => {
    return computeNutritionTotals(items);
  }, [items]);

  // Target goals (typical 2000-2200 kcal Indian active lifestyle baseline)
  const targetKcal = 2100;
  const targetProteinG = 120;
  const targetWaterGlasses = 8;

  const handleSaveDiary = (
    nextItems = items,
    nextSlots = completedSlots,
    nextWater = waterGlasses,
    nextNotes = personalNotes,
  ) => {
    const entryPayload = {
      id: todayEntry?.id,
      clientId: activeClient?.id || 'cl_aarav',
      dateKey: todayKey,
      completedSlots: nextSlots,
      items: nextItems,
      waterGlasses: nextWater,
      personalNotes: nextNotes,
    };
    saveNutritionDiaryEntry(entryPayload);
  };

  const handleToggleSlotCompleted = (slot: NutritionMealSlot) => {
    const isCompleted = completedSlots.includes(slot);
    const updated = isCompleted
      ? completedSlots.filter((s) => s !== slot)
      : [...completedSlots, slot];
    setCompletedSlots(updated);
    handleSaveDiary(items, updated, waterGlasses, personalNotes);
  };

  const handleRemoveItem = (itemId: string) => {
    const updated = items.filter((i) => i.id !== itemId);
    setItems(updated);
    handleSaveDiary(updated, completedSlots, waterGlasses, personalNotes);
  };

  const handleAddFoodFromDatabase = (food: typeof INDIAN_FOOD_DATABASE[0]) => {
    const logged = scaleFoodToLoggedItem(food, activeSlot, portionMultiplier, uid('item'));
    const updated = [...items, logged];
    setItems(updated);
    setPickerOpen(false);
    setSearchFoodQuery('');
    setPortionMultiplier(1.0);
    handleSaveDiary(updated, completedSlots, waterGlasses, personalNotes);
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemName.trim()) return;
    const kcal = parseFloat(customCalories) || 0;
    const protein = parseFloat(customProtein) || 0;

    const logged: LoggedFoodItem = {
      id: uid('item'),
      name: customItemName.trim(),
      slot: activeSlot,
      servingLabel: 'Custom portion',
      servings: 1,
      estimatedCalories: Math.round(kcal),
      estimatedProteinG: Math.round(protein),
      estimatedCarbsG: Math.round(kcal * 0.12),
      estimatedFatG: Math.round(kcal * 0.03),
      isEstimated: true,
    };

    const updated = [...items, logged];
    setItems(updated);
    setCustomItemName('');
    setCustomCalories('');
    setCustomProtein('');
    setShowCustomAdd(false);
    setPickerOpen(false);
    handleSaveDiary(updated, completedSlots, waterGlasses, personalNotes);
  };

  const handleWaterChange = (change: number) => {
    const next = Math.max(0, Math.min(24, waterGlasses + change));
    setWaterGlasses(next);
    setTodayHydrationGlasses(next);
    handleSaveDiary(items, completedSlots, next, personalNotes);
  };

  const filteredFoods = useMemo(() => {
    return INDIAN_FOOD_DATABASE.filter((f) => {
      const matchesQuery =
        !searchFoodQuery.trim() ||
        f.name.toLowerCase().includes(searchFoodQuery.toLowerCase()) ||
        Boolean(f.hindiOrRegional?.toLowerCase().includes(searchFoodQuery.toLowerCase()));
      const matchesCat =
        selectedFoodCategory === 'all' || f.category === selectedFoodCategory;
      return matchesQuery && matchesCat;
    });
  }, [searchFoodQuery, selectedFoodCategory]);

  const slots: NutritionMealSlot[] = ['breakfast', 'lunch', 'evening_snack', 'dinner', 'additional'];

  return (
    <AppShell pageTitle="Nutrition Diary">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        {/* Header & Disclaimer */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#B8E66C] uppercase tracking-wider">
            <UtensilsCrossed className="w-4 h-4" />
            <span>NIN / IFCT-Aligned Daily Nutrition</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Daily Nutrition Diary
          </h1>
          <p className="text-xs text-white/60">
            Log Indian everyday meals, track protein anchors and align with your coach's guidance.
          </p>

          {/* NIN/IFCT Disclaimer Banner */}
          <div className="p-3.5 rounded-2xl bg-[#70C8ED]/10 border border-[#70C8ED]/20 flex items-start gap-3 text-xs text-[#70C8ED] leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{NUTRITION_DISCLAIMER}</p>
          </div>
        </div>

        {/* Macro & Hydration Dashboard Bar */}
        <div className="rounded-[24px] surface-card p-5 border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {/* Calories */}
          <div className="p-3 rounded-2xl bg-white/5 space-y-1">
            <div className="flex items-center justify-center gap-1 text-[11px] text-white/50 uppercase font-semibold">
              <Flame className="w-3.5 h-3.5 text-[#FF803E]" />
              <span>Est. Energy</span>
            </div>
            <p className="text-2xl font-bold font-mono text-[#FF803E] tabular-nums">
              {totals.calories}
            </p>
            <p className="text-[11px] text-white/50">Target ~{targetKcal} kcal</p>
          </div>

          {/* Protein */}
          <div className="p-3 rounded-2xl bg-white/5 space-y-1">
            <div className="flex items-center justify-center gap-1 text-[11px] text-white/50 uppercase font-semibold">
              <Dumbbell className="w-3.5 h-3.5 text-[#B8E66C]" />
              <span>Protein</span>
            </div>
            <p className="text-2xl font-bold font-mono text-[#B8E66C] tabular-nums">
              {totals.proteinG}g
            </p>
            <p className="text-[11px] text-white/50">Target ~{targetProteinG}g</p>
          </div>

          {/* Carbs & Fat */}
          <div className="p-3 rounded-2xl bg-white/5 space-y-1">
            <div className="flex items-center justify-center gap-1 text-[11px] text-white/50 uppercase font-semibold">
              <Apple className="w-3.5 h-3.5 text-[#70C8ED]" />
              <span>Carbs / Fat</span>
            </div>
            <p className="text-lg font-bold font-mono text-white mt-1 tabular-nums">
              {totals.carbsG}g / {totals.fatG}g
            </p>
            <p className="text-[11px] text-white/50">Balanced macros</p>
          </div>

          {/* Water Hydration Glasses */}
          <div className="p-3 rounded-2xl bg-white/5 space-y-1">
            <div className="flex items-center justify-center gap-1 text-[11px] text-white/50 uppercase font-semibold">
              <Droplets className="w-3.5 h-3.5 text-[#70C8ED]" />
              <span>Water</span>
            </div>
            <div className="flex items-center justify-center gap-2 mt-0.5">
              <button
                type="button"
                onClick={() => handleWaterChange(-1)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm"
              >
                -
              </button>
              <span className="text-xl font-bold font-mono text-[#70C8ED] tabular-nums">
                {waterGlasses}
              </span>
              <button
                type="button"
                onClick={() => handleWaterChange(1)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm"
              >
                +
              </button>
            </div>
            <p className="text-[11px] text-white/50">Target {targetWaterGlasses} glasses</p>
          </div>
        </div>

        {/* Coach Feedback Banner (if available) */}
        {todayEntry?.trainerFeedback && (
          <div className="rounded-[22px] bg-[#FF803E]/10 border border-[#FF803E]/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#FF803E] uppercase tracking-wider">
              <MessageSquare className="w-4 h-4" />
              <span>Coach Feedback on Today's Nutrition</span>
            </div>
            <p className="text-sm text-white/90 leading-relaxed italic">
              "{todayEntry.trainerFeedback}"
            </p>
          </div>
        )}

        {/* Meal Slots List */}
        <div className="space-y-4">
          {slots.map((slot) => {
            const slotItems = items.filter((i) => i.slot === slot);
            const slotTotals = computeNutritionTotals(slotItems);
            const isCompleted = completedSlots.includes(slot);

            return (
              <div
                key={slot}
                className="rounded-[22px] surface-card p-5 border border-white/10 space-y-3"
              >
                {/* Slot Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleSlotCompleted(slot)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-[#B8E66C] text-[#101218]'
                          : 'bg-white/5 border border-white/10 text-white/40 hover:text-white'
                      }`}
                      aria-label={`Mark ${NUTRITION_SLOT_LABELS[slot]} completed`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {NUTRITION_SLOT_LABELS[slot]}
                      </h3>
                      {slotItems.length > 0 && (
                        <p className="text-xs text-white/50 tabular-nums">
                          Est. {slotTotals.calories} kcal · {slotTotals.proteinG}g protein
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveSlot(slot);
                      setPickerOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#FF803E] transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Food</span>
                  </button>
                </div>

                {/* Items in Slot */}
                {slotItems.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {slotItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-[#14171F] border border-white/5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-white">{item.name}</p>
                          <p className="text-white/50">
                            {item.servingLabel} ({item.servings}x)
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right tabular-nums">
                            <p className="font-semibold text-white">
                              ~{item.estimatedCalories} kcal
                            </p>
                            <p className="text-[#B8E66C]">
                              {item.estimatedProteinG}g protein
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-white/30 hover:text-red-400 transition-colors"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/30 italic">No food logged for this slot yet.</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Daily Nutrition Reflections & Coach Notes */}
        <div className="rounded-[22px] surface-card p-5 border border-white/10 space-y-3">
          <h3 className="text-sm font-semibold text-white">Daily Nutrition Notes for Coach</h3>
          <textarea
            rows={2}
            value={personalNotes}
            onChange={(e) => setPersonalNotes(e.target.value)}
            onBlur={() => handleSaveDiary(items, completedSlots, waterGlasses, personalNotes)}
            placeholder="E.g., Drank 3L water; had 1 scoop whey in oats; ate dinner outside."
            className="w-full p-3 rounded-xl bg-[#101218] border border-white/10 text-sm text-white placeholder-white/40 focus:border-[#FF803E] focus:outline-none resize-none"
          />
          <div className="flex justify-end">
            <GlassButton
              size="sm"
              onClick={() => handleSaveDiary(items, completedSlots, waterGlasses, personalNotes)}
            >
              Save Diary Notes
            </GlassButton>
          </div>
        </div>
      </div>

      {/* Indian Food Picker Modal */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-[28px] surface-card p-6 border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Log Food to {NUTRITION_SLOT_LABELS[activeSlot]}
                </h3>
                <p className="text-xs text-white/60">
                  Search verified Indian staples or add custom food item
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPickerOpen(false);
                  setShowCustomAdd(false);
                }}
                className="p-1.5 rounded-full text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFoodQuery}
                onChange={(e) => setSearchFoodQuery(e.target.value)}
                placeholder="Search food (e.g. Roti, Paneer, Dal, Chicken, Eggs)..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#101218] border border-white/10 text-sm text-white placeholder-white/40 focus:border-[#FF803E] focus:outline-none"
              />
            </div>

            {/* Category filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {[
                { key: 'all', label: 'All Items' },
                { key: 'dal_legumes', label: 'Dal & Legumes' },
                { key: 'grains_millets', label: 'Grains & Millets' },
                { key: 'dairy_curd', label: 'Dairy & Curd' },
                { key: 'protein', label: 'High Protein / Lean' },
                { key: 'breakfast', label: 'Breakfast Staples' },
                { key: 'snack', label: 'Healthy Snacks' },
              ].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setSelectedFoodCategory(c.key)}
                  className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
                    selectedFoodCategory === c.key
                      ? 'bg-[#FF803E] text-white font-semibold'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Portion Size Multiplier Bar */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
              <span className="text-white/60 font-medium">Portion Size:</span>
              <div className="flex items-center gap-1.5">
                {[0.5, 1.0, 1.5, 2.0].map((mult) => (
                  <button
                    key={mult}
                    type="button"
                    onClick={() => setPortionMultiplier(mult)}
                    className={`px-2.5 py-1 rounded-md font-mono ${
                      portionMultiplier === mult
                        ? 'bg-[#FF803E] text-white font-bold'
                        : 'bg-white/10 text-white/70 hover:bg-white/15'
                    }`}
                  >
                    {mult}x
                  </button>
                ))}
              </div>
            </div>

            {/* Food items list */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {filteredFoods.map((food) => {
                const scaledKcal = Math.round(food.estimatedCalories * portionMultiplier);
                const scaledProtein = Math.round(food.estimatedProteinG * portionMultiplier * 10) / 10;

                return (
                  <div
                    key={food.id}
                    onClick={() => handleAddFoodFromDatabase(food)}
                    className="p-3 rounded-xl bg-[#14171F] hover:bg-[#1C2029] border border-white/5 hover:border-[#FF803E]/40 flex items-center justify-between gap-3 cursor-pointer transition-all"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {food.name}{' '}
                        {food.hindiOrRegional && (
                          <span className="text-xs text-white/40">({food.hindiOrRegional})</span>
                        )}
                      </p>
                      <p className="text-xs text-white/50">
                        {food.servingLabel} ({food.servingGrams}g)
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-mono font-bold text-white">
                        ~{scaledKcal} kcal
                      </p>
                      <p className="text-xs font-mono font-semibold text-[#B8E66C]">
                        {scaledProtein}g protein
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Item Form Toggle */}
            <div className="pt-2 border-t border-white/10">
              {!showCustomAdd ? (
                <button
                  type="button"
                  onClick={() => setShowCustomAdd(true)}
                  className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white/70 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Can't find your food? Quick-add custom meal</span>
                </button>
              ) : (
                <form onSubmit={handleAddCustomItem} className="space-y-3 pt-1">
                  <p className="text-xs font-semibold text-white">Add Custom Item</p>
                  <input
                    type="text"
                    required
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    placeholder="Meal description (e.g., Mom's Rajma Chawal)"
                    className="w-full p-2.5 rounded-xl bg-[#101218] border border-white/10 text-xs text-white focus:border-[#FF803E] focus:outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <input
                      type="number"
                      required
                      value={customCalories}
                      onChange={(e) => setCustomCalories(e.target.value)}
                      placeholder="Est. Calories (kcal)"
                      className="p-2 rounded-lg bg-[#101218] border border-white/10 text-white font-mono"
                    />
                    <input
                      type="number"
                      value={customProtein}
                      onChange={(e) => setCustomProtein(e.target.value)}
                      placeholder="Est. Protein (g)"
                      className="p-2 rounded-lg bg-[#101218] border border-white/10 text-white font-mono"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomAdd(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white"
                    >
                      Cancel
                    </button>
                    <GlassButton size="sm" type="submit">
                      Add Custom Meal
                    </GlassButton>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};
