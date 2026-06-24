// Default messaging driver — no third-party accounts. Logs the send and
// returns ok. The automationEngine writes the timeline 'automation' activity
// (driver-agnostic), so swapping to a real provider changes nothing else.
export const consoleMessaging = {
  name: 'console',
  async send({ channel, to, template, leadId }) {
    // eslint-disable-next-line no-console
    console.log(`[messaging:console] ${template} → ${channel}:${to || '?'} (lead ${leadId})`);
    return { ok: true, providerMessageId: `console-${Date.now()}` };
  },
};

export default consoleMessaging;
