// Auto-publishing is opt-in at the server AND per-business owner settings.
// Unset configuration must always fail closed on the Pilot.
export function isMarketingAutopublishPermitted(
  settings,
  flagEnabled = process.env.MARKETING_AUTOPUBLISH_ENABLED === 'true'
) {
  return flagEnabled === true
    && settings?.enabled === true
    && settings?.mode === 'fully_automated';
}
