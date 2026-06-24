const { publish } = require('./rabbitmq.client');
const { v4: uuidv4 } = require('uuid');

async function publishMealLogged({ userId, mealId, loggedAt, mealType, calories, proteinG, carbsG, fatG }) {
  await publish('meal.logged', {
    event_id: uuidv4(),
    user_id: userId,
    meal_id: mealId,
    logged_at: loggedAt,
    meal_type: mealType,
    calories,
    protein_g: proteinG,
    carbs_g: carbsG,
    fat_g: fatG,
  });
}

async function publishGoalReached({ userId, email, goalType, value }) {
  await publish('goal.reached', {
    event_id: uuidv4(),
    user_id: userId,
    email,
    goal_type: goalType,
    value,
  });
}

module.exports = { publishMealLogged, publishGoalReached };
