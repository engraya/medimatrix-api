import { env } from '../../../config/env.js';
export function appointmentMessage(
  status: 'SCHEDULED' | 'CANCELLED',
  schedule: Date,
  doctor: string,
  reason = '',
) {
  const date = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: env.NOTIFICATION_TIMEZONE,
  }).format(schedule);
  return status === 'SCHEDULED'
    ? `Greetings from MediMatrix. Your appointment is confirmed for ${date} with Dr. ${doctor}.`
    : `Greetings from MediMatrix. We regret to inform that your appointment for ${date} is cancelled. Reason: ${reason}.`;
}
