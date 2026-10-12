const REVIEW_PLATFORMS = new Set(["google", "facebook", "trustpilot"]);

function cleanHost(hostname) {
  return String(hostname || "").toLowerCase().replace(/^www\./, "");
}

function allowedHost(platform, hostname) {
  const host = cleanHost(hostname);
  if (platform === "google") {
    return host === "g.page"
      || host === "maps.app.goo.gl"
      || host === "google.com"
      || host.endsWith(".google.com");
  }
  if (platform === "facebook") {
    return host === "facebook.com"
      || host.endsWith(".facebook.com")
      || host === "fb.com"
      || host.endsWith(".fb.com");
  }
  if (platform === "trustpilot") {
    return host === "trustpilot.com" || host.endsWith(".trustpilot.com");
  }
  return false;
}

export function normaliseReviewPlatform(value) {
  const platform = String(value || "").trim().toLowerCase();
  return REVIEW_PLATFORMS.has(platform) ? platform : null;
}

export function normaliseReviewUrl(platform, value) {
  const cleaned = String(value || "").trim();
  if (!cleaned) return "";
  if (cleaned.length > 2048) return null;
  const safePlatform = normaliseReviewPlatform(platform);
  if (!safePlatform) return null;
  try {
    const url = new URL(cleaned);
    if (url.protocol !== "https:" || !allowedHost(safePlatform, url.hostname)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function reviewDestination(settings = {}) {
  const preferred = normaliseReviewPlatform(settings.review_preferred_platform) || "google";
  const google = normaliseReviewUrl("google", settings.review_google_url);
  const facebook = normaliseReviewUrl("facebook", settings.review_facebook_url);
  const trustpilot = normaliseReviewUrl("trustpilot", settings.review_trustpilot_url);
  const options = {
    google: google ? { platform: "google", label: "Google", url: google } : null,
    facebook: facebook ? { platform: "facebook", label: "Facebook", url: facebook } : null,
    trustpilot: trustpilot ? { platform: "trustpilot", label: "Trustpilot", url: trustpilot } : null
  };
  return options[preferred] || options.google || options.facebook || options.trustpilot || null;
}

export function buildReviewRequestMessage({ businessName, destination } = {}) {
  if (!destination?.url) return "";
  const name = String(businessName || "us").trim().slice(0, 120) || "us";
  return `Thanks for choosing ${name}. If you have a moment, we'd really appreciate your feedback. You can leave us a ${destination.label} review here: ${destination.url}`;
}
