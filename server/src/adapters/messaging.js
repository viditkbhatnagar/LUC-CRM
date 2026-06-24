// Messaging adapter — swappable email/WhatsApp/SMS (06 §5). Selected by
// MESSAGING_DRIVER. Default = consoleMessaging (fully functional, no accounts).
// Real providers (Nodemailer/Twilio/Meta) implement the same send() contract.
import { env } from '../config/env.js';
import { consoleMessaging } from './consoleMessaging.js';

const driver = consoleMessaging; // only the console driver ships in v1
if (env.messagingDriver !== 'console') {
  // eslint-disable-next-line no-console
  console.warn(`[messaging] driver "${env.messagingDriver}" not bundled; using console.`);
}

// send({ channel: 'email'|'whatsapp'|'sms', to, template, data, leadId }) → { ok }
export const send = (args) => driver.send(args);

// Pick a channel from a lead's consent (none → no send).
export function channelForConsent(consent) {
  if (consent === 'email') return 'email';
  if (consent === 'whatsapp' || consent === 'all') return 'whatsapp';
  return null; // 'none'
}

export default { send, channelForConsent };
