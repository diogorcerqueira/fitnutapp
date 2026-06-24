const axios = require('axios');

const BASE_URL = 'https://world.openfoodfacts.org';
const CACHE_TTL_DAYS = 30;

function isCacheExpired(cachedAt) {
  if (!cachedAt) return true;
  const expiry = new Date(cachedAt);
  expiry.setDate(expiry.getDate() + CACHE_TTL_DAYS);
  return new Date() > expiry;
}

async function searchByName(name) {
  const { data } = await axios.get(`${BASE_URL}/cgi/search.pl`, {
    params: {
      search_terms: name,
      search_simple: 1,
      action: 'process',
      json: 1,
      page_size: 10,
      fields: 'id,product_name,nutriments',
    },
    timeout: 8000,
  });

  return (data.products || [])
    .filter(p => p.product_name && p.nutriments)
    .map(p => ({
      externalId: p.id,
      name: p.product_name,
      calories: p.nutriments['energy-kcal_100g'] || 0,
      proteinG: p.nutriments['proteins_100g'] || 0,
      carbsG: p.nutriments['carbohydrates_100g'] || 0,
      fatG: p.nutriments['fat_100g'] || 0,
    }));
}

module.exports = { searchByName, isCacheExpired };
