const { sendEmail } = require('../../infrastructure/external/mailtrap.client');

const GOAL_LABELS = {
  weight: 'Peso alvo',
  daily_calories: 'Meta calórica diária',
  daily_protein: 'Meta proteica diária',
};

async function sendGoalReachedEmail({ email, goal_type, value }) {
  if (!email) return;
  const label = GOAL_LABELS[goal_type] || goal_type;
  await sendEmail({
    to: email,
    subject: `Objetivo atingido: ${label}!`,
    html: `
      <h1>Parabéns!</h1>
      <p>Atingiste o teu objetivo de <strong>${label}</strong>.</p>
      <p>Valor actual: <strong>${value}</strong></p>
      <p>Continua assim!</p>
    `,
    text: `Parabéns! Atingiste o teu objetivo de ${label}. Valor actual: ${value}.`,
  });
  console.log(`[Notification] Goal reached email sent to ${email} (${goal_type})`);
}

module.exports = sendGoalReachedEmail;
