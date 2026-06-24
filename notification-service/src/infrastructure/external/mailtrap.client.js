const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mailpit',
  port: parseInt(process.env.SMTP_PORT || '1025'),
  secure: false,
  auth: null,
});

async function sendEmail({ to, subject, html, text }) {
  if (!to) throw new Error('Email recipient is required');

  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || 'FitnessApp'}" <${process.env.SMTP_FROM_EMAIL || 'noreply@fitness-app.com'}>`,
    to,
    subject,
    html,
    text,
  });
}

module.exports = { sendEmail };
