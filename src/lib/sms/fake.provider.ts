import type { SmsProvider } from './sms.provider.js';
export const smsDeliveries: { to: string; body: string }[] = [];
export const fakeSms: SmsProvider = {
  async send(to, body) {
    if (smsDeliveries.length >= 100) smsDeliveries.shift();
    smsDeliveries.push({ to, body });
  },
};
