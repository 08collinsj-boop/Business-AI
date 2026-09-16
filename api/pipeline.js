import {
  requireBusinessMember,
  sendAuthError
} from "../lib/auth.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function supabaseUrl(path) {
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL is not configured");
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured"
    );
  }

  return `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${path}`;
}

async function supabaseRequest(path) {
  const response = await fetch(
    supabaseUrl(path),
    {
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization:
          `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      typeof data === "string"
        ? data
        : data?.message ||
          data?.error ||
          `Supabase error ${response.status}`
    );
  }

  return data;
}


export default async function handler(req, res) {

  try {

    if (req.method !== "GET") {
      return res.status(405).json({
        error: "Method not allowed"
      });
    }

    let auth;
    try {
      auth = await requireBusinessMember(req);
    } catch (error) {
      return sendAuthError(res, error);
    }

    const tenantFilter = auth.enforced
      ? `&business_id=eq.${encodeURIComponent(String(auth.businessId))}`
      : "";

    const leads =
      await supabaseRequest(
        `leads?select=id,status,estimated_value,priority,follow_up_date,created_at${tenantFilter}`
      );


    const all =
      Array.isArray(leads)
        ? leads
        : [];


    const newLeads =
      all.filter(
        lead => lead.status === "New"
      );

    const contactedLeads =
      all.filter(
        lead => lead.status === "Contacted"
      );

    const convertedLeads =
      all.filter(
        lead => lead.status === "Converted"
      );


    function totalValue(list) {

      return list.reduce(
        (total, lead) =>
          total +
          Number(
            lead.estimated_value || 0
          ),
        0
      );

    }


    const pipelineValue =
      totalValue(
        all.filter(
          lead =>
            lead.status !== "Converted"
        )
      );


    const convertedValue =
      totalValue(
        convertedLeads
      );


    const totalValueAll =
      totalValue(all);


    const conversionRate =
      all.length > 0
        ? (
            convertedLeads.length /
            all.length
          ) * 100
        : 0;


    const highPriority =
      all.filter(
        lead =>
          lead.priority === "High" &&
          lead.status !== "Converted"
      ).length;


    const today =
      new Date()
        .toISOString()
        .slice(0, 10);


    const followUpsToday =
      all.filter(
        lead =>
          lead.status !== "Converted" &&
          lead.follow_up_date === today
      ).length;


    const overdueFollowUps =
      all.filter(
        lead =>
          lead.status !== "Converted" &&
          lead.follow_up_date &&
          lead.follow_up_date < today
      ).length;


    return res.status(200).json({

      total: all.length,

      stages: {

        new: {
          count: newLeads.length,
          value: totalValue(newLeads)
        },

        contacted: {
          count: contactedLeads.length,
          value: totalValue(contactedLeads)
        },

        converted: {
          count: convertedLeads.length,
          value: convertedValue
        }

      },

      pipeline_value: pipelineValue,

      converted_value: convertedValue,

      total_value: totalValueAll,

      conversion_rate:
        Number(
          conversionRate.toFixed(1)
        ),

      high_priority:
        highPriority,

      follow_ups_today:
        followUpsToday,

      overdue_follow_ups:
        overdueFollowUps

    });


  } catch (error) {

    console.error("Pipeline API error");

    return res.status(500).json({

      error: "Could not load pipeline"

    });

  }

}
