import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Apple,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Save,
  Search,
  X,
  Droplet,
  Flame,
  ArrowLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../../components/layout/AppShell';
import type {
  NutritionFoodItem,
  NutritionMealSlot,
  NutritionProgramTemplate,
  VisualMealFoodItem,
  VisualMealSlotPlan,
} from '../../types/domain';
import { INDIAN_FOOD_DATABASE, NUTRITION_SLOT_LABELS } from '../../data/indianFoods';
import {
  calculateVisualNutritionDayMacros,
  scaleIndianFoodItem,
} from '../../lib/coachingBuildersEngine';

export const StudioNutritionBuilderPage: React.FC = () => {
  const { saveNutritionTemplate, pushToast } = useApp();
  const navigate = useNavigate();

  const [title, setTitle] = useState('Indian High-Protein Vegetarian Protocol');
  const [description, setDescription] = useState('Balanced Indian home cooking with targeted protein distribution across 4 meal slots.');
  const [dietaryType, setDietaryType] = useState<NutritionProgramTemplate['dietaryType']>('vegetarian');
  const [targetKcal, setTargetKcal] = useState(2100);
  const [targetProteinG, setTargetProteinG] = useState(130);
  const [hydrationTargetGlasses, setHydrationTargetGlasses] = useState(10);

  const [activeSlot, setActiveSlot] = useState<NutritionMealSlot>('breakfast');

  const [slots, setSlots] = useState<VisualMealSlotPlan[]>([
    {
      slot: 'breakfast',
      title: 'High-Protein Breakfast',
      items: [
        {
          id: 'n_item_1',
          foodId: 'food_moong_dal_chilla',
          name: 'Moong Dal Chilla with Paneer Filling',
          servingLabel: '2 medium chillas',
          servings: 1,
          estimatedCalories: 340,
          estimatedProteinG: 22,
          estimatedCarbsG: 34,
          estimatedFatG: 12,
        },
      ],
    },
    {
      slot: 'lunch',
      title: 'Wholesome Thali Lunch',
      items: [
        {
          id: 'n_item_2',
          foodId: 'food_paneer_bhurji',
          name: 'Paneer Bhurji (Home Style)',
          servingLabel: '1 bowl (150g)',
          servings: 1,
          estimatedCalories: 310,
          estimatedProteinG: 18,
          estimatedCarbsG: 8,
          estimatedFatG: 23,
        },
        {
          id: 'n_item_3',
          foodId: 'food_phulka',
          name: 'Whole Wheat Phulka (Roti)',
          servingLabel: '2 rotis (no ghee)',
          servings: 2,
          estimatedCalories: 170,
          estimatedProteinG: 6,
          estimatedCarbsG: 36,
          estimatedFatG: 1,
        },
      ],
    },
    {
      slot: 'evening_snack',
      title: 'Evening Snack / Pre-Workout',
      items: [
        {
          id: 'n_item_4',
          foodId: 'food_makhana',
          name: 'Roasted Makhana (Fox Nuts)',
          servingLabel: '1 bowl (30g)',
          servings: 1,
          estimatedCalories: 115,
          estimatedProteinG: 3,
          estimatedCarbsG: 20,
          estimatedFatG: 2,
        },
      ],
    },
    {
      slot: 'dinner',
      title: 'Light High-Protein Dinner',
      items: [
        {
          id: 'n_item_5',
          foodId: 'food_rajma',
          name: 'Rajma Masala (Kidney Beans)',
          servingLabel: '1 bowl (200g)',
          servings: 1,
          estimatedCalories: 260,
          estimatedProteinG: 14,
          estimatedCarbsG: 42,
          estimatedFatG: 4,
        },
      ],
    },
  ]);

  const [isFoodPickerOpen, setIsFoodPickerOpen] = useState(false);
  const [foodSearch, setFoodSearch] = useState('');
  const [foodCategoryFilter, setFoodCategoryFilter] = useState('all');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPromptGoal, setAiPromptGoal] = useState('2,000 kcal high-protein vegetarian thali with paneer and dal');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const activeSlotPlan =
    slots.find((s) => s.slot === activeSlot) || {
      slot: activeSlot,
      title: 'Meal Slot',
      items: [],
    };

  const dayTotals = calculateVisualNutritionDayMacros(slots);

  const updateActiveSlotItems = (newItems: VisualMealFoodItem[]) => {
    setSlots((prev) => {
      const exists = prev.some((s) => s.slot === activeSlot);
      if (exists) {
        return prev.map((s) => (s.slot === activeSlot ? { ...s, items: newItems } : s));
      } else {
        return [...prev, { slot: activeSlot, title: activeSlot, items: newItems }];
      }
    });
  };

  const handleAddFoodToSlot = (food: NutritionFoodItem) => {
    const newItem = scaleIndianFoodItem(food, 1);
    updateActiveSlotItems([...activeSlotPlan.items, newItem]);
    setIsFoodPickerOpen(false);
  };

  const handleUpdateServings = (itemId: string, newServings: number) => {
    if (newServings <= 0) return;
    const item = activeSlotPlan.items.find((i) => i.id === itemId);
    if (!item) return;

    // Find original base food if possible
    const baseFood = INDIAN_FOOD_DATABASE.find((f) => f.id === item.foodId);
    let updated: VisualMealFoodItem;
    if (baseFood) {
      updated = { ...scaleIndianFoodItem(baseFood, newServings), id: item.id };
    } else {
      const ratio = newServings / (item.servings || 1);
      updated = {
        ...item,
        servings: newServings,
        estimatedCalories: Math.round(item.estimatedCalories * ratio),
        estimatedProteinG: Math.round(item.estimatedProteinG * ratio),
        estimatedCarbsG: Math.round(item.estimatedCarbsG * ratio),
        estimatedFatG: Math.round(item.estimatedFatG * ratio),
      };
    }

    updateActiveSlotItems(
      activeSlotPlan.items.map((i) => (i.id === itemId ? updated : i))
    );
  };

  const handleDeleteFood = (itemId: string) => {
    updateActiveSlotItems(activeSlotPlan.items.filter((i) => i.id !== itemId));
  };

  const handleMoveFood = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeSlotPlan.items.length) return;
    const reordered = [...activeSlotPlan.items];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    updateActiveSlotItems(reordered);
  };

  const handleSaveTemplate = () => {
    if (!title.trim()) {
      alert('Please enter a plan title');
      return;
    }
    saveNutritionTemplate({
      trainerId: 'trn_arjun',
      title: title.trim(),
      description: description.trim(),
      dietaryType,
      targetKcal,
      targetProteinG,
      hydrationTargetGlasses,
      slots,
    });
    pushToast('Nutrition plan template saved successfully!');
  };

  const handleGenerateAiPlan = () => {
    setIsGeneratingAi(true);
    setTimeout(() => {
      // Deterministic generation
      setSlots([
        {
          slot: 'breakfast',
          title: 'High-Protein Breakfast',
          items: [
            {
              id: 'ai_n_1',
              foodId: 'food_moong_dal_chilla',
              name: 'Moong Dal Chilla with Paneer Filling',
              servingLabel: '2 medium chillas',
              servings: 1,
              estimatedCalories: 340,
              estimatedProteinG: 22,
              estimatedCarbsG: 34,
              estimatedFatG: 12,
            },
          ],
        },
        {
          slot: 'lunch',
          title: 'Wholesome Thali Lunch',
          items: [
            {
              id: 'ai_n_2',
              foodId: 'food_paneer_bhurji',
              name: 'Paneer Bhurji (Home Style)',
              servingLabel: '1 bowl (150g)',
              servings: 1,
              estimatedCalories: 310,
              estimatedProteinG: 18,
              estimatedCarbsG: 8,
              estimatedFatG: 23,
            },
            {
              id: 'ai_n_3',
              foodId: 'food_dal_tadka',
              name: 'Yellow Dal Tadka',
              servingLabel: '1 katori (150g)',
              servings: 1,
              estimatedCalories: 155,
              estimatedProteinG: 8,
              estimatedCarbsG: 22,
              estimatedFatG: 4,
            },
            {
              id: 'ai_n_4',
              foodId: 'food_phulka',
              name: 'Whole Wheat Phulka (Roti)',
              servingLabel: '2 rotis (no ghee)',
              servings: 2,
              estimatedCalories: 170,
              estimatedProteinG: 6,
              estimatedCarbsG: 36,
              estimatedFatG: 1,
            },
          ],
        },
        {
          slot: 'evening_snack',
          title: 'Evening Snack',
          items: [
            {
              id: 'ai_n_5',
              foodId: 'food_makhana',
              name: 'Roasted Makhana (Fox Nuts)',
              servingLabel: '1 bowl (30g)',
              servings: 1,
              estimatedCalories: 115,
              estimatedProteinG: 3,
              estimatedCarbsG: 20,
              estimatedFatG: 2,
            },
          ],
        },
        {
          slot: 'dinner',
          title: 'High-Protein Dinner',
          items: [
            {
              id: 'ai_n_6',
              foodId: 'food_rajma',
              name: 'Rajma Masala (Kidney Beans)',
              servingLabel: '1 bowl (200g)',
              servings: 1,
              estimatedCalories: 260,
              estimatedProteinG: 14,
              estimatedCarbsG: 42,
              estimatedFatG: 4,
            },
            {
              id: 'ai_n_7',
              foodId: 'food_curd',
              name: 'Plain Curd / Dahi (Low Fat)',
              servingLabel: '1 katori (100g)',
              servings: 1,
              estimatedCalories: 60,
              estimatedProteinG: 4,
              estimatedCarbsG: 5,
              estimatedFatG: 2,
            },
          ],
        },
      ]);
      setIsGeneratingAi(false);
      setIsAiModalOpen(false);
      pushToast('AI nutrition plan applied across all meal slots!');
    }, 1200);
  };

  const filteredFoods = INDIAN_FOOD_DATABASE.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(foodSearch.toLowerCase()) ||
      (f.hindiOrRegional && f.hindiOrRegional.toLowerCase().includes(foodSearch.toLowerCase()));
    const matchesCategory =
      foodCategoryFilter === 'all' || f.category.toLowerCase().includes(foodCategoryFilter.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const slotLabels = NUTRITION_SLOT_LABELS;

  return (
    <AppShell pageTitle="Nutrition Studio Builder">
      <div className="max-w-6xl mx-auto space-y-6 pb-20">
        {/* Back Link & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/studio/templates')}
              className="p-2 rounded-xl bg-white/[0.04] border border-white/5 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Apple className="w-5 h-5 text-emerald-400" />
                <h1 className="text-xl font-bold text-white tracking-tight">Nutrition Studio Builder</h1>
              </div>
              <p className="text-xs text-white/50">Curate regional Indian meal plans with instant macro scaling</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Draft with AI</span>
            </button>

            <button
              onClick={handleSaveTemplate}
              className="px-4 py-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-400 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Template</span>
            </button>
          </div>
        </div>

        {/* Plan Targets Meta Grid */}
        <div className="p-5 rounded-2xl bg-[#14171F]/80 border border-white/5 backdrop-blur-xl grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider block mb-1.5">
              Plan Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#1C2029] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400 transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider block mb-1.5">
              Dietary Preference
            </label>
            <select
              value={dietaryType}
              onChange={(e) => setDietaryType(e.target.value as any)}
              className="w-full bg-[#1C2029] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400 transition-colors capitalize"
            >
              <option value="vegetarian">Vegetarian</option>
              <option value="non_vegetarian">Non-Vegetarian</option>
              <option value="eggitarian">Eggitarian</option>
              <option value="vegan">Vegan</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider block mb-1.5">
              Target Calories (kcal)
            </label>
            <input
              type="number"
              step={50}
              value={targetKcal}
              onChange={(e) => setTargetKcal(Number(e.target.value))}
              className="w-full bg-[#1C2029] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400 transition-colors font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider block mb-1.5">
              Target Protein (g)
            </label>
            <input
              type="number"
              step={5}
              value={targetProteinG}
              onChange={(e) => setTargetProteinG(Number(e.target.value))}
              className="w-full bg-[#1C2029] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400 transition-colors font-mono"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider block mb-1.5">
              Coach Diet Notes
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Focus on keeping hydration high and getting 30g protein at lunch and dinner."
              className="w-full bg-[#1C2029] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-emerald-400 transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider block mb-1.5">
              Water Target
            </label>
            <div className="flex items-center gap-2 bg-[#1C2029] border border-white/10 rounded-xl px-3 py-2">
              <Droplet className="w-4 h-4 text-cyan-400" />
              <input
                type="number"
                min={4}
                max={20}
                value={hydrationTargetGlasses}
                onChange={(e) => setHydrationTargetGlasses(Number(e.target.value))}
                className="w-full bg-transparent text-sm text-white focus:outline-none font-mono"
              />
              <span className="text-[10px] text-white/40">glasses</span>
            </div>
          </div>
        </div>

        {/* Live Macro Distribution Summary Bar */}
        <div className="p-4 rounded-2xl bg-[#14171F]/80 border border-white/5 backdrop-blur-xl grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-white/40">Total Energy</span>
              <span className="font-semibold text-white font-mono">{dayTotals.calories} / {targetKcal} kcal</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round((dayTotals.calories / targetKcal) * 100))}%` }}
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-white/40">Protein</span>
              <span className="font-semibold text-emerald-400 font-mono">{dayTotals.proteinG}g / {targetProteinG}g</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round((dayTotals.proteinG / targetProteinG) * 100))}%` }}
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-white/40">Carbs</span>
              <span className="font-semibold text-cyan-400 font-mono">{dayTotals.carbsG}g</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full"
                style={{ width: `${Math.min(100, (dayTotals.carbsG / 300) * 100)}%` }}
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-white/40">Fats</span>
              <span className="font-semibold text-amber-400 font-mono">{dayTotals.fatG}g</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full"
                style={{ width: `${Math.min(100, (dayTotals.fatG / 80) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Meal Slot Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(['breakfast', 'lunch', 'evening_snack', 'dinner'] as const).map((slotKey) => {
            const plan = slots.find((s) => s.slot === slotKey);
            const count = plan?.items.length || 0;
            return (
              <button
                key={slotKey}
                onClick={() => setActiveSlot(slotKey)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
                  activeSlot === slotKey
                    ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-sm'
                    : 'bg-[#14171F] border-white/5 text-white/60 hover:text-white hover:border-white/10'
                }`}
              >
                <span>{slotLabels[slotKey]}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-white/70">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Slot Foods Panel */}
        <div className="p-6 rounded-2xl bg-[#14171F]/80 border border-white/5 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <h2 className="text-sm font-bold text-white capitalize">{slotLabels[activeSlot]} Menu</h2>
              <p className="text-xs text-white/50">Add and scale Indian foods for this meal window</p>
            </div>
            <button
              onClick={() => setIsFoodPickerOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Food</span>
            </button>
          </div>

          {activeSlotPlan.items.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl text-white/40 text-xs">
              No food items added to {slotLabels[activeSlot]} yet.
            </div>
          ) : (
            <div className="space-y-3">
              {activeSlotPlan.items.map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-[#1C2029]/80 border border-white/5 hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-white block truncate">{item.name}</span>
                    <span className="text-xs text-white/50 block mt-0.5">{item.servingLabel}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Servings counter */}
                    <div className="flex items-center gap-1 bg-[#101218] border border-white/10 rounded-lg p-1">
                      <button
                        onClick={() => handleUpdateServings(item.id, Math.max(0.5, item.servings - 0.5))}
                        className="w-6 h-6 rounded flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 text-xs"
                      >
                        -
                      </button>
                      <span className="text-xs font-mono px-2 text-white font-semibold">
                        {item.servings}x
                      </span>
                      <button
                        onClick={() => handleUpdateServings(item.id, item.servings + 0.5)}
                        className="w-6 h-6 rounded flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 text-xs"
                      >
                        +
                      </button>
                    </div>

                    {/* Macro snapshot */}
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-orange-400">{item.estimatedCalories} kcal</span>
                      <span className="text-white/30">|</span>
                      <span className="text-emerald-400 font-semibold">{item.estimatedProteinG}g P</span>
                    </div>

                    {/* Move / Delete controls */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveFood(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-white/40 hover:text-white disabled:opacity-20"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveFood(index, 'down')}
                        disabled={index === activeSlotPlan.items.length - 1}
                        className="p-1 text-white/40 hover:text-white disabled:opacity-20"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteFood(item.id)}
                        className="p-1 text-rose-400/60 hover:text-rose-400 ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Indian Food Picker Modal */}
        {isFoodPickerOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative w-full max-w-2xl bg-[#14171F] border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Apple className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-semibold text-white">Select Indian Food Item</h3>
                </div>
                <button
                  onClick={() => setIsFoodPickerOpen(false)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search & Category Filter */}
              <div className="py-3 space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search Indian foods (e.g. paneer, chana, roti, dal)..."
                    value={foodSearch}
                    onChange={(e) => setFoodSearch(e.target.value)}
                    className="w-full bg-[#1C2029] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Food Items Scroll */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                {filteredFoods.map((food) => (
                  <div
                    key={food.id}
                    className="py-3 flex items-center justify-between hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
                  >
                    <div>
                      <span className="text-xs font-semibold text-white block">{food.name}</span>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/40">
                        <span>{food.servingLabel}</span>
                        <span>·</span>
                        <span className="text-orange-400 font-mono">{food.estimatedCalories} kcal</span>
                        <span>·</span>
                        <span className="text-emerald-400 font-mono font-semibold">{food.estimatedProteinG}g protein</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddFoodToSlot(food)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white text-xs font-semibold transition-all"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Gemini AI Copilot Modal */}
        {isAiModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-[#14171F] border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-semibold text-white">Gemini AI Nutrition Drafter</h3>
                </div>
                <button
                  onClick={() => setIsAiModalOpen(false)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-3">
                <label className="text-xs font-semibold text-white/70 block">
                  Describe nutrition goals or dietary habits:
                </label>
                <textarea
                  rows={3}
                  value={aiPromptGoal}
                  onChange={(e) => setAiPromptGoal(e.target.value)}
                  className="w-full bg-[#1C2029] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/40 focus:outline-none focus:border-purple-400 transition-colors"
                />
                <p className="text-[11px] text-white/40">
                  Gemini drafts balanced Indian meals matching your calorie and protein targets.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/5">
                <button
                  onClick={() => setIsAiModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateAiPlan}
                  disabled={isGeneratingAi}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all"
                >
                  {isGeneratingAi ? (
                    <span>Generating...</span>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Draft Day Plan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
