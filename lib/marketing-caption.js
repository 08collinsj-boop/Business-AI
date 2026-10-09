// Format approved Marketing draft fields for a plain-text social post.
// Do not edit stored approved drafts; normalise only the outbound payload.
const HASHTAG = /#[\p{L}\p{N}_]+/gu;
const CTA_VERBS = new Set(['message', 'contact', 'call', 'email', 'text', 'dm', 'book', 'visit', 'send']);

export function normaliseMarketingLineBreaks(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/\\r\\n|\\n|\\r/g, '\n')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function comparableText(value) {
  return value.toLocaleLowerCase('en-GB').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function repeatsCallToAction(main, cta) {
  if (!main || !cta) return false;
  const mainWords = ' ' + comparableText(main) + ' ';
  const ctaWords = comparableText(cta);
  if (ctaWords && mainWords.includes(' ' + ctaWords + ' ')) return true;
  const words = ctaWords.split(' ');
  if (!CTA_VERBS.has(words[0]) || words.length < 2) return false;
  // 'Message the page...' and 'Message us...' repeat the same instruction.
  const length = ['the', 'our', 'a'].includes(words[1]) ? 3 : 2;
  if (words.length < length) return false;
  return mainWords.includes(' ' + words.slice(0, length).join(' ') + ' ');
}

export function composeMarketingCaption(output) {
  if (!output || typeof output !== 'object' || Array.isArray(output)) return '';
  const main = normaliseMarketingLineBreaks(output.main_copy);
  const cta = normaliseMarketingLineBreaks(output.call_to_action);
  const parts = main ? [main] : [];
  if (cta && !repeatsCallToAction(main, cta)) parts.push(cta);

  const seen = new Set((parts.join(' ').match(HASHTAG) || []).map(tag => tag.toLocaleLowerCase('en-GB')));
  const extra = [];
  for (const item of Array.isArray(output.hashtags) ? output.hashtags : []) {
    if (typeof item !== 'string') continue;
    const normalized = normaliseMarketingLineBreaks(item);
    const found = normalized.match(HASHTAG) || (/^[\p{L}\p{N}_]+$/u.test(normalized) ? ['#' + normalized] : []);
    for (const tag of found) {
      const key = tag.toLocaleLowerCase('en-GB');
      if (!seen.has(key)) { seen.add(key); extra.push(tag); }
    }
  }
  if (extra.length) parts.push(extra.join(' '));
  return parts.join('\n\n').trim();
}
