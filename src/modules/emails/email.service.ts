import { render } from '@react-email/render';
import { env } from '../../config/env.js';
import { emailLayout } from './templates/layout.js';
import { consoleEmail } from './providers/console.provider.js';
import { smtpEmail } from './providers/smtp.provider.js';
import { resendEmail } from './providers/resend.provider.js';
export async function sendEmail(to: string, subject: string, text: string, key: string) {
  const html = await render(emailLayout(subject, text));
  await { console: consoleEmail, smtp: smtpEmail, resend: resendEmail }[env.EMAIL_PROVIDER].send({
    to,
    subject,
    text,
    html,
    key,
  });
}
