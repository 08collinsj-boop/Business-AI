const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY;


function supabaseUrl(path) {

  if (!SUPABASE_URL) {
    throw new Error(
      "SUPABASE_URL is not configured"
    );
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured"
    );
  }

  return `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${path}`;
}


async function getBusinessSettings() {

  const defaults = {
    business_name: "My Business",
    business_type: "business",
    phone: "",
    email: "",
    address: "",
    opening_hours: "",
    services: "",
    ai_instructions: "",
    urgent_jobs_enabled: true
  };

  try {

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => controller.abort(),
        2000
      );

    const response =
      await fetch(
        supabaseUrl(
          "business_settings?select=*&order=id.asc&limit=1"
        ),
        {
          headers: {
            apikey:
              SUPABASE_SERVICE_ROLE_KEY,

            Authorization:
              `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },

          signal:
            controller.signal
        }
      );

    clearTimeout(timeout);

    if (!response.ok) {
      return defaults;
    }

    const data =
      await response.json();

    if (
      Array.isArray(data) &&
      data.length > 0
    ) {
      return {
        ...defaults,
        ...data[0]
      };
    }

    return defaults;

  } catch (error) {

    console.error(
      "Settings unavailable:",
      error.message
    );

    return defaults;
  }
}


async function saveLead(lead) {

  const response =
    await fetch(
      supabaseUrl("leads"),
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          apikey:
            SUPABASE_SERVICE_ROLE_KEY,

          Authorization:
            `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,

          Prefer:
            "return=representation"
        },

        body:
          JSON.stringify({
            name:
              lead.name || "",

            phone:
              lead.phone || "",

            email:
              lead.email || "",

            location:
              lead.location || "",

            job_type:
              lead.job_type || "",

            description:
              lead.description || "",

            urgency:
              lead.urgency || "",

            qualified:
              true
          })
      }
    );


  const text =
    await response.text();


  if (!response.ok) {

    throw new Error(
      `Could not save lead: ${text}`
    );

  }


  let saved;

  try {

    saved =
      JSON.parse(text);

  } catch {

    return null;

  }


  const createdLead =
    Array.isArray(saved)
      ? saved[0]
      : saved;


  /*
    IMPORTANT:

    History must NEVER be allowed
    to break the lead creation.

    We give the history request
    a short timeout.
  */

  if (
    createdLead &&
    createdLead.id
  ) {

    try {

      const controller =
        new AbortController();

      const timeout =
        setTimeout(
          () => controller.abort(),
          1000
        );


      await fetch(
        supabaseUrl(
          "lead_history"
        ),
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            apikey:
              SUPABASE_SERVICE_ROLE_KEY,

            Authorization:
              `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,

            Prefer:
              "return=minimal"
          },

          body:
            JSON.stringify({

              lead_id:
                createdLead.id,

              action:
                "Lead created",

              old_value:
                "",

              new_value:
                "New lead captured by AI receptionist"

            }),

          signal:
            controller.signal
        }
      );


      clearTimeout(timeout);

    } catch (historyError) {

      console.error(
        "Lead history skipped:",
        historyError.message
      );

    }

  }


  return saved;

}


export default async function handler(
  req,
  res
) {

  try {

    if (req.method !== "POST") {

      return res.status(405).json({
        error:
          "Method not allowed"
      });

    }


    if (!OPENAI_API_KEY) {

      return res.status(500).json({
        error:
          "OPENAI_API_KEY is not configured"
      });

    }


    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};


    const message =
      String(
        body.message || ""
      ).trim();


    if (!message) {

      return res.status(400).json({
        error:
          "Message is required"
      });

    }


    const settings =
      await getBusinessSettings();


    const businessName =
      settings.business_name ||
      "My Business";


    const businessType =
      settings.business_type ||
      "business";


    const phone =
      settings.phone || "";


    const email =
      settings.email || "";


    const address =
      settings.address || "";


    const openingHours =
      settings.opening_hours || "";


    const services =
      settings.services || "";


    const aiInstructions =
      settings.ai_instructions || "";


    const urgentJobsEnabled =
      settings.urgent_jobs_enabled !== false;


    const systemPrompt = `

You are the AI receptionist for ${businessName}.

BUSINESS INFORMATION

Business name:
${businessName}

Business type:
${businessType}

Phone:
${phone || "Not provided"}

Email:
${email || "Not provided"}

Address:
${address || "Not provided"}

Opening hours:
${openingHours || "Not provided"}

Services:
${services || "Not provided"}

Urgent jobs enabled:
${urgentJobsEnabled ? "Yes" : "No"}


CUSTOM BUSINESS INSTRUCTIONS

${aiInstructions || "No additional instructions have been provided."}


YOUR ROLE

You are the front desk assistant for this business.

Your job is to:

1. Answer customer questions clearly and professionally.
2. Use the business information above when answering.
3. Help customers understand the services offered.
4. Collect useful information about potential jobs.
5. Identify whether a customer appears ready to become a genuine lead.
6. Never invent prices, services, opening hours, policies or other business information.
7. If information is unavailable, say that the business will need to confirm it.
8. Keep replies friendly, concise and natural.
9. Do not claim to be a human.
10. Do not promise an appointment unless an actual booking system confirms one.


LEAD QUALIFICATION

When appropriate, collect:

- Customer name
- Phone number
- Email address
- Location
- Job type
- Description of the work
- Urgency


URGENT JOBS

${
  urgentJobsEnabled

    ? `
Urgent jobs are accepted by the business.

If a customer describes an urgent problem, identify the urgency clearly and encourage them to provide their contact details so the business can respond.
`

    : `
The business has not enabled urgent-job handling.

Do not tell customers that urgent jobs are accepted.
`
}


IMPORTANT LEAD RULE

If the customer has provided enough information to become a genuine enquiry, set:

"qualified": true

and save the information in the lead object.

If more information is needed, set:

"qualified": false.


RESPONSE FORMAT

Always return valid JSON with exactly these fields:

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

Do not include markdown outside the JSON.

`;


    const openaiResponse =
      await fetch(
        "https://api.openai.com/v1/responses",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${OPENAI_API_KEY}`
          },

          body:
            JSON.stringify({

              model:
                "gpt-5.6-luna",

              input: [

                {
                  role:
                    "system",

                  content:
                    systemPrompt
                },

                {
                  role:
                    "user",

                  content:
                    message
                }

              ]

            })
        }
      );


    const openaiText =
      await openaiResponse.text();


    if (!openaiResponse.ok) {

      throw new Error(
        `OpenAI error: ${openaiText}`
      );

    }


    let openaiData;

    try {

      openaiData =
        JSON.parse(
          openaiText
        );

    } catch {

      throw new Error(
        "OpenAI returned invalid JSON"
      );

    }


    let outputText = "";


    if (
      Array.isArray(
        openaiData.output
      )
    ) {

      for (
        const item
        of openaiData.output
      ) {

        if (
          item.type === "message" &&
          Array.isArray(
            item.content
          )
        ) {

          for (
            const content
            of item.content
          ) {

            if (
              content.type ===
              "output_text"
            ) {

              outputText +=
                content.text || "";

            }

          }

        }

      }

    }


    if (!outputText) {

      throw new Error(
        "No response returned by AI"
      );

    }


    let result;


    try {

      result =
        JSON.parse(
          outputText
        );

    } catch {

      const cleaned =
        outputText
          .replace(
            /^```json\s*/i,
            ""
          )
          .replace(
            /^```\s*/i,
            ""
          )
          .replace(
            /\s*```$/i,
            ""
          )
          .trim();


      try {

        result =
          JSON.parse(
            cleaned
          );

      } catch {

        throw new Error(
          "AI returned invalid response format"
        );

      }

    }


    const lead =
      result.lead || {};


    let savedLead =
      null;


    if (
      result.qualified === true
    ) {

      savedLead =
        await saveLead({

          name:
            lead.name,

          phone:
            lead.phone,

          email:
            lead.email,

          location:
            lead.location,

          job_type:
            lead.job_type,

          description:
            lead.description,

          urgency:
            lead.urgency

        });

    }


    return res.status(200).json({

      reply:
        result.reply ||
        "Thanks for your message. We'll get back to you shortly.",

      qualified:
        result.qualified === true,

      lead:
        result.lead || null,

      saved:
        Boolean(savedLead)

    });


  } catch (error) {

    console.error(
      "Enquiry API error:",
      error
    );


    return res.status(500).json({

      error:
        error.message ||
        "Could not process enquiry"

    });

  }

}
