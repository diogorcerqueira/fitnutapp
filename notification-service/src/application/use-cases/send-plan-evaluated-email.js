const { sendEmail } = require('../../infrastructure/external/mailtrap.client');

async function sendPlanEvaluatedEmail({ email, workout_plan_id, evaluation }) {
  if (!email) return;
  const suggestions = evaluation?.suggestions?.map(s => `<li>${s}</li>`).join('') || '';
  await sendEmail({
    to: email,
    subject: 'O teu plano de treino foi avaliado!',
    html: `
      <h1>Avaliação do Plano de Treino</h1>
      <h2>Apreciação geral</h2>
      <p>${evaluation?.general_assessment || 'Sem avaliação disponível.'}</p>
      ${suggestions ? `<h2>Sugestões</h2><ul>${suggestions}</ul>` : ''}
      ${evaluation?.goal_adequacy ? `<h2>Adequação ao objetivo</h2><p>${evaluation.goal_adequacy}</p>` : ''}
      <p>Abre a aplicação para ver todos os detalhes.</p>
    `,
    text: `O teu plano de treino foi avaliado. ${evaluation?.general_assessment || ''}`,
  });
  console.log(`[Notification] Plan evaluated email sent to ${email} (plan: ${workout_plan_id})`);
}

module.exports = sendPlanEvaluatedEmail;
