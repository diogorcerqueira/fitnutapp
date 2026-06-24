const foodRepo = require('../../infrastructure/repositories/food.repository');
const offClient = require('../../infrastructure/external/open-food-facts.client');

async function searchFood(name) {
  // 1. Check local cache first
  const local = await foodRepo.searchLocal(name);
  const fresh = local.filter(f => f.source === 'manual' || !offClient.isCacheExpired(f.cachedAt));
  if (fresh.length > 0) return fresh;

  // 2. Fetch from Open Food Facts
  try {
    const results = await offClient.searchByName(name);
    const saved = await Promise.all(results.map(r => foodRepo.upsertFromApi(r)));
    return saved;
  } catch (err) {
    console.warn('[SearchFood] Open Food Facts unavailable:', err.message);
    return local; // return stale cache as fallback
  }
}

module.exports = searchFood;
