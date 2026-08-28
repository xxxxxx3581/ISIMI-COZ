// supabase/functions/ai-orchestrator/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUUID(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400) {
  return json({ ok: false, error: message }, status);
}

function getEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v || !String(v).trim()) {
    throw new Error("Missing env: " + name);
  }
  return String(v).trim().replace(/\/$/, "");
}

function getServiceClient() {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: "Bearer " + serviceKey,
      },
    },
  });
}

async function callFunction(name: string, payload: Record<string, unknown>) {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const url = supabaseUrl + "/functions/v1/" + name;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + serviceKey,
      apikey: serviceKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(
      (data && data.error) || name + " failed: HTTP " + res.status
    );
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let request_id: string | null = null;
  let job_id: string | null = null;
  let sb: ReturnType<typeof getServiceClient> | null = null;

  try {
    sb = getServiceClient();

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return err("Invalid JSON body");

    request_id = body.request_id;
    if (!isUUID(request_id)) return err("request_id must be a valid UUID");

    const { data: existingJobs, error: findErr } = await sb
      .from("ai_jobs")
      .select("id, status, attempts")
      .eq("request_id", request_id)
      .eq("type", "process_request")
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (findErr) throw new Error("ai_jobs select failed: " + findErr.message);

    if (existingJobs && existingJobs.length > 0) {
      job_id = existingJobs[0].id;
      const prevAttempts = Number(existingJobs[0].attempts || 0);
      const { error: updErr } = await sb
        .from("ai_jobs")
        .update({
          status: "processing",
          attempts: prevAttempts + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job_id);
      if (updErr) throw new Error("ai_jobs update failed: " + updErr.message);
    } else {
      const { data: newJob, error: insErr } = await sb
        .from("ai_jobs")
        .insert({
          request_id,
          type: "process_request",
          status: "processing",
          attempts: 1,
        })
        .select("id")
        .single();
      if (insErr) throw new Error("ai_jobs insert failed: " + insErr.message);
      job_id = newJob.id;
    }

    const customerResult = await callFunction("ai-customer", { request_id });

    let matchingResult = null;
    if (customerResult.ok && !customerResult.needs_clarification) {
      matchingResult = await callFunction("ai-matching", { request_id });
    }

    await callFunction("ai-tools", {
      action: "log_decision",
      request_id,
      agent: "orchestrator",
      decision_action: "process_request",
      input: { request_id },
      output: {
        customer: {
          category_id: customerResult.category_id,
          confidence: customerResult.confidence,
          needs_clarification: customerResult.needs_clarification,
        },
        matching: matchingResult
          ? {
              matched: matchingResult.matched,
              top: matchingResult.matches
                ? matchingResult.matches.slice(0, 3)
                : [],
            }
          : null,
      },
      status: customerResult.needs_clarification ? "needs_human" : "completed",
    });

    if (job_id) {
      const { error: doneErr } = await sb
        .from("ai_jobs")
        .update({
          status: "done",
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job_id);
      if (doneErr) {
        throw new Error("ai_jobs done update failed: " + doneErr.message);
      }
    }

    return json({
      ok: true,
      request_id,
      customer: customerResult,
      matching: matchingResult,
    });
  } catch (e) {
    console.error("ai-orchestrator error:", e);
    const message = e instanceof Error ? e.message : "Internal error";

    if (job_id && sb) {
      try {
        await sb
          .from("ai_jobs")
          .update({
            status: "failed",
            last_error: message,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job_id);
      } catch (_) {}
    }

    if (request_id) {
      try {
        await callFunction("ai-tools", {
          action: "log_decision",
          request_id,
          agent: "orchestrator",
          decision_action: "process_request",
          input: { request_id },
          output: { error: message },
          status: "failed",
        });
      } catch (_) {}
    }

    return err(message, 500);
  }
});
