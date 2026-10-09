// Format approved Marketing draft fields for a plain-text social post.
// Do not edit stored approved drafts; normalise only the outbound payload.
import { createHash } from 'node:crypto';

export function marketingCaptionReviewHash(generationId, caption) {
  return createHash('sha256').update(`${generationId}\n${caption}`).digest('hex');
}
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


function deduplicateCaptionHashtags(value, seen) {
  // Preserve the first occurrence and spelling of each hashtag across all sections.
  // Only tidy a line if we removed a duplicate; otherwise leave the copy alone.
  const lines = value.split('\n').map(line => {
    let removed = false;
    const cleaned = line.replace(HASHTAG, tag => {
      const key = tag.toLocaleLowerCase('en-GB');
      if (seen.has(key)) { removed = true; return ''; }
      seen.add(key);
      return tag;
    });
    return removed
      ? cleaned.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+(?=[.,!?;:])/g, '').trim()
      : line;
  });
  return normaliseMarketingLineBreaks(lines.join('\n'));
}

export function composeMarketingCaption(output) {
  if (!output || typeof output !== 'object' || Array.isArray(output)) return '';
  const seen = new Set();
  const main = deduplicateCaptionHashtags(normaliseMarketingLineBreaks(output.main_copy), seen);
  const cta = normaliseMarketingLineBreaks(output.call_to_action);
  const parts = main ? [main] : [];
  // Ignore repeated calls to action before counting their hashtags.
  if (cta && !repeatsCallToAction(main, cta)) {
    const uniqueCta = deduplicateCaptionHashtags(cta, seen);
    if (uniqueCta) parts.push(uniqueCta);
  }

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
