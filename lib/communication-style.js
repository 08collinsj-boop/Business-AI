// Communication style is presentation-only. Never use it to alter authorisation,
// tenancy, safety, booking commitments, or approved business knowledge.
const FIELDS = Object.freeze({
  tone: ['natural', 'friendly', 'formal'],
  length: ['short', 'balanced', 'detailed'],
  emoji: ['none', 'occasional'],
  greeting: ['neutral', 'casual', 'formal']
});
const DEFAULT = Object.freeze({ enabled: false, tone: 'natural', length: 'balanced', emoji: 'none', greeting: 'neutral' });

export function normaliseCommunicationStyle(input = {}) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid communication style');
  if (Object.keys(input).some(k => k !== 'enabled' && !(k in FIELDS))) throw new Error('Invalid communication style field');
  if ('enabled' in input && typeof input.enabled !== 'boolean') throw new Error('Invalid communication style enabled');
  const profile = { ...DEFAULT };
  for (const [field, values] of Object.entries(FIELDS)) {
    if (field in input && !values.includes(input[field])) throw new Error(`Invalid communication style ${field}`);
    if (field in input) profile[field] = input[field];
  }
  profile.enabled = input.enabled ?? false;
  return profile;
}

export function communicationStyleInstructions(input = {}) {
  const p = normaliseCommunicationStyle(input);
  if (!p.enabled) return '';
  const tones = { natural: 'natural and professional', friendly: 'friendly and conversational', formal: 'formal and courteous' };
  const lengths = { short: 'short and direct', balanced: 'concise but complete', detailed: 'helpfully detailed' };
  const greetings = { neutral: 'neutral greetings', casual: 'casual greetings', formal: 'formal greetings' };
  return `Style preference only: Write in a ${tones[p.tone]} tone. Keep replies ${lengths[p.length]}. Use ${greetings[p.greeting]}. ${p.emoji === 'occasional' ? 'Use an occasional appropriate emoji.' : 'Avoid emojis.'} Maintain approved business facts, current safety rules, tenant boundaries, and human handover requirements above all style preferences. Never promise prices, attendance, booking availability, confirmed appointments, or actions not verified by authorised workflows. Do not impersonate a human or claim to have performed an unverified action.`;
}

// Designed only for explicitly consented owner-authored reply examples.
// No original text or individual/customer identifiers are returned or retained.
export function suggestCommunicationStyle(examples = []) {
  if (!Array.isArray(examples)) throw new Error('Invalid communication style examples');
  const messages = examples.filter(v => typeof v === 'string').slice(0, 40).map(v => v.trim().slice(0, 2000)).filter(Boolean);
  if (!messages.length) return { ...DEFAULT };
  const casual = messages.filter(v => /^(hi mate|hiya|hey|cheers|alright|no worries)\b/i.test(v)).length;
  const formal = messages.filter(v => /^(dear|good morning|good afternoon|kind regards)\b/i.test(v)).length;
  const emoji = messages.filter(v => /\p{Extended_Pictographic}/u.test(v)).length;
  const averageLength = messages.reduce((n, v) => n + v.length, 0) / messages.length;
  const tone = casual > formal && casual >= Math.ceil(messages.length / 2) ? 'friendly' : formal > casual && formal >= Math.ceil(messages.length / 2) ? 'formal' : 'natural';
  return {
    enabled: false,
    tone,
    length: averageLength < 100 ? 'short' : averageLength > 400 ? 'detailed' : 'balanced',
    emoji: emoji >= Math.ceil(messages.length / 2) ? 'occasional' : 'none',
    greeting: tone === 'friendly' ? 'casual' : tone === 'formal' ? 'formal' : 'neutral'
  };
}
