import addonsHandler from '../lib/addons-handler.js';
import marketingHandler from '../lib/marketing-handler.js';
import knowledgeHandler from '../lib/knowledge-handler.js';
import auditLogHandler from "../lib/audit-log-handler.js";
import dataLifecycleHandler from "../lib/data-lifecycle-handler.js";
import dataSubjectsHandler from "../lib/data-subjects-handler.js";
import healthHandler from "../lib/health-handler.js";
import teamHandler from "../lib/team-handler.js";
import handoverHandler from "../lib/handover-handler.js";
import publicBusinessHandler from "../lib/public-business-handler.js";
import billingHandler from "../lib/billing-handler.js";
import publicConfigHandler from "../lib/public-config-handler.js";
import metaHandler from '../lib/meta-handler.js';
import marketingPublicationHandler from '../lib/marketing-publication-handler.js';
import marketingScheduleHandler from '../lib/marketing-schedule-handler.js';
import marketingSchedulerHandler from '../lib/marketing-scheduler-handler.js';
import feedbackHandler from '../lib/feedback-handler.js';

// Vercel Hobby allows twelve Serverless Functions. The public API paths below
// are preserved with rewrites in vercel.json; this dispatcher only combines
// implementation packaging and does not relax the individual handlers' auth.
const handlers = Object.freeze({
  "audit-log": auditLogHandler,
  "data-lifecycle": dataLifecycleHandler,
  "data-subjects": dataSubjectsHandler,
  health: healthHandler,
  team: teamHandler,
  handovers: handoverHandler,
  "public-business": publicBusinessHandler,
  billing: billingHandler,
  addons: addonsHandler,
  marketing: marketingHandler,
  knowledge: knowledgeHandler,
  "public-config": publicConfigHandler,
  meta: metaHandler,
  "marketing-publications": marketingPublicationHandler,
  "marketing-schedules": marketingScheduleHandler,
  "marketing-scheduler": marketingSchedulerHandler,
  feedback: feedbackHandler
});

export default async function handler(req, res) {
  const operation = typeof req.query?.operation === "string" ? req.query.operation : "";
  const delegated = handlers[operation];
  if (!delegated) return res.status(404).json({ error: "Not found" });
  return delegated(req, res);
}
