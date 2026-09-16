// Industry templates are deliberately data-only defaults. They never change
// authorisation, safety policy, tenant routing, or server-side business scope.
export const INDUSTRY_TEMPLATES = Object.freeze({
  general: Object.freeze({ label: "General business", description: "A flexible starting point for most local businesses.", defaults: {} }),
  trades: Object.freeze({ label: "Trades & home services", description: "For repair, installation and maintenance businesses.", defaults: { customer_enquiry_instructions: "Collect the service needed, location, contact details and urgency. Do not promise an attendance time or price.", booking_preferences: { booking_mode: "request", confirmation_required: true } } }),
  automotive: Object.freeze({ label: "Garage & automotive", description: "For garages, vehicle servicing and repair businesses.", defaults: { customer_enquiry_instructions: "Collect vehicle details, the issue, preferred contact details and urgency. Do not diagnose remotely or promise a completion time.", booking_preferences: { booking_mode: "request", confirmation_required: true } } }),
  personal_care: Object.freeze({ label: "Salon, barber & personal care", description: "For appointment-based personal care businesses.", defaults: { customer_enquiry_instructions: "Collect the requested service, preferred date or time and contact details. Treat every appointment as a request until confirmed.", booking_preferences: { booking_mode: "request", confirmation_required: true } } }),
  lawn_care: Object.freeze({ label: "Lawn care & landscaping", description: "For outdoor maintenance and landscaping businesses.", defaults: { customer_enquiry_instructions: "Collect the work required, location, property details and contact details. Do not promise a visit time or quote.", booking_preferences: { booking_mode: "request", confirmation_required: true } } }),
  hospitality: Object.freeze({ label: "Restaurant & hospitality", description: "For restaurants and hospitality businesses.", defaults: { customer_enquiry_instructions: "Collect the enquiry or reservation request and contact details. Do not confirm availability unless an authorised booking workflow has done so.", booking_preferences: { booking_mode: "request", confirmation_required: true } } }),
  professional_services: Object.freeze({ label: "Professional services", description: "For consultancies and other professional services.", defaults: { customer_enquiry_instructions: "Collect the enquiry summary and contact details. Do not provide regulated, legal, medical or financial advice.", booking_preferences: { booking_mode: "request", confirmation_required: true } } })
});

const TEXT_LIMITS = Object.freeze({
  industry_template_id: 64,
  description: 4000,
  website: 2048,
  service_areas: 4000,
  customer_enquiry_instructions: 6000,
  handover_instructions: 4000
});
const MODULE_NAMES = new Set(["enquiries", "bookings", "actions", "voice"]);
const BOOKING_PREFERENCE_NAMES = new Set(["booking_mode", "confirmation_required", "allow_customer_requests", "minimum_notice_hours", "timezone"]);

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function cleanText(value, field) {
  if (typeof value !== "string" || value.length > TEXT_LIMITS[field]) throw new Error(`Invalid ${field}`);
  return value.trim();
}

function validWebsite(value) {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch { return false; }
}

export function getIndustryTemplates() {
  return Object.entries(INDUSTRY_TEMPLATES).map(([id, template]) => ({ id, label: template.label, description: template.description, defaults: template.defaults }));
}

export function applyIndustryTemplate(templateId, existing = {}) {
  const template = INDUSTRY_TEMPLATES[templateId] || INDUSTRY_TEMPLATES.general;
  return { ...template.defaults, ...existing, industry_template_id: templateId in INDUSTRY_TEMPLATES ? templateId : "general" };
}

