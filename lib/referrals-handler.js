import { requireBusinessMember, sendAuthError } from "./auth.js";
import { getReferralSummary } from "./referrals.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  let auth;
  try { auth = await requireBusinessMember(req, ["owner"]); }
  catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced) return res.status(503).json({ error: "Referrals are not enabled" });

  try {
    return res.status(200).json(await getReferralSummary(auth.businessId));
  } catch {
    return res.status(503).json({ error: "Referral progress is temporarily unavailable" });
  }
}
