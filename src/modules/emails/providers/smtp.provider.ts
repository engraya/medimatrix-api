import nodemailer from 'nodemailer';
import { env } from '../../../config/env.js';
import type { EmailProvider } from '../email.provider.js';
export const smtpEmail: EmailProvider = {
  async send(message) {
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: false,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
    });
    try {
      await transport.sendMail({
        from: env.EMAIL_FROM,
        ...(env.EMAIL_REPLY_TO ? { replyTo: env.EMAIL_REPLY_TO } : {}),
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        messageId: `<${message.key}@medimatrix.local>`,
      });
    } finally {
      transport.close();
    }
  },
};
