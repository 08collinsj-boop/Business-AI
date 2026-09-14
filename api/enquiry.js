const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SUPABASE_TIMEOUT_MS = 8000;
const SUPABASE_RETRIES = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function supabaseUrl(path) {
  if (!SUPABASE_URL) throw new Error("SUPABASE_URL is not configured");
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  return `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${path}`;
}

async function supabaseRequest(path, options = {}) {
  let lastError;

  for (let attempt = 1; attempt <= SUPABASE_RETRIES; attempt++) {
    const controller = new AbortController();

    const timeout = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);

    try {
      const response = await fetch(supabaseUrl(path), {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          ...(options.headers || {})
        }
      });

      clearTimeout(timeout);

      const text = await response.text();

      let data = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }

      if (response.ok) return data;

      const message =
        typeof data === "string"
          ? data
          : data?.message ||
            data?.error ||
            `Supabase returned ${response.status}`;

      if (response.status >= 500 && attempt < SUPABASE_RETRIES) {
        await sleep(400 * attempt);
        continue;
      }

      throw new Error(`Supabase ${response.status}: ${message}`);
    } catch (error) {
      clearTimeout(timeout);

      lastError =
        error?.name === "AbortError"
          ? new Error("Supabase request timed out")
          : error;

      if (attempt < SUPABASE_RETRIES) {
        await sleep(400 * attempt);
      }
    }
  }

  throw lastError || new Error("Supabase request failed");
}

async function getBusinessSettings() {
  try {
    const rows = await supabaseRequest(
      "business_settings?select=business_name&limit=1"
    );

    return rows?.[0] || {};
  } catch (error) {
    console.error(
      "Business settings unavailable:",
      error?.message || error
    );

    return {};
  }
}

function cleanMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter(
      (message) =>
        message &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim()
    )
    .map((message) => ({
      role: message.role,
      content: message.content.trim()
    }));
}

function buildConversation(history, message) {
  const conversation = [];

  for (const item of history) {
    conversation.push({
      role: item.role,
      content: item.content
    });
  }

  conversation.push({
    role: "user",
    content: message
  });

  return conversation;
}

function normalisePhone(value) {
  if (!value) return null;

  const digits = String(value).replace(/\D/g, "");

  if (!digits) return null;

  if (digits.startsWith("44") && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }

  return digits;
}

function findPhoneInConversation(conversationText) {
  const matches = conversationText.match(
    /(?:\+44\s?|0)(?:\d[\s-]?){9,10}/g
  );

  if (!matches?.length) return null;

  return normalisePhone(matches[matches.length - 1]);
}

function findEmailInConversation(conversationText) {
  const matches = conversationText.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
  );

  return matches?.length
    ? matches[matches.length - 1].trim()
    : null;
}

