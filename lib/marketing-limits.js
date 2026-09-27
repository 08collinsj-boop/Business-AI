import { addonError, addonStorage } from './addons.js';

export const MAX_FACEBOOK_POSTS_PER_DAY = 3;

function limitError(message, code) {
  const error = addonError(429, message);
  error.code = code;
  return error;
}

function utcDayBounds(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw addonError(400, 'Invalid publication time');
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function facebookDailyPostUsage(
  businessId,
  scheduledFor,
  { excludeScheduleId = null, excludePublicationId = null } = {}
) {
  const { start, end } = utcDayBounds(scheduledFor);
  const [scheduleRows, publicationRows] = await Promise.all([
    addonStorage(
      'marketing_schedules?business_id=eq.' + encodeURIComponent(businessId)
      + '&platform=eq.facebook'
      + '&status=in.(scheduled,processing,posted)'
      + '&scheduled_for=gte.' + encodeURIComponent(start)
      + '&scheduled_for=lt.' + encodeURIComponent(end)
      + '&select=id,publication_id,scheduled_for,status&limit=100'
    ),
    addonStorage(
      'marketing_publications?business_id=eq.' + encodeURIComponent(businessId)
      + '&platform=eq.facebook'
      + '&status=in.(scheduled,publishing,published)'
      + '&scheduled_for=gte.' + encodeURIComponent(start)
      + '&scheduled_for=lt.' + encodeURIComponent(end)
      + '&select=id,scheduled_for,status&limit=100'
    )
  ]);

  const schedules = (Array.isArray(scheduleRows) ? scheduleRows : []).filter(row =>
    row.id !== excludeScheduleId && row.publication_id !== excludePublicationId
  );
  const linkedPublicationIds = new Set(schedules.map(row => row.publication_id).filter(Boolean));
  const publications = (Array.isArray(publicationRows) ? publicationRows : []).filter(row =>
    row.id !== excludePublicationId && !linkedPublicationIds.has(row.id)
  );
  const used = schedules.length + publications.length;

  return {
    limit: MAX_FACEBOOK_POSTS_PER_DAY,
    used,
    remaining: Math.max(0, MAX_FACEBOOK_POSTS_PER_DAY - used),
    day_start: start,
    day_end: end
  };
}

export async function assertFacebookDailyPostLimit(businessId, scheduledFor, exclusions = {}) {
  const usage = await facebookDailyPostUsage(businessId, scheduledFor, exclusions);
  if (usage.used >= usage.limit) {
    throw limitError(
      'Daily Facebook post limit reached (' + usage.limit + ' posts per day)',
      'MARKETING_DAILY_POST_LIMIT_REACHED'
    );
  }
  return usage;
}
