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
    <AppShell pageTitle="Nutrition Builder">
      <div className="max-w-4xl mx-auto flex flex-col gap-5 pb-20">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/studio/templates')}
              aria-label="Back to templates"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-[12px] glass-control text-[#A2A8B5] hover:text-[#F5F5F7] transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Apple className="w-[18px] h-[18px] text-[#B8E66C] shrink-0" aria-hidden="true" />
                <h1 className="text-[20px] font-semibold text-[#F5F5F7] tracking-[-0.02em] truncate">
                  Nutrition Builder
                </h1>
              </div>
              <p className="text-[12px] text-[#7C8393]">Build Indian meal plans with real macro data</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="min-h-[36px] px-3.5 rounded-[11px] glass-control text-[#FFB06B] hover:text-[#F5F5F7] text-[12px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              AI Draft
            </button>
            <button
              type="button"
              onClick={handleSaveTemplate}
              className="min-h-[36px] px-4 rounded-[11px] bg-[#FF803E] hover:bg-[#FF9259] text-[#101218] text-[12px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
              Save
            </button>
          </div>
        </div>

        {/* ── Plan settings ────────────────────────────────────── */}
        <div className="surface-card rounded-[22px] p-5 flex flex-col gap-4">
          <p className="text-[12px] font-semibold text-[#A2A8B5] uppercase tracking-[0.06em]">Plan settings</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[13px] font-medium text-[#F5F5F7] block mb-1.5">Plan title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full min-h-[44px] rounded-[13px] glass-input px-3.5 py-2.5 text-[14px] text-[#F5F5F7] placeholder:text-[#7C8393]"
              />
            </div>

            <div>
              <label className="text-[13px] font-medium text-[#F5F5F7] block mb-1.5">Dietary type</label>
              <select
                value={dietaryType}
                onChange={(e) => setDietaryType(e.target.value as NutritionProgramTemplate['dietaryType'])}
                className="w-full min-h-[44px] rounded-[13px] glass-input px-3.5 py-2.5 text-[14px] text-[#F5F5F7] capitalize"
              >
                <option value="vegetarian">Vegetarian</option>
                <option value="non_vegetarian">Non-Vegetarian</option>
                <option value="eggitarian">Eggitarian</option>
                <option value="vegan">Vegan</option>
              </select>
            </div>

            <div>
              <label className="text-[13px] font-medium text-[#F5F5F7] block mb-1.5">
                Water target
              </label>
              <div className="relative flex items-center min-h-[44px] rounded-[13px] glass-input px-3.5">
                <Droplet className="w-4 h-4 text-[#70C8ED] shrink-0 mr-2" aria-hidden="true" />
                <input
                  type="number"
                  min={4}
                  max={20}
                  value={hydrationTargetGlasses}
                  onChange={(e) => setHydrationTargetGlasses(Number(e.target.value))}
                  className="flex-1 bg-transparent text-[14px] text-[#F5F5F7] focus:outline-none font-mono"
                />
                <span className="text-[12px] text-[#7C8393] ml-1">glasses / day</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[13px] font-medium text-[#F5F5F7] block mb-1.5">Coach notes</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Focus on protein at lunch and dinner, avoid refined carbs at night."
              className="w-full min-h-[44px] rounded-[13px] glass-input px-3.5 py-2.5 text-[14px] text-[#F5F5F7] placeholder:text-[#7C8393]"
            />
          </div>
        </div>

        {/* ── Daily targets + live progress ────────────────────── */}
        <div className="surface-card rounded-[22px] p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12px] font-semibold text-[#A2A8B5] uppercase tracking-[0.06em]">Daily targets</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-[12px] text-[#A2A8B5]">kcal</label>
                <input
                  type="number"
                  step={50}
                  value={targetKcal}
                  onChange={(e) => setTargetKcal(Number(e.target.value))}
                  className="w-20 min-h-[36px] rounded-[10px] glass-input px-2.5 text-[13px] text-[#F5F5F7] font-mono text-right"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[12px] text-[#A2A8B5]">protein g</label>
                <input
                  type="number"
                  step={5}
                  value={targetProteinG}
                  onChange={(e) => setTargetProteinG(Number(e.target.value))}
                  className="w-16 min-h-[36px] rounded-[10px] glass-input px-2.5 text-[13px] text-[#F5F5F7] font-mono text-right"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Energy', value: dayTotals.calories, target: targetKcal, unit: 'kcal', color: '#FF803E' },
              { label: 'Protein', value: dayTotals.proteinG, target: targetProteinG, unit: 'g', color: '#B8E66C' },
              { label: 'Carbs', value: dayTotals.carbsG, target: 300, unit: 'g', color: '#70C8ED' },
              { label: 'Fats', value: dayTotals.fatG, target: 80, unit: 'g', color: '#FFB06B' },
            ].map((m) => (
              <div key={m.label} className="rounded-[14px] bg-white/[0.03] border border-white/[0.07] p-3">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[11px] text-[#7C8393]">{m.label}</span>
                  <span className="text-[12px] font-semibold font-mono" style={{ color: m.color }}>
                    {m.value}<span className="text-[#7C8393] font-normal">/{m.target}{m.unit}</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.round((m.value / m.target) * 100))}%`, backgroundColor: m.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Meal slots ───────────────────────────────────────── */}
        <div className="surface-card rounded-[22px] overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-white/[0.07] overflow-x-auto">
            {(['breakfast', 'lunch', 'evening_snack', 'dinner'] as const).map((slotKey) => {
              const count = slots.find((s) => s.slot === slotKey)?.items.length ?? 0;
              const isActive = activeSlot === slotKey;
              return (
                <button
                  key={slotKey}
                  type="button"
                  onClick={() => setActiveSlot(slotKey)}
                  className={`flex-1 min-w-[90px] py-3.5 px-3 flex flex-col items-center gap-0.5 text-[12px] font-semibold transition-colors whitespace-nowrap cursor-pointer border-b-2 ${
                    isActive
                      ? 'text-[#FF803E] border-[#FF803E] bg-[#FF803E]/05'
                      : 'text-[#7C8393] border-transparent hover:text-[#A2A8B5]'
                  }`}
                >
                  {slotLabels[slotKey]}
                  {count > 0 && (
                    <span className={`text-[10px] font-bold tabular-nums ${isActive ? 'text-[#FFB06B]' : 'text-[#7C8393]'}`}>
                      {count} items
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active slot content */}
          <div className="p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-semibold text-[#F5F5F7]">{slotLabels[activeSlot]}</p>
                <p className="text-[12px] text-[#7C8393]">
                  {activeSlotPlan.items.length === 0
                    ? 'No food added yet'
                    : `${activeSlotPlan.items.reduce((s, i) => s + i.estimatedCalories, 0)} kcal · ${activeSlotPlan.items.reduce((s, i) => s + i.estimatedProteinG, 0)}g protein`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFoodPickerOpen(true)}
                className="min-h-[36px] px-3 rounded-[10px] bg-[#FF803E]/12 border border-[#FF803E]/22 text-[#FFB06B] hover:bg-[#FF803E]/20 text-[12px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Add food
              </button>
            </div>

            {activeSlotPlan.items.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-white/[0.1] rounded-[16px]">
                <Apple className="w-8 h-8 text-[#3A3F4B] mx-auto mb-2" aria-hidden="true" />
                <p className="text-[13px] text-[#7C8393]">Tap "Add food" to build this meal</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {activeSlotPlan.items.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-[14px] bg-white/[0.03] border border-white/[0.07] p-3.5 flex items-center gap-3"
                  >
                    {/* Food info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#F5F5F7] truncate">{item.name}</p>
                      <p className="text-[11px] text-[#7C8393] mt-0.5">{item.servingLabel}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] font-mono text-[#FFB06B]">{item.estimatedCalories} kcal</span>
                        <span className="text-[11px] font-mono font-semibold" style={{ color: '#B8E66C' }}>{item.estimatedProteinG}g P</span>
                        <span className="text-[11px] font-mono text-[#70C8ED]">{item.estimatedCarbsG}g C</span>
                      </div>
                    </div>

                    {/* Serving stepper */}
                    <div className="flex items-center rounded-[9px] glass-control overflow-hidden shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateServings(item.id, Math.max(0.5, item.servings - 0.5))}
                        className="w-8 h-8 flex items-center justify-center text-[#A2A8B5] hover:text-[#F5F5F7] text-lg leading-none cursor-pointer"
                      >
                        −
                      </button>
                      <span className="px-2 text-[12px] font-mono font-semibold text-[#F5F5F7] min-w-[28px] text-center">
                        {item.servings}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateServings(item.id, item.servings + 0.5)}
                        className="w-8 h-8 flex items-center justify-center text-[#A2A8B5] hover:text-[#F5F5F7] text-lg leading-none cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    {/* Reorder + delete */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveFood(index, 'up')}
                        disabled={index === 0}
                        className="w-6 h-6 flex items-center justify-center text-[#A2A8B5] hover:text-[#F5F5F7] disabled:opacity-25 cursor-pointer"
                      >
                        <ArrowUp className="w-3 h-3" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveFood(index, 'down')}
                        disabled={index === activeSlotPlan.items.length - 1}
                        className="w-6 h-6 flex items-center justify-center text-[#A2A8B5] hover:text-[#F5F5F7] disabled:opacity-25 cursor-pointer"
                      >
                        <ArrowDown className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteFood(item.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-[8px] text-[#7C8393] hover:text-[#FF6B70] hover:bg-[#FF6B70]/10 transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Food picker modal ─────────────────────────────────── */}
        {isFoodPickerOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) setIsFoodPickerOpen(false); }}
          >
            <div className="relative w-full sm:max-w-xl glass-overlay rounded-t-[28px] sm:rounded-[26px] flex flex-col max-h-[88vh] sm:max-h-[80vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] shrink-0">
                <div>
                  <p className="text-[15px] font-semibold text-[#F5F5F7]">Add Indian food</p>
                  <p className="text-[12px] text-[#7C8393]">Adding to: {slotLabels[activeSlot]}</p>
                </div>
                <button type="button" onClick={() => setIsFoodPickerOpen(false)}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-[12px] text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.07] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Search */}
              <div className="px-5 py-3 shrink-0">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C8393]" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search — paneer, dal, roti, chana..."
                    value={foodSearch}
                    onChange={(e) => setFoodSearch(e.target.value)}
                    autoFocus
                    className="w-full min-h-[44px] glass-input rounded-[13px] pl-10 pr-3.5 py-2.5 text-[14px] text-[#F5F5F7] placeholder:text-[#7C8393]"
                  />
                </div>
              </div>

              {/* Food list */}
              <div className="flex-1 overflow-y-auto px-5 pb-5 flex flex-col gap-2">
                {filteredFoods.length === 0 ? (
                  <p className="text-[13px] text-[#7C8393] text-center py-8">No foods match your search.</p>
                ) : filteredFoods.map((food) => (
                  <div
                    key={food.id}
                    className="flex items-center gap-3 p-3 rounded-[14px] bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.12] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#F5F5F7] truncate">{food.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-[#7C8393]">{food.servingLabel}</span>
                        <span className="text-[11px] font-mono text-[#FFB06B]">{food.estimatedCalories} kcal</span>
                        <span className="text-[11px] font-mono font-semibold" style={{ color: '#B8E66C' }}>{food.estimatedProteinG}g P</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddFoodToSlot(food)}
                      className="min-h-[32px] px-3 rounded-[9px] bg-[#FF803E]/12 border border-[#FF803E]/22 text-[#FFB06B] hover:bg-[#FF803E]/22 text-[12px] font-semibold transition-colors cursor-pointer shrink-0"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── AI draft modal ────────────────────────────────────── */}
        {isAiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) setIsAiModalOpen(false); }}
          >
            <div className="relative w-full sm:max-w-md glass-overlay rounded-t-[28px] sm:rounded-[26px]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FFB06B]" aria-hidden="true" />
                  <p className="text-[15px] font-semibold text-[#F5F5F7]">AI Nutrition Draft</p>
                </div>
                <button type="button" onClick={() => setIsAiModalOpen(false)}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-[12px] text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.07] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <div className="px-5 py-5 flex flex-col gap-3">
                <div>
                  <label className="text-[13px] font-medium text-[#F5F5F7] block mb-1.5">Nutrition goals</label>
                  <textarea
                    rows={3}
                    value={aiPromptGoal}
                    onChange={(e) => setAiPromptGoal(e.target.value)}
                    placeholder="e.g. 2,000 kcal high-protein vegetarian thali with paneer and dal"
                    className="w-full glass-input rounded-[13px] px-3.5 py-2.5 text-[14px] text-[#F5F5F7] placeholder:text-[#7C8393] resize-none"
                  />
                </div>
                <p className="text-[12px] text-[#7C8393]">
                  Drafts balanced Indian meals matching your calorie and protein targets. Trainer review required.
                </p>
              </div>

              <div className="px-5 pb-5 flex gap-2.5">
                <button type="button" onClick={() => setIsAiModalOpen(false)}
                  className="flex-1 min-h-[44px] rounded-[13px] glass-control text-[#A2A8B5] text-[13px] font-semibold hover:text-[#F5F5F7] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerateAiPlan}
                  disabled={isGeneratingAi}
                  className="flex-1 min-h-[44px] rounded-[13px] bg-[#FF803E] hover:bg-[#FF9259] disabled:opacity-60 text-[#101218] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  {isGeneratingAi ? 'Drafting...' : 'Draft plan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
