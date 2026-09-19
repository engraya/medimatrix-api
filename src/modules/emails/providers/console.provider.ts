import type { EmailMessage, EmailProvider } from '../email.provider.js';
// Test collector intentionally does not print contact details or credentials.
export const emailDeliveries: EmailMessage[] = [];
export const consoleEmail: EmailProvider = {
  async send(message) {
    if (emailDeliveries.length >= 100) emailDeliveries.shift();
    emailDeliveries.push(message);
  },
};
