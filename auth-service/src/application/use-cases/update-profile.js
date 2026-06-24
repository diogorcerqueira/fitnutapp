const profileRepo = require('../../infrastructure/repositories/profile.repository');
const goalRepo = require('../../infrastructure/repositories/goal.repository');
const userRepo = require('../../infrastructure/repositories/user.repository');
const { publishProfileUpdated, publishGoalReached } = require('../../infrastructure/messaging/event-publisher');

async function updateProfile(userId, { weightKg, heightCm, age, goal, gender, activityLevel }) {
  const profile = await profileRepo.upsert(userId, { weightKg, heightCm, age, goal, gender, activityLevel });

  const user = await userRepo.findById(userId);
  await publishProfileUpdated({ userId, email: user.email, weightKg, heightCm, age, goal, gender, activityLevel });

  if (weightKg) {
    const goals = await goalRepo.findByUserId(userId);
    if (goals?.targetWeightKg && weightKg <= goals.targetWeightKg) {
      const user = await userRepo.findById(userId);
      await publishGoalReached({
        userId,
        email: user.email,
        goalType: 'weight',
        value: weightKg,
      });
    }
  }

  return profile;
}

module.exports = updateProfile;
