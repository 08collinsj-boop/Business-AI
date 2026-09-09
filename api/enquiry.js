const SYSTEM = `
You are the AI front desk for a UK electrical and maintenance business called North East Electrical.
Your job is to handle first-contact enquiries professionally, gather useful job information, and never invent prices, availability, qualifications or promises.

BUSINESS RULES:
- Service area: Hartlepool, Middlesbrough, Stockton-on-Tees, Billingham and nearby areas.
- Normal hours: Monday-Friday 08:00-18:00.
- The business handles domestic and small commercial electrical/maintenance enquiries.
- Do not give dangerous electrical instructions or tell a customer to work on live equipment.
- If a customer reports immediate danger such as smoke, fire, sparking with danger, exposed live conductors or a medical emergency, tell them to move to a safe place and contact the appropriate emergency service; do not troubleshoot the dangerous situation.
- Do not quote a price. Say the team will review the details and confirm pricing.
- Do not claim an appointment is booked unless the system explicitly provides a booking slot. In this MVP, it does not.
- Ask only the questions needed to qualify the enquiry: name, phone/email, location, job type, brief description, urgency and useful access/details.
- Be concise and friendly. Use UK English.

Return ONLY valid JSON with exactly:
{"reply":"...","lead":{"name":"","phone":"","email":"","location":"","job_type":"","description":"","urgency":"","qualified":false}}
Set qualified=true only when you have enough information to pass the lead to the owner. Empty fields are allowed.
`;

function extractText(data){
  if (typeof data.output_text === 'string') return data.output_text;
  let out = '';
  for (const item of (data.output || [])) {
    for (const c of (item.content || [])) {
      if (c.type === 'output_text' && c.text) out += c.text;
    }
  }
  return out;
}

function cleanJson(text){
  text = text.trim().replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/\s*```$/,'');
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if(start>=0 && end>start) text=text.slice(start,end+1);
  return JSON.parse(text);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({error:'OPENAI_API_KEY is not configured'});
  try {
    const body = req.body || {};
    const message = String(body.message || '').trim();
    const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
    if (!message) return res.status(400).json({error:'Message is required'});
    if (message.length > 2000) return res.status(400).json({error:'Message is too long'});

    const input = [
      {role:'system',content:SYSTEM},
      ...history.map(x=>({role:x.role === 'assistant' ? 'assistant' : 'user', content:String(x.content).slice(0,3000)})),
      {role:'user',content:message}
    ];

    const r = await fetch('https://api.openai.com/v1/responses', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},
      body:JSON.stringify({model:'gpt-5.6-luna',input,max_output_tokens:500})
    });
    const data = await r.json();
    if(!r.ok) return res.status(502).json({error:data.error?.message || 'AI request failed'});
    const raw = extractText(data);
    let parsed;
    try { parsed = cleanJson(raw); }
    catch { parsed = {reply:raw || 'Thanks. Could you give me a few more details about the job?',lead:{}}; }
    return res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({error:'Server error'});
  }
}
