import leadsHandler from "./leads.js";
import colzoLeadsHandler from "../lib/colzo-leads-handler.js";
import pipelineHandler from "./pipeline.js";
import settingsHandler from "./settings.js";
import legalHandler from '../lib/legal-handler.js';
import legalPublicHandler from '../lib/legal-public-handler.js';
import addonsHandler from '../lib/addons-handler.js';
import marketingHandler from '../lib/marketing-handler.js';
import knowledgeHandler from '../lib/knowledge-verified-handler.js';
import auditLogHandler from "../lib/audit-log-handler.js";
import dataLifecycleHandler from "../lib/data-lifecycle-handler.js";
import dataSubjectsHandler from "../lib/data-subjects-handler.js";
import healthHandler from "../lib/health-handler.js";
import teamHandler from "../lib/team-handler.js";
import handoverHandler from "../lib/handover-handler.js";
import publicBusinessHandler from "../lib/public-business-handler.js";
import publicBusinessesHandler from "../lib/public-businesses-handler.js";
import customerPortalHandler from "../lib/customer-portal-handler.js";
import customerRepliesHandler from "../lib/customer-replies-handler.js";
import billingHandler from "../lib/billing-handler.js";
import referralsHandler from "../lib/referrals-handler.js";
import qrCodeHandler from "../lib/qr-code-handler.js";
import valueDashboardHandler from "../lib/value-dashboard-handler.js";
import publicConfigHandler from "../lib/public-config-handler.js";
import metaHandler from '../lib/meta-handler.js';
import marketingPublicationHandler from '../lib/marketing-publication-handler.js';
import marketingScheduleHandler from '../lib/marketing-schedule-handler.js';
import marketingSchedulerHandler from '../lib/marketing-scheduler-handler.js';
import marketingImageHandler from '../lib/marketing-image-handler.js';
import marketingAutomationHandler from '../lib/marketing-automation-handler.js';
import feedbackHandler from '../lib/feedback-handler.js';
import incidentControlsHandler from '../lib/incident-controls-handler.js';
import businessProfileHandler from '../lib/business-profile-handler.js';
import colzoRecordsHandler from '../lib/colzo-records-handler.js';
import { observeOperation } from '../lib/operations-observability.js';
import { isApprovedSupabaseTarget, isColzoPreviewAuthTransportEnabled, restorePreviewAuthToken } from '../lib/public-config-handler.js';

// Vercel Hobby allows twelve Serverless Functions. The public API paths below
// are preserved with rewrites in vercel.json; this dispatcher only combines
// implementation packaging and does not relax the individual handlers' auth.
const handlers = Object.freeze({
  leads: leadsHandler,
  pipeline: pipelineHandler,
  settings: settingsHandler,
  "colzo-records": colzoRecordsHandler,
  "audit-log": auditLogHandler,
  "data-lifecycle": dataLifecycleHandler,
  "data-subjects": dataSubjectsHandler,
  health: healthHandler,
  team: teamHandler,
  handovers: handoverHandler,
  "public-business": publicBusinessHandler,
  "public-businesses": publicBusinessesHandler,
  "customer-portal": customerPortalHandler,
  "customer-replies": customerRepliesHandler,
  billing: billingHandler,
  referrals: referralsHandler,
  "qr-code": qrCodeHandler,
  "value-dashboard": valueDashboardHandler,
  addons: addonsHandler,
  marketing: marketingHandler,
  knowledge: knowledgeHandler,
  "public-config": publicConfigHandler,
  meta: metaHandler,
  "marketing-publications": marketingPublicationHandler,
  "marketing-schedules": marketingScheduleHandler,
  "marketing-scheduler": marketingSchedulerHandler,
  "marketing-images": marketingImageHandler,
  "marketing-automation": marketingAutomationHandler,
  feedback: feedbackHandler,
  "incident-controls": incidentControlsHandler,
  "business-profile": businessProfileHandler,
  legal: legalHandler,
  "legal-public": legalPublicHandler
});

export default async function handler(req, res) {
  const operation = typeof req.query?.operation === "string" ? req.query.operation : "";
  // Keep the immutable Business AI Leads API unchanged. Colzo Preview alone
  // uses confirmed-save semantics; every other environment retains legacy.
  const delegated = operation === "leads" && isColzoPreviewAuthTransportEnabled()
    ? colzoLeadsHandler : handlers[operation];
  if (!delegated) return res.status(404).json({ error: "Not found" });
  // Fail closed at the Colzo Preview dispatcher before any authenticated
  // operation touches a Supabase backend from an unexpected environment.
  // This leaves the shared Business AI authentication module untouched.
  if (!isApprovedSupabaseTarget()) {
    return res.status(503).json({ error: "Colzo development environment unavailable" });
  }
  const observation = observeOperation(req, res, operation);
  try {
    restorePreviewAuthToken(req);
    return await delegated(req, res);
  } catch (error) {
    observation.fail(error);
    if (!res.headersSent) return res.status(500).json({ error: "Internal server error" });
    throw error;
  } finally {
    observation.complete();
  }
}