export function validateBusinessConfiguration(body) {
  if (!plainObject(body)) throw new Error("Invalid request body");
  const allowed = new Set([
    "industry_template_id", "description", "website", "service_areas",
    "customer_enquiry_instructions", "faqs", "booking_preferences",
    "handover_instructions", "enabled_modules", "complete_onboarding"
  ]);
  if (Object.keys(body).some((key) => !allowed.has(key))) throw new Error("Unsupported configuration fields");
  const updates = {};
  for (const field of ["industry_template_id", "description", "website", "service_areas", "customer_enquiry_instructions", "handover_instructions"]) {
    if (body[field] === undefined) continue;
    const value = cleanText(body[field], field);
    if (field === "industry_template_id" && !INDUSTRY_TEMPLATES[value]) throw new Error("Invalid industry template");
    if (field === "website" && !validWebsite(value)) throw new Error("Invalid website");
    updates[field] = value;
  }
  if (body.faqs !== undefined) {
    if (!Array.isArray(body.faqs) || body.faqs.length > 40) throw new Error("Invalid FAQs");
    updates.faqs = body.faqs.map((item) => {
      if (!plainObject(item) || Object.keys(item).some((key) => key !== "question" && key !== "answer")) throw new Error("Invalid FAQs");
      const question = typeof item.question === "string" ? item.question.trim() : "";
      const answer = typeof item.answer === "string" ? item.answer.trim() : "";
      if (!question || !answer || question.length > 500 || answer.length > 2000) throw new Error("Invalid FAQs");
      return { question, answer };
    });
  }
  if (body.booking_preferences !== undefined) {
    if (!plainObject(body.booking_preferences) || Object.keys(body.booking_preferences).some((key) => !BOOKING_PREFERENCE_NAMES.has(key))) throw new Error("Invalid booking preferences");
    const preferences = {};
    if (body.booking_preferences.booking_mode !== undefined) {
      if (!["request", "manual"].includes(body.booking_preferences.booking_mode)) throw new Error("Invalid booking preferences");
      preferences.booking_mode = body.booking_preferences.booking_mode;
    }
    for (const key of ["confirmation_required", "allow_customer_requests"]) {
      if (body.booking_preferences[key] !== undefined) {
        if (typeof body.booking_preferences[key] !== "boolean") throw new Error("Invalid booking preferences");
        preferences[key] = body.booking_preferences[key];
      }
    }
    if (body.booking_preferences.minimum_notice_hours !== undefined) {
      const value = body.booking_preferences.minimum_notice_hours;
      if (!Number.isSafeInteger(value) || value < 0 || value > 8760) throw new Error("Invalid booking preferences");
      preferences.minimum_notice_hours = value;
    }
    if (body.booking_preferences.timezone !== undefined) {
      if (typeof body.booking_preferences.timezone !== "string" || body.booking_preferences.timezone.length > 64) throw new Error("Invalid booking preferences");
      preferences.timezone = body.booking_preferences.timezone.trim();
    }
    updates.booking_preferences = preferences;
  }
  if (body.enabled_modules !== undefined) {
    if (!plainObject(body.enabled_modules) || Object.keys(body.enabled_modules).some((key) => !MODULE_NAMES.has(key))) throw new Error("Invalid enabled modules");
    const modules = {};
    for (const [key, value] of Object.entries(body.enabled_modules)) {
      if (typeof value !== "boolean") throw new Error("Invalid enabled modules");
      // Voice cannot be enabled from configuration. Provider setup remains an
      // explicit, server-authorized future workflow.
      modules[key] = key === "voice" ? false : value;
    }
    updates.enabled_modules = modules;
  }
  if (body.complete_onboarding !== undefined) {
    if (typeof body.complete_onboarding !== "boolean") throw new Error("Invalid onboarding state");
    updates.onboarding_completed_at = body.complete_onboarding ? new Date().toISOString() : null;
  }
  if (!Object.keys(updates).length) throw new Error("No changes supplied");
  return updates;
}

export function sanitizeReceptionistConfiguration(configuration = {}) {
  const faqs = Array.isArray(configuration.faqs) ? configuration.faqs.slice(0, 40).map((faq) => ({
    question: typeof faq?.question === "string" ? faq.question.slice(0, 500) : "",
    answer: typeof faq?.answer === "string" ? faq.answer.slice(0, 2000) : ""
  })).filter((faq) => faq.question && faq.answer) : [];
  return {
    industryTemplateId: INDUSTRY_TEMPLATES[configuration.industry_template_id] ? configuration.industry_template_id : "general",
    description: typeof configuration.description === "string" ? configuration.description.slice(0, 4000) : "",
    website: typeof configuration.website === "string" ? configuration.website.slice(0, 2048) : "",
    serviceAreas: typeof configuration.service_areas === "string" ? configuration.service_areas.slice(0, 4000) : "",
    enquiryInstructions: typeof configuration.customer_enquiry_instructions === "string" ? configuration.customer_enquiry_instructions.slice(0, 6000) : "",
    faqs,
    bookingPreferences: plainObject(configuration.booking_preferences) ? configuration.booking_preferences : {},
    handoverInstructions: typeof configuration.handover_instructions === "string" ? configuration.handover_instructions.slice(0, 4000) : "",
    enabledModules: plainObject(configuration.enabled_modules) ? configuration.enabled_modules : {}
  };
}
