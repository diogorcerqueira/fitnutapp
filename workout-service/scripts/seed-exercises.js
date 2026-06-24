/**
 * Seed script — run once to fetch exercises from ExerciseDB and save locally.
 * Usage:
 *   node scripts/seed-exercises.js --fetch   # fetch from API and write seeds/exercises.json
 *   node scripts/seed-exercises.js           # load from seeds/exercises.json into DB
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const SEEDS_FILE = path.join(__dirname, '../seeds/exercises.json');
const RAPIDAPI_HOST = 'edb-with-videos-and-images-by-ascendapi.p.rapidapi.com';
const prisma = new PrismaClient();

async function fetchFromApi() {
  const apiKey = process.env.EXERCISEDB_API_KEY;
  if (!apiKey) throw new Error('EXERCISEDB_API_KEY not set');

  const allExercises = [];
  let cursor = null;
  const limit = 500;

  console.log('Fetching from ExerciseDB API...');
  while (true) {
    const params = { limit };
    if (cursor) params.cursor = cursor;

    const { data } = await axios.get(`https://${RAPIDAPI_HOST}/api/v1/exercises`, {
      params,
      headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': RAPIDAPI_HOST },
    });

    const exercises = data.data || [];
    if (!exercises.length) break;

    allExercises.push(...exercises);
    console.log(`Fetched ${allExercises.length} exercises...`);

    if (!data.meta?.hasNextPage) break;
    cursor = data.meta.nextCursor;
    await new Promise(r => setTimeout(r, 300));
  }

  const mapped = allExercises.map(ex => ({
    externalId: ex.exerciseId,
    name: ex.name,
    muscleGroup: ex.targetMuscles?.[0] || ex.bodyParts?.[0] || 'General',
    equipment: ex.equipments?.[0] || 'Body Weight',
    description: null,
  }));

  fs.mkdirSync(path.dirname(SEEDS_FILE), { recursive: true });
  fs.writeFileSync(SEEDS_FILE, JSON.stringify(mapped, null, 2));
  console.log(`Saved ${mapped.length} exercises to ${SEEDS_FILE}`);
}

async function seedFromFile() {
  if (!fs.existsSync(SEEDS_FILE)) {
    console.log('No seed file found, skipping exercise seed.');
    return;
  }
  const exercises = JSON.parse(fs.readFileSync(SEEDS_FILE, 'utf8'));
  console.log(`Seeding ${exercises.length} exercises into DB...`);
  let count = 0;
  for (const ex of exercises) {
    await prisma.exercise.upsert({
      where: { externalId: ex.externalId },
      update: { name: ex.name, muscleGroup: ex.muscleGroup, equipment: ex.equipment, description: ex.description },
      create: ex,
    });
    count++;
    if (count % 100 === 0) console.log(`${count}/${exercises.length}`);
  }
  console.log('Seed complete.');
}

async function main() {
  const fetch = process.argv.includes('--fetch');
  if (fetch) {
    await fetchFromApi();
  }
  await seedFromFile();
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