function findNameInConversation(conversationText) {
  const patterns = [
    /my name is\s+([A-Za-z][A-Za-z '-]{1,50})/i,
    /i'm\s+([A-Za-z][A-Za-z '-]{1,50})/i,
    /i am\s+([A-Za-z][A-Za-z '-]{1,50})/i
  ];

  for (const pattern of patterns) {
    const match = conversationText.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function findLocationInConversation(conversationText) {
  const knownLocations = [
    "Hartlepool",
    "Middlesbrough",
    "Stockton",
    "Billingham",
    "Redcar",
    "Sunderland",
    "Durham",
    "Peterlee",
    "Seaham",
    "Darlington"
  ];

  for (const location of knownLocations) {
    if (new RegExp(`\\b${location}\\b`, "i").test(conversationText)) {
      return location;
    }
  }

  const match = conversationText.match(
    /(?:in|near|around)\s+([A-Za-z][A-Za-z '-]{2,40})/i
  );

  return match?.[1]?.trim() || null;
}

function findJobDetails(conversationText) {
  const text = conversationText.toLowerCase();

  const keywords = [
    "electrician",
    "electrical",
    "socket",
    "sockets",
    "wiring",
    "rewire",
    "lighting",
    "light",
    "consumer unit",
    "fuse",
    "fault",
    "repair",
    "installation",
    "install",
    "plumbing",
    "boiler",
    "roof",
    "roofing",
    "garage",
    "car",
    "bathroom",
    "kitchen"
  ];

  const found = keywords.filter((keyword) =>
    text.includes(keyword)
  );

  if (!found.length) return null;

  return found.slice(0, 5).join(", ");
}

async function findExistingLead(lead) {
  if (!lead.phone && !lead.email) return null;

  const filters = [];

  if (lead.phone) {
    filters.push(`phone.eq.${encodeURIComponent(lead.phone)}`);
  }

  if (lead.email) {
    filters.push(`email.eq.${encodeURIComponent(lead.email)}`);
  }

  if (!filters.length) return null;

  const rows = await supabaseRequest(
    `leads?select=*&or=(${filters.join(",")})&limit=1`
  );

  return rows?.[0] || null;
}

async function saveLead(lead) {
  const existing = await findExistingLead(lead);

  const leadData = {
    name: lead.name || null,
    phone: lead.phone || null,
    email: lead.email || null,
    location: lead.location || null,
    job_type: lead.job_type || "General enquiry",
    description:
      lead.description ||
      "Customer enquiry captured by Business AI",
    urgency: lead.urgency || "Normal",
    qualified: true,
    status: existing?.status || "New",
    priority: lead.priority || "Normal",
    notes:
      lead.notes ||
      "Captured by Business AI AI receptionist",
    estimated_value: 0
  };

  if (existing?.id) {
    const updated = await supabaseRequest(
      `leads?id=eq.${encodeURIComponent(existing.id)}`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=representation"
        },
        body: JSON.stringify(leadData)
      }
    );

    return updated?.[0] || existing;
  }

  const created = await supabaseRequest("leads", {
    method: "POST",
    headers: {
      Prefer: "return=representation"
    },
    body: JSON.stringify(leadData)
  });

  return created?.[0] || created;
}

function extractOutputText(data) {
  if (
    typeof data?.output_text === "string" &&
    data.output_text.trim()
  ) {
    return data.output_text.trim();
  }

  const output = Array.isArray(data?.output)
    ? data.output
    : [];

  const parts = [];

  for (const item of output) {
    if (!Array.isArray(item?.content)) continue;

    for (const content of item.content) {
      if (
        typeof content?.text === "string" &&
        content.text.trim()
      ) {
        parts.push(content.text.trim());
      }
    }
  }

  return parts.join("\n").trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const body = req.body || {};

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    if (!message) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const history = cleanMessages(body.messages);

    const settings = await getBusinessSettings();

    const businessName =
      settings.business_name || "the business";

    const conversation = buildConversation(
      history,
      message
    );

    const conversationText = conversation
      .map(
        (item) =>
          `${item.role}: ${item.content}`
      )
      .join("\n");

    const knownDetails = {
      name: findNameInConversation(conversationText),
      phone: findPhoneInConversation(conversationText),
      email: findEmailInConversation(conversationText),
      location: findLocationInConversation(conversationText),
      job_type: findJobDetails(conversationText)
    };

    const systemPrompt = `
You are the AI customer assistant for ${businessName}.

Your job is to:
1. Have a natural conversation with the customer.
2. Collect enough information for a business lead.
3. Extract lead information from the ENTIRE conversation.

Remember every detail already provided anywhere in the conversation. These
details were deterministically found in the transcript: ${JSON.stringify(knownDetails)}.

Never ask for a job detail, area/location, phone number, email address, or
name when it is present in the conversation or in the known details above.
Use the existing value and ask only for genuinely missing information. Do not
ask the customer to repeat or confirm a detail already supplied.

A useful lead normally contains:
- customer name
- phone or email
- location
- job/service required
- description
- urgency

If the customer has provided a phone number or email, preserve it exactly.

If the customer has provided a genuine business enquiry, set qualified to true.

Do not invent information.

Your response must follow the supplied JSON schema.
`;

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
          instructions: systemPrompt,
          input: conversation,
          text: {
            format: {
              type: "json_schema",
              name: "business_enquiry",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  reply: {
                    type: "string"
                  },
                  lead: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      name: {
                        type: ["string", "null"]
                      },
                      phone: {
                        type: ["string", "null"]
                      },
                      email: {
                        type: ["string", "null"]
                      },
                      location: {
                        type: ["string", "null"]
                      },
                      job_type: {
                        type: ["string", "null"]
                      },
                      description: {
                        type: ["string", "null"]
                      },
                      urgency: {
                        type: ["string", "null"]
                      },
                      qualified: {
                        type: "boolean"
                      },
                      priority: {
                        type: "string"
                      },
                      notes: {
                        type: ["string", "null"]
                      }
                    },
                    required: [
                      "name",
                      "phone",
                      "email",
                      "location",
                      "job_type",
                      "description",
                      "urgency",
                      "qualified",
                      "priority",
                      "notes"
                    ]
                  }
                },
                required: [
                  "reply",
                  "lead"
                ]
              }
            }
          }
        })
      }
    );

    const responseText =
      await openAIResponse.text();

    let data;

    try {
      data = responseText
        ? JSON.parse(responseText)
        : null;
    } catch {
      data = null;
    }

    if (!openAIResponse.ok) {
      console.error(
        "OpenAI API error:",
        openAIResponse.status,
        data || responseText
      );

      throw new Error(
        `OpenAI request failed: ${openAIResponse.status}`
      );
    }

    const structuredText =
      extractOutputText(data);

    if (!structuredText) {
      throw new Error(
        "OpenAI returned an empty response"
      );
    }

    let result;

    try {
      result = JSON.parse(structuredText);
    } catch {
      throw new Error(
        "AI returned invalid structured data"
      );
    }

    const lead = result?.lead || {};

    /*
     * IMPORTANT:
     * We now supplement the AI extraction using
     * deterministic extraction from the conversation.
     */

    const detectedPhone =
      findPhoneInConversation(conversationText);

    const detectedEmail =
      findEmailInConversation(conversationText);

    const detectedName =
      findNameInConversation(conversationText);

    const detectedLocation =
      findLocationInConversation(conversationText);

    const detectedJob =
      findJobDetails(conversationText);

    const finalLead = {
      name:
        lead.name ||
        detectedName ||
        null,

      phone:
        normalisePhone(lead.phone) ||
        detectedPhone ||
        null,

      email:
        lead.email ||
        detectedEmail ||
        null,

      location:
        lead.location ||
        detectedLocation ||
        null,

      job_type:
        lead.job_type ||
        detectedJob ||
        null,

      description:
        lead.description ||
        null,

      urgency:
        lead.urgency ||
        null,

      qualified:
        true,

      priority:
        lead.priority ||
        "Normal",

      notes:
        lead.notes ||
        "Captured by Business AI AI receptionist"
    };

    const hasContact =
      Boolean(finalLead.phone) ||
      Boolean(finalLead.email);

    const hasJob =
      Boolean(finalLead.job_type) ||
      Boolean(finalLead.description);

    let leadCaptured = false;
    let savedLead = null;

    /*
     * If the customer has contact information and
     * a genuine job enquiry, SAVE THE LEAD.
     */

    if (hasContact && hasJob) {
      try {
        savedLead = await saveLead(finalLead);
        leadCaptured = Boolean(savedLead);

        console.log(
          "BUSINESS AI LEAD CAPTURED:",
          savedLead?.id || "unknown"
        );
      } catch (error) {
        console.error(
          "LEAD SAVE FAILED:",
          error?.message || error
        );
      }
    }

    return res.status(200).json({
      reply:
        typeof result.reply === "string"
          ? result.reply
          : "Thanks. I have your details.",
      leadCaptured,
      lead: savedLead
    });
  } catch (error) {
    console.error(
      "Enquiry API error:",
      error?.message || error
    );

    return res.status(500).json({
      error:
        "Sorry, I could not process that enquiry."
    });
  }
}
