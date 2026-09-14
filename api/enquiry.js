const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const MAX_HISTORY_MESSAGES = 20;
const SUPABASE_TIMEOUT_MS = 8000;
const SUPABASE_RETRIES = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function supabaseUrl(path) {
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL is not configured");
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  return `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${path}`;
}

async function supabaseRequest(path, options = {}) {
  let lastError;

  for (let attempt = 1; attempt <= SUPABASE_RETRIES; attempt++) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, SUPABASE_TIMEOUT_MS);

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

      if (response.ok) {
        return data;
      }

      const errorMessage =
        typeof data === "string"
          ? data
          : data?.message ||
            data?.error ||
            `Supabase returned ${response.status}`;

      if (response.status >= 500 && attempt < SUPABASE_RETRIES) {
        await sleep(400 * attempt);
        continue;
      }

      throw new Error(
        `Supabase ${response.status}: ${errorMessage}`
      );
    } catch (error) {
      clearTimeout(timeout);

      lastError =
        error?.name === "AbortError"
          ? new Error("Supabase request timed out")
          : error;

      if (attempt < SUPABASE_RETRIES) {
        await sleep(400 * attempt);
        continue;
      }
    }
  }

  throw lastError || new Error("Supabase request failed");
}

async function getBusinessSettings() {
  const rows = await supabaseRequest(
    "business_settings?select=business_name&limit=1"
  );

  return rows?.[0] || {};
}

function cleanMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter(
      (message) =>
        message &&
        (message.role === "user" ||
          message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim()
    )
    .slice(-MAX_HISTORY_MESSAGES)
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
      content: [
        {
          type:
            item.role === "user"
              ? "input_text"
              : "output_text",
          text: item.content
        }
      ]
    });
  }

  conversation.push({
    role: "user",
    content: [
      {
        type: "input_text",
        text: message
      }
    ]
  });

  return conversation;
}

async function findExistingLead(lead) {
  if (!lead.phone && !lead.email) {
    return null;
  }

  const filters = [];

  if (lead.phone) {
    filters.push(`phone.eq.${encodeURIComponent(lead.phone)}`);
  }

  if (lead.email) {
    filters.push(`email.eq.${encodeURIComponent(lead.email)}`);
  }

  if (!filters.length) {
    return null;
  }

  const query = filters.join(",");

  const rows = await supabaseRequest(
    `leads?select=*&or=(${query})&limit=1`
  );

  return rows?.[0] || null;
}

async function saveOrUpdateLead(lead) {
  const existing = await findExistingLead(lead);

  const leadData = {
    name: lead.name || null,
    phone: lead.phone || null,
    email: lead.email || null,
    location: lead.location || null,
    job_type: lead.job_type || null,
    description: lead.description || null,
    urgency: lead.urgency || null,
    qualified: Boolean(lead.qualified),
    status: "New",
    notes: lead.notes || "Captured by AI enquiry assistant",
    priority: lead.priority || "Normal",
    estimated_value: 0
  };

  if (existing?.id) {
    return supabaseRequest(
      `leads?id=eq.${encodeURIComponent(existing.id)}`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=representation"
        },
        body: JSON.stringify(leadData)
      }
    );
  }

  return supabaseRequest("leads", {
    method: "POST",
    headers: {
      Prefer: "return=representation"
    },
    body: JSON.stringify(leadData)
  });
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
      throw new Error(
        "OPENAI_API_KEY is not configured"
      );
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

    let settings = {};

    try {
      settings = await getBusinessSettings();
    } catch (error) {
      console.error(
        "Business settings unavailable:",
        error?.message || error
      );
    }

    const businessName =
      settings.business_name || "the business";

    const systemPrompt = `
You are the AI customer assistant for ${businessName}.

You have TWO jobs:

1. Have a natural conversation with the customer.
2. Extract useful lead information from the entire conversation.

IMPORTANT CONVERSATION RULES:
- Remember everything the customer has already told you.
- Never ask for information again if it has already been provided.
- Ask only for information that is genuinely missing.
- Be concise, natural and helpful.
- Do not pretend to be human.
- Never invent prices, availability, policies or appointments.
- If you do not know something, say that the business team can confirm it.

LEAD INFORMATION:
Extract information from the whole conversation, not just the latest message.

Possible lead fields:
- name
- phone
- email
- location
- job_type
- description
- urgency
- qualified
- priority
- notes

Only put information into a field when it is actually supported by the conversation.

A lead should be considered qualified when the customer has a genuine business enquiry and enough information exists for the business to understand what they need.

IMPORTANT:
If the customer has supplied a phone number or email address, preserve it accurately.

Your response MUST be JSON matching the supplied schema.
The "reply" field is the message that should be shown to the customer.
The "lead" object contains the information extracted from the conversation.
`;

    const conversation = buildConversation(
      history,
      message
    );

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

    const openAIText =
      await openAIResponse.text();

    let openAIData;

    try {
      openAIData = openAIText
        ? JSON.parse(openAIText)
        : null;
    } catch {
      openAIData = null;
    }

    if (!openAIResponse.ok) {
      console.error(
        "OpenAI API error:",
        openAIResponse.status,
        openAIData || openAIText
      );

      throw new Error(
        `OpenAI request failed with status ${openAIResponse.status}`
      );
    }

    const structuredText =
      extractOutputText(openAIData);

    if (!structuredText) {
      throw new Error(
        "OpenAI returned an empty response"
      );
    }

    let result;

    try {
      result = JSON.parse(structuredText);
    } catch (error) {
      console.error(
        "Failed to parse structured AI response:",
        structuredText
      );

      throw new Error(
        "AI returned invalid structured data"
      );
    }

    const reply =
      typeof result?.reply === "string"
        ? result.reply.trim()
        : "";

    const lead = result?.lead || {};

    if (!reply) {
      throw new Error(
        "AI response did not contain a reply"
      );
    }

    /*
     * Only create/update a real lead once the customer
     * has supplied contact information.
     *
     * This prevents a brand-new lead being created
     * for every single chat message.
     */
    const hasContact =
      Boolean(lead.phone) ||
      Boolean(lead.email);

    const hasUsefulDetails =
      Boolean(lead.description) ||
      Boolean(lead.job_type);

    let savedLead = false;

    if (hasContact && hasUsefulDetails) {
      try {
        await saveOrUpdateLead(lead);
        savedLead = true;

        console.log(
          "AI lead created/updated successfully"
        );
      } catch (error) {
        console.error(
          "Lead save failed:",
          error?.message || error
        );
      }
    }

    return res.status(200).json({
      reply,
      leadCaptured: savedLead
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
