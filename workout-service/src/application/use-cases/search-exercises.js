const exerciseRepo = require('../../infrastructure/repositories/exercise.repository');
const exercisedbClient = require('../../infrastructure/external/exercisedb.client');

async function searchExercises({ name, muscleGroup, equipment } = {}) {
  const local = await exerciseRepo.findAll({ name, muscleGroup, equipment });

  const hasFilters = name || muscleGroup || equipment;
  if (!hasFilters || local.length >= 5) return local;

  if (!process.env.EXERCISEDB_API_KEY) return local;

  try {
    const results = await exercisedbClient.searchExercises({ name, muscleGroup, equipment });
    if (!results.length) return local;
    await exerciseRepo.upsertMany(results);
    return exerciseRepo.findAll({ name, muscleGroup, equipment });
  } catch (err) {
    console.warn('[SearchExercises] ExerciseDB unavailable:', err.message);
    return local;
  }
}

module.exports = searchExercises;
