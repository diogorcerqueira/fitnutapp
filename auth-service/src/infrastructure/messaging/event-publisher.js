const { publish } = require('./rabbitmq.client');
const { v4: uuidv4 } = require('uuid');

async function publishUserRegistered({ userId, email, name }) {
  await publish('user.registered', {
    event_id: uuidv4(),
    user_id: userId,
    email,
    name,
  });
}

async function publishProfileUpdated({ userId, email, weightKg, heightCm, age, goal, gender, activityLevel }) {
  await publish('user.profile.updated', {
    event_id: uuidv4(),
    user_id: userId,
    email,
    weight_kg: weightKg,
    height_cm: heightCm,
    age,
    goal,
    gender,
    activity_level: activityLevel,
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

async function publishGoalUpdated({ userId, email, dailyCaloriesKcal, dailyProteinG }) {
  await publish('goal.updated', {
    event_id: uuidv4(),
    user_id: userId,
    email,
    daily_calories_kcal: dailyCaloriesKcal,
    daily_protein_g: dailyProteinG,
  });
}

module.exports = { publishUserRegistered, publishProfileUpdated, publishGoalReached, publishGoalUpdated };
