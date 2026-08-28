// supabase/functions/ai-tools/index.ts
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

function err(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return json(Object.assign({ ok: false, error: message }, extra), status);
}

function getEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v || !String(v).trim()) {
    throw new Error("Missing env: " + name);
  }
  return String(v).trim().replace(/\/$/, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: "Bearer " + serviceKey } },
    });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return err("Invalid JSON body");
    }

    const action = body.action;
    if (typeof action !== "string" || !action) {
      return err("Missing or invalid 'action'");
    }

    if (action === "get_request") {
      const request_id = body.request_id;
      if (!isUUID(request_id)) return err("request_id must be a valid UUID");

      const { data, error } = await sb
        .from("requests")
        .select("*")
        .eq("id", request_id)
        .maybeSingle();

      if (error) return err(error.message, 500);
      if (!data) return err("Request not found", 404);
      return json({ ok: true, data: data });
    }

    if (action === "update_request") {
      const request_id = body.request_id;
      const patch = body.patch;
      if (!isUUID(request_id)) return err("request_id must be a valid UUID");
      if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
        return err("patch must be a non-empty object");
      }

      const allowed = [
        "category_id",
        "district",
        "neighborhood",
        "urgency",
        "status",
        "is_urgent",
        "lat",
        "lng",
        "description",
      ];
      const clean: Record<string, unknown> = {};
      for (let i = 0; i < allowed.length; i++) {
        const k = allowed[i];
        if (k in patch) clean[k] = patch[k];
      }
      if (Object.keys(clean).length === 0) {
        return err("No allowed fields in patch");
      }

      const { data, error } = await sb
        .from("requests")
        .update(clean)
        .eq("id", request_id)
        .select("*")
        .maybeSingle();

      if (error) return err(error.message, 500);
      if (!data) return err("Request not found", 404);

      await sb.from("ai_decisions").insert({
        request_id: request_id,
        agent: "tools",
        action: "update_request",
        input: { patch: clean },
        output: { updated: true },
        status: "completed",
      });

      return json({ ok: true, data: data });
    }

    if (action === "find_providers") {
      const category_id = body.category_id;
      const district = body.district;
      const city = body.city;
      const limit = Math.min(Number(body.limit) || 20, 50);

      let q = sb
        .from("providers")
        .select(
          "id, name, phone, district, city, services, active, lat, lng, description"
        )
        .eq("active", true)
        .limit(limit);

      if (district && typeof district === "string") {
        q = q.ilike("district", "%" + district + "%");
      }
      if (city && typeof city === "string") {
        q = q.ilike("city", "%" + city + "%");
      }

      const { data, error } = await q;
      if (error) return err(error.message, 500);

      let providers = data || [];

      if (category_id && typeof category_id === "string") {
        providers = providers.filter(function (p: any) {
          const services = p.services;
          if (!services) return false;
          if (Array.isArray(services)) {
            return services.some(function (s: unknown) {
              if (String(s).toLowerCase() === category_id.toLowerCase()) {
                return true;
              }
              if (typeof s === "object" && s && "id" in (s as any)) {
                return String((s as any).id) === category_id;
              }
              return false;
            });
          }
          return JSON.stringify(services)
            .toLowerCase()
            .includes(category_id.toLowerCase());
        });
      }

      return json({ ok: true, data: providers });
    }

    if (action === "create_match") {
      const request_id = body.request_id;
      const provider_id = body.provider_id;
      const score = body.score;
      const reason = body.reason;
      const rank = body.rank;

      if (!isUUID(request_id)) return err("request_id must be a valid UUID");
      if (!isUUID(provider_id)) return err("provider_id must be a valid UUID");
      if (typeof score !== "number" || score < 0 || score > 100) {
        return err("score must be a number between 0 and 100");
      }
      if (typeof rank !== "number" || rank < 1) {
        return err("rank must be a positive integer");
      }

      const { data, error } = await sb
        .from("ai_matches")
        .upsert(
          {
            request_id: request_id,
            provider_id: provider_id,
            score: score,
            reason: reason || null,
            rank: rank,
          },
          { onConflict: "request_id,provider_id" }
        )
        .select("*")
        .maybeSingle();

      if (error) return err(error.message, 500);

      await sb.from("ai_decisions").insert({
        request_id: request_id,
        agent: "tools",
        action: "create_match",
        input: {
          provider_id: provider_id,
          score: score,
          rank: rank,
          reason: reason,
        },
        output: { match_id: data ? data.id : null },
        status: "completed",
      });

      return json({ ok: true, data: data });
    }

    if (action === "log_decision") {
      const request_id = body.request_id;
      const agent = body.agent;
      const decisionAction = body.decision_action || body.log_action;
      const input = body.input;
      const output = body.output;
      const status = body.status || "completed";

      if (request_id && !isUUID(request_id)) {
        return err("request_id must be a valid UUID");
      }
      if (typeof agent !== "string" || !agent) return err("agent is required");
      if (typeof decisionAction !== "string" || !decisionAction) {
        return err("decision_action is required");
      }

      const allowedAgents = [
        "orchestrator",
        "customer",
        "matching",
        "operations",
        "tools",
      ];
      if (allowedAgents.indexOf(agent) === -1) {
        return err("agent must be one of: " + allowedAgents.join(", "));
      }
      if (["completed", "needs_human", "failed"].indexOf(status) === -1) {
        return err("status must be completed | needs_human | failed");
      }

      const { data, error } = await sb
        .from("ai_decisions")
        .insert({
          request_id: request_id || null,
          agent: agent,
          action: decisionAction,
          input: input != null ? input : {},
          output: output != null ? output : {},
          status: status,
        })
        .select("*")
        .maybeSingle();

      if (error) return err(error.message, 500);
      return json({ ok: true, data: data });
    }

    return err("Unknown action: " + action, 400);
  } catch (e) {
    console.error("ai-tools error:", e);
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
});
