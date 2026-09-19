import twilio from 'twilio';
import { env } from '../../config/env.js';
import type { SmsProvider } from './sms.provider.js';
export const twilioSms: SmsProvider = {
  async send(to, body) {
    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN, {
      timeout: 30000,
      autoRetry: false,
    });
    await client.messages.create({ to, from: env.TWILIO_FROM_NUMBER, body });
  },
};
