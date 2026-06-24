// Automation engine — runs onCreate/onEntry/onExit handlers from
// workflow.config (06). M4 ships this as a no-op hook so transitionService can
// call it; M5 implements the handlers (messaging adapter, reminders,
// notifications) and every automated effect becomes an 'automation' activity.
export async function runAutomations(/* lead, event, ctx */) {
  // M5: read config automations for `event`, execute handlers, log activities.
  return [];
}

export default { runAutomations };
