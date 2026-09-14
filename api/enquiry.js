const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function getBusinessSettings() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/business_settings?select=*&limit=1`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error("Failed to load business settings");
  }

  const rows = await response.json();
  return rows[0] || {};
}

async function saveLead(lead) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/leads`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        name: lead.name || "",
        phone: lead.phone || "",
        email: lead.email || "",
        location: lead.location || "",
        job_type: lead.job_type || "",
        description: lead.description || "",
        urgency: lead.urgency || "",
        qualified: true
      })
    }
  );

  if (!response.ok) {
    throw new Error("Failed to save lead");
  }

  const saved = await response.json();

  try {
    if (saved[0]?.id) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/lead_history`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            lead_id: saved[0].id,
            action: "Lead created by AI receptionist"
          })
        }
      );
    }
  } catch (historyError) {
    console.error("Lead history error:", historyError);
  }

  return saved[0] || null;
}

function cleanMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter(
      message =>
        message &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim()
    )
    .slice(-20)
    .map(message => ({
      role: message.role,
      content: message.content.trim().slice(0, 4000)
    }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const body = req.body || {};

    const message = String(body.message || "").trim();
    const messages = cleanMessages(body.messages);

    if (!message) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const settings = await getBusinessSettings();

    const businessName =
      settings.business_name ||
      settings.company_name ||
      "the business";

    const systemPrompt = `
You are the AI receptionist for ${businessName}.

Your job is to speak naturally with customers, understand their enquiry and collect useful information for the business.

IMPORTANT:
- Remember information the customer has already provided in earlier messages.
- NEVER ask for information again if the customer has already provided it.
- Build the lead from the entire conversation, not just the latest message.
- If the customer gives several pieces of information at once, record all of them.
- Ask only for the most useful missing information.
- Do not repeatedly ask the same question.
- Be concise and natural.
- Do not claim to be human.
- Do not invent customer information.
- Only mark a lead qualified when there is enough useful information for the business to follow up.

Try to collect:
- name
- phone
- email
- location
- job_type
- description
- urgency

Return ONLY valid JSON in exactly this structure:

{
  "reply": "your response to the customer",
  "qualified": false,
  "lead": {
    "name": "",
    "phone": "",
    "email": "",
    "location": "",
    "job_type": "",
    "description": "",
    "urgency": ""
  }
}

If a field has not been provided, leave it as an empty string.

If the customer has already provided a field earlier in the conversation, keep that information in the lead object.
`;

    const conversation = [
      {
        role: "system",
        content: systemPrompt
      },
      ...messages
    ];

    if (
      !messages.length ||
      messages[messages.length - 1].role !== "user" ||
      messages[messages.length - 1].content !== message
    ) {
      conversation.push({
        role: "user",
        content: message
      });
    }

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-5.6-luna",
          input: conversation
        })
      }
    );

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("OpenAI error:", errorText);

      return res.status(500).json({
        error: "AI request failed"
      });
    }

    const data = await openAIResponse.json();

    const outputText =
      data.output_text ||
      data.output
        ?.flatMap(item => item.content || [])
        ?.filter(item => item.type === "output_text")
        ?.map(item => item.text)
        ?.join("") ||
      "";

    let result;

    try {
      result = JSON.parse(outputText);
    } catch (parseError) {
      console.error("AI JSON parse error:", outputText);

      return res.status(500).json({
        error: "AI returned an invalid response"
      });
    }

    const lead = {
      name: String(result.lead?.name || ""),
      phone: String(result.lead?.phone || ""),
      email: String(result.lead?.email || ""),
      location: String(result.lead?.location || ""),
      job_type: String(result.lead?.job_type || ""),
      description: String(result.lead?.description || ""),
      urgency: String(result.lead?.urgency || "")
    };

    let savedLead = null;

    if (result.qualified === true) {
      savedLead = await saveLead(lead);
    }

    return res.status(200).json({
      reply: String(result.reply || ""),
      qualified: result.qualified === true,
      lead,
      saved: !!savedLead,
      lead_id: savedLead?.id || null
    });

  } catch (error) {
    console.error("Enquiry API error:", error);

    return res.status(500).json({
      error: "Something went wrong"
    });
  }
}
