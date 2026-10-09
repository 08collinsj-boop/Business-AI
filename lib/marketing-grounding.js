import { addonError } from './addons.js';

// Automation has no owner-supplied factual brief. Keep a deliberately small,
// deterministic vocabulary until a claim-level evidence checker is available.
// Source titles, keywords, metadata, style examples and photo descriptions are
// never evidence. Profile fields here are the saved factual fields already used
// by marketingContext; Knowledge content is fetched with status=active.
export const AUTOMATION_NEUTRAL_CTAS = Object.freeze([
  'Contact us to find out more.',
  'Message us to find out more.',
  'Get in touch to learn more.'
]);

function normalize(value) {
  return String(value || '').normalize('NFKC').toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
}

function statements(value) {
  return String(value || '').split(/(?:[.!?](?=\s|$)|\n)+/)
    .map(normalize).filter(Boolean);
}

export function automationGroundingSources(facts = {}) {
  const sources = [];
  for (const key of ['business_name', 'services', 'address', 'opening_hours',
    'description', 'website', 'service_areas', 'phone', 'email']) {
    if (typeof facts[key] === 'string' && facts[key].trim()) sources.push(facts[key].trim());
  }
  for (const faq of Array.isArray(facts.faqs) ? facts.faqs : []) {
    if (typeof faq?.answer === 'string' && faq.answer.trim()) sources.push(faq.answer.trim());
  }
  for (const item of Array.isArray(facts.approved_uploaded_knowledge) ? facts.approved_uploaded_knowledge : []) {
    if (typeof item?.content === 'string' && item.content.trim()) sources.push(item.content.trim());
  }
  return sources;
}

export const AUTOMATION_GROUNDING_PROMPT = `AUTOMATED DRAFT FACTUALITY:
This is an automated brief, not an owner's factual assertion. OWNER REQUEST,
BRAND STYLE EXAMPLES, PHOTO CONTEXT and brand preferences supply no new facts.
AUTOMATION FACT SOURCES are the only permitted factual text.
Use one or two complete factual statements from those sources verbatim. You may
change case, whitespace and final punctuation only. Do not paraphrase, combine
fragments, add a hook, infer a benefit, or add industry or local-market claims.
In particular a service name alone does not prove that it saves time, prevents
missed customers, increases visibility, answers calls or collects leads.
Keep main_copy and short_alternative short even when the tone is promotional.
They may repeat the same supported statement when Knowledge is sparse.
An optional neutral CTA must be exactly one of AUTOMATION NEUTRAL CTAS.
Hashtags may contain only the saved business name, location/service area or
an exact saved service name. Omit them if no suitable identity tag is available.
Do not turn a Knowledge sentence into a benefit or reputation hashtag.
If the requested angle has no evidence, use a supported service statement.
If there is no usable factual text, do not invent any replacement statement.`;

export function validateAutomationGrounding(output, facts = {}) {
  const sources = automationGroundingSources(facts);
  const supported = new Set(sources.flatMap(statements));
  const neutral = new Set(AUTOMATION_NEUTRAL_CTAS.map(normalize));
  const categories = new Set();
  const main = statements(output?.main_copy);
  if (!main.some(statement => supported.has(statement))) categories.add('missing_supported_fact');
  for (const field of ['main_copy', 'short_alternative', 'call_to_action']) {
    if (statements(output?.[field]).some(statement => !supported.has(statement) && !neutral.has(statement))) {
      categories.add('unsupported_statement');
    }
  }
  const tagText = value => normalize(value).replace(/[^\p{L}\p{N}]/gu, '');
  const tagSources = ['business_name', 'address', 'service_areas', 'services']
    .flatMap(key => typeof facts[key] === 'string' ? facts[key].split(/[,;\n]+/) : [])
    .map(tagText).filter(Boolean);
  for (const hashtag of output?.hashtags || []) {
    const tag = tagText(hashtag);
    if (!tag || !tagSources.includes(tag)) categories.add('unsupported_hashtag');
  }
  if (categories.size) {
    const error = addonError(502, 'The automated draft contains claims not supported by saved business facts. Review Business Knowledge before running automation again.');
    error.code = 'MARKETING_GROUNDING_REJECTED';
    error.groundingCategories = [...categories];
    throw error;
  }
  return output;
}
