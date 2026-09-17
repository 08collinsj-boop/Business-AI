import auditLogHandler from "../lib/audit-log-handler.js";
import dataLifecycleHandler from "../lib/data-lifecycle-handler.js";
import dataSubjectsHandler from "../lib/data-subjects-handler.js";
import healthHandler from "../lib/health-handler.js";
import teamHandler from "../lib/team-handler.js";
import handoverHandler from "../lib/handover-handler.js";
import publicBusinessHandler from "../lib/public-business-handler.js";
import billingHandler from "../lib/billing-handler.js";

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
  billing: billingHandler
});

export default async function handler(req, res) {
  const operation = typeof req.query?.operation === "string" ? req.query.operation : "";
  const delegated = handlers[operation];
  if (!delegated) return res.status(404).json({ error: "Not found" });
  return delegated(req, res);
}
