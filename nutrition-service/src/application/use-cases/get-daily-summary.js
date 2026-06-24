const mealEntryRepo = require('../../infrastructure/repositories/meal-entry.repository');

function calcMacros(food, quantityG) {
  const ratio = quantityG / 100;
  return {
    calories: food.calories * ratio,
    proteinG: food.proteinG * ratio,
    carbsG: food.carbsG * ratio,
    fatG: food.fatG * ratio,
  };
}

async function getDailySummary(userId, date) {
  const entries = await mealEntryRepo.findByUserAndDate(userId, date);

  const totals = entries.reduce(
    (acc, entry) => {
      const m = calcMacros(entry.food, entry.quantityG);
      return {
        calories: acc.calories + m.calories,
        proteinG: acc.proteinG + m.proteinG,
        carbsG: acc.carbsG + m.carbsG,
        fatG: acc.fatG + m.fatG,
      };
    },
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  const byMealType = entries.reduce((acc, entry) => {
    if (!acc[entry.mealType]) acc[entry.mealType] = [];
    const m = calcMacros(entry.food, entry.quantityG);
    acc[entry.mealType].push({
      id: entry.id,
      foodName: entry.food.name,
      quantityG: entry.quantityG,
      ...m,
    });
    return acc;
  }, {});

  return {
    date,
    totals: {
      calories: Math.round(totals.calories * 10) / 10,
      proteinG: Math.round(totals.proteinG * 10) / 10,
      carbsG: Math.round(totals.carbsG * 10) / 10,
      fatG: Math.round(totals.fatG * 10) / 10,
    },
    meals: byMealType,
  };
}

module.exports = getDailySummary;
