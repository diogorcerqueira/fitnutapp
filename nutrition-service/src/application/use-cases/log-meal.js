const mealEntryRepo = require('../../infrastructure/repositories/meal-entry.repository');
const foodRepo = require('../../infrastructure/repositories/food.repository');
const { publishMealLogged } = require('../../infrastructure/messaging/event-publisher');
const checkDailyGoals = require('./check-daily-goals');

function calcMacros(food, quantityG) {
  const ratio = quantityG / 100;
  return {
    calories: Math.round(food.calories * ratio * 10) / 10,
    proteinG: Math.round(food.proteinG * ratio * 10) / 10,
    carbsG: Math.round(food.carbsG * ratio * 10) / 10,
    fatG: Math.round(food.fatG * ratio * 10) / 10,
  };
}

async function logMeal(userId, { foodId, mealType, quantityG, loggedAt }) {
  const food = await foodRepo.findById(foodId);
  if (!food) {
    const err = new Error('Alimento não encontrado');
    err.status = 404;
    throw err;
  }

  const macros = calcMacros(food, quantityG);
  const entry = await mealEntryRepo.create({ userId, foodId, mealType, quantityG, loggedAt });

  await publishMealLogged({
    userId,
    mealId: entry.id,
    loggedAt,
    mealType,
    ...macros,
  });

  // fire-and-forget: check daily goals async (non-blocking)
  checkDailyGoals(userId, loggedAt).catch(err =>
    console.warn('[LogMeal] goal check error:', err.message)
  );

  return { ...entry, macros };
}

module.exports = logMeal;
