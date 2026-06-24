const { sendEmail } = require('../../infrastructure/external/mailtrap.client');

const FOCUS_LABELS = {
  nutrition: 'Nutrição',
  workout: 'Treino',
  recovery: 'Recuperação',
};

async function sendRecommendationEmail({ email, recommendation, focus_area }) {
  if (!email) return;
  const focus = FOCUS_LABELS[focus_area] || focus_area;
  await sendEmail({
    to: email,
    subject: `Nova recomendação: ${focus}`,
    html: `
      <h1>Recomendação Personalizada</h1>
      <p><strong>Área:</strong> ${focus}</p>
      <p>${recommendation}</p>
    `,
    text: `Recomendação (${focus}): ${recommendation}`,
  });
  console.log(`[Notification] Recommendation email sent to ${email}`);
}

module.exports = sendRecommendationEmail;
