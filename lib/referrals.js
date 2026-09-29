const REFERRAL_THRESHOLD = 5;

function connection() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/+$/, ""), key } : null;
}

async function request(path, options = {}) {
  const config = connection();
  if (!config) throw new Error("Referral storage unavailable");
  const response = await fetch(config.url + "/rest/v1/" + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: config.key,
      Authorization: "Bearer " + config.key,
      ...(options.headers || {})
    }
  });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok) {
    const error = new Error("Referral storage unavailable");
    error.status = response.status;
    throw error;
  }
  return data;
}

export function normaliseReferralCode(value) {
  const code = String(value || "").trim().toUpperCase();
  if (!code) return null;
  return /^BAI-[A-Z0-9]{10}$/.test(code) ? code : null;
}

export function referralCodeForBusiness(businessId) {
  const compact = String(businessId || "").replace(/-/g, "").toUpperCase();
  return /^[A-F0-9]{32}$/.test(compact) ? "BAI-" + compact.slice(0, 10) : null;
}

export async function ensureReferralProfile(businessId) {
  const generated = referralCodeForBusiness(businessId);
  if (!generated) throw new Error("Referral storage unavailable");
  const rows = await request(
    "business_referral_profiles?business_id=eq." + encodeURIComponent(businessId) + "&select=business_id,referral_code&limit=1"
  );
  if (Array.isArray(rows) && rows[0]?.referral_code) return rows[0];

  const created = await request("business_referral_profiles?on_conflict=business_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ business_id: businessId, referral_code: generated })
  });
  return Array.isArray(created) ? created[0] || null : created;
}

export async function getReferralSummary(businessId) {
  const profile = await ensureReferralProfile(businessId);
  const results = await Promise.all([
    request(
      "business_referrals?referrer_business_id=eq." + encodeURIComponent(businessId) + "&select=status,created_at,qualified_at&order=created_at.asc"
    ),
    request(
      "business_referral_rewards?business_id=eq." + encodeURIComponent(businessId) + "&select=id,sequence_number,status,earned_at,scheduled_at,redeemed_at&order=sequence_number.asc"
    )
  ]);
  const referralRows = Array.isArray(results[0]) ? results[0] : [];
  const rewardRows = Array.isArray(results[1]) ? results[1] : [];
  const qualified = referralRows.filter((row) => row.status === "qualified").length;
  const pending = referralRows.filter((row) => row.status === "pending").length;
  const progress = qualified % REFERRAL_THRESHOLD;
  const latestReward = rewardRows.at(-1) || null;

  return {
    code: profile?.referral_code || null,
    threshold: REFERRAL_THRESHOLD,
    qualified,
    pending,
    progress,
    remaining: progress === 0 && qualified > 0 ? REFERRAL_THRESHOLD : REFERRAL_THRESHOLD - progress,
    rewardsEarned: rewardRows.length,
    latestReward: latestReward ? {
      status: latestReward.status,
      sequenceNumber: latestReward.sequence_number,
      earnedAt: latestReward.earned_at,
      scheduledAt: latestReward.scheduled_at,
      redeemedAt: latestReward.redeemed_at
    } : null
  };
}

export async function qualifyReferralForBusiness(businessId, eventId) {
  const rows = await request("rpc/qualify_business_referral", {
    method: "POST",
    body: JSON.stringify({
      p_referred_business_id: businessId,
      p_event_id: eventId
    })
  });
  return Array.isArray(rows) ? rows[0] || null : rows;
}

export async function nextEarnedReferralReward(businessId) {
  const rows = await request(
    "business_referral_rewards?business_id=eq." + encodeURIComponent(businessId) + "&status=eq.earned&select=id,sequence_number,status&order=sequence_number.asc&limit=1"
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function scheduledReferralReward(businessId) {
  const rows = await request(
    "business_referral_rewards?business_id=eq." + encodeURIComponent(businessId) + "&status=eq.scheduled&select=id,sequence_number,status,stripe_subscription_id,scheduled_at&order=sequence_number.asc&limit=1"
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function markReferralRewardScheduled(rewardId, details = {}) {
  const rows = await request(
    "business_referral_rewards?id=eq." + encodeURIComponent(rewardId) + "&status=eq.earned",
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "scheduled",
        scheduled_at: new Date().toISOString(),
        stripe_subscription_id: details.subscriptionId || null,
        stripe_subscription_item_id: details.subscriptionItemId || null,
        stripe_coupon_id: details.couponId || null
      })
    }
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function redeemScheduledReferralReward(businessId, subscriptionId, invoiceId) {
  const reward = await scheduledReferralReward(businessId);
  if (!reward || !subscriptionId || reward.stripe_subscription_id !== subscriptionId) return null;
  const rows = await request(
    "business_referral_rewards?id=eq." + encodeURIComponent(reward.id) + "&status=eq.scheduled",
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "redeemed",
        redeemed_at: new Date().toISOString(),
        stripe_invoice_id: invoiceId || null
      })
    }
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}
