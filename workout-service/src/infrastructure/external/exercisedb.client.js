const axios = require('axios');

const RAPIDAPI_HOST = 'edb-with-videos-and-images-by-ascendapi.p.rapidapi.com';

async function searchExercises({ name, muscleGroup, equipment } = {}) {
  const params = { limit: 20 };
  if (name) params.name = name;
  if (muscleGroup) params.targetMuscle = muscleGroup;
  if (equipment) params.equipment = equipment;

  const { data } = await axios.get(`https://${RAPIDAPI_HOST}/api/v1/exercises`, {
    params,
    headers: {
      'x-rapidapi-key': process.env.EXERCISEDB_API_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST,
    },
    timeout: 8000,
  });

  return (data.data || []).map(ex => ({
    externalId: ex.exerciseId,
    name: ex.name,
    muscleGroup: ex.targetMuscles?.[0] || ex.bodyParts?.[0] || 'general',
    equipment: ex.equipments?.[0] || 'body weight',
    description: null,
  }));
}

module.exports = { searchExercises };
