import { Resend } from 'resend';
import { env } from '../../../config/env.js';
import type { EmailProvider } from '../email.provider.js';
export const resendEmail: EmailProvider = {
  async send(message) {
    const client = new Resend(env.RESEND_API_KEY);
    const result = await client.emails.send(
      {
        from: env.EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(env.EMAIL_REPLY_TO ? { replyTo: env.EMAIL_REPLY_TO } : {}),
      },
      { idempotencyKey: message.key },
    );
    if (result.error) throw new Error('Email provider rejected delivery');
  },
};
