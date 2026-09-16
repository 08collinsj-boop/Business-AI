const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

export function normalisePublicBusinessSlug(value) {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase();
  return SLUG.test(slug) ? slug : null;
}

// The route value is public by design, but it never exposes an internal UUID
// to the browser. The repository supplies the only tenant mapping after the
// value has been validated. Future custom domains/widgets/locations can add
// route types without changing tenant identity or lead storage.
export async function resolvePublicBusinessRoute(repository, rawSlug) {
  const slug = normalisePublicBusinessSlug(rawSlug);
  if (!slug || !repository?.findActivePublicSlug) return null;
  const route = await repository.findActivePublicSlug(slug);
  if (!route?.business_id || route.route_type !== "slug" || route.route_value !== slug || route.active !== true) return null;
  return { businessId: route.business_id, slug };
}
