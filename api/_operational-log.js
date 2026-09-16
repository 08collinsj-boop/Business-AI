const EVENT = /^[a-z][a-z0-9_.-]{2,99}$/;

export function logOperationalEvent(event, details = {}) {
  if (!EVENT.test(event)) return;
  const safe = {};
  for (const [key, value] of Object.entries(details)) {
    if (/token|secret|password|authorization|email|phone|address|message|content/i.test(key)) continue;
    if (["string", "number", "boolean"].includes(typeof value) && String(value).length <= 200) safe[key] = value;
  }
  console.info(JSON.stringify({ event, ...safe }));
}
