const { sendEmail } = require('../../infrastructure/external/mailtrap.client');

async function sendWelcomeEmail({ email, name }) {
  if (!email) return;
  await sendEmail({
    to: email,
    subject: 'Bem-vindo ao FitnessApp!',
    html: `
      <h1>Olá, ${name}!</h1>
      <p>A tua conta foi criada com sucesso.</p>
      <p>Começa por preencher o teu perfil e definir os teus objetivos.</p>
      <p>Bom treino!</p>
    `,
    text: `Olá, ${name}! A tua conta foi criada com sucesso. Começa por preencher o teu perfil e definir os teus objetivos.`,
  });
  console.log(`[Notification] Welcome email sent to ${email}`);
}

module.exports = sendWelcomeEmail;
