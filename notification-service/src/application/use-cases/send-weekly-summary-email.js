const { sendEmail } = require('../../infrastructure/external/mailtrap.client');

async function sendWeeklySummaryEmail({ email, summary_content }) {
  if (!email) return;
  const { workouts_count, avg_daily_calories, latest_weight_kg, recommendations } = summary_content || {};
  const recList = recommendations?.map(r => `<li>${r}</li>`).join('') || '';

  await sendEmail({
    to: email,
    subject: 'O teu resumo semanal está pronto!',
    html: `
      <h1>Resumo da Semana</h1>
      <ul>
        ${workouts_count !== undefined ? `<li><strong>Treinos realizados:</strong> ${workouts_count}</li>` : ''}
        ${avg_daily_calories !== undefined ? `<li><strong>Média calórica diária:</strong> ${avg_daily_calories} kcal</li>` : ''}
        ${latest_weight_kg !== undefined ? `<li><strong>Peso mais recente:</strong> ${latest_weight_kg} kg</li>` : ''}
      </ul>
      ${recList ? `<h2>Recomendações da semana</h2><ul>${recList}</ul>` : ''}
    `,
    text: `Resumo semanal: ${workouts_count} treinos, média de ${avg_daily_calories} kcal/dia.`,
  });
  console.log(`[Notification] Weekly summary email sent to ${email}`);
}

module.exports = sendWeeklySummaryEmail;
