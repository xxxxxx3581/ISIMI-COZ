// supabase/functions/ai-matching/index.ts
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

async function callTools(action: string, payload: Record<string, unknown>) {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const url = supabaseUrl + "/functions/v1/ai-tools";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + serviceKey,
      apikey: serviceKey,
    },
    body: JSON.stringify(Object.assign({ action: action }, payload)),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error((data && data.error) || "ai-tools failed: " + res.status);
  }
  return data;
}

function scoreProvider(
  provider: any,
  category_id: string | null,
  district: string | null
): { score: number; reason: string } {
  let score = 40;
  const reasons: string[] = [];

  if (provider.active) {
    score += 10;
    reasons.push("aktif");
  }

  if (category_id) {
    const services = provider.services;
    let matched = false;
    if (Array.isArray(services)) {
      matched = services.some(function (s: unknown) {
        if (String(s).toLowerCase() === category_id.toLowerCase()) return true;
        if (typeof s === "object" && s) {
          const o = s as any;
          return (
            String(o.id || o.name || "").toLowerCase() ===
            category_id.toLowerCase()
          );
        }
        return false;
      });
    } else if (services) {
      matched = JSON.stringify(services)
        .toLowerCase()
        .includes(category_id.toLowerCase());
    }
    if (matched) {
      score += 30;
      reasons.push("kategori uyumlu");
    }
  }

  if (district && provider.district) {
    const pd = String(provider.district).toLocaleLowerCase("tr-TR");
    const rd = district.toLocaleLowerCase("tr-TR");
    if (pd === rd || pd.includes(rd) || rd.includes(pd)) {
      score += 20;
      reasons.push("aynı ilçe");
    }
  }

  score = Math.min(100, Math.max(0, score));
  return {
    score: score,
    reason: reasons.length ? reasons.join(", ") : "temel eşleşme",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return err("Invalid JSON body");

    const request_id = body.request_id;
    if (!isUUID(request_id)) return err("request_id must be a valid UUID");

    const reqResult = await callTools("get_request", { request_id: request_id });
    const request = reqResult.data;
    if (!request) return err("Request not found", 404);

    const category_id = request.category_id || null;
    const district = request.district || null;

    const provResult = await callTools("find_providers", {
      category_id: category_id,
      district: district,
      limit: 30,
    });
    const providers = provResult.data || [];

    if (providers.length === 0) {
      await callTools("log_decision", {
        request_id: request_id,
        agent: "matching",
        decision_action: "match",
        input: { category_id: category_id, district: district },
        output: { matched: 0 },
        status: "needs_human",
      });
      return json({ ok: true, matched: 0, matches: [] });
    }

    const scored = providers
      .map(function (p: any) {
        const s = scoreProvider(p, category_id, district);
        return { provider: p, score: s.score, reason: s.reason };
      })
      .sort(function (a: any, b: any) {
        return b.score - a.score;
      })
      .slice(0, 5);

    const matches = [];
    for (let i = 0; i < scored.length; i++) {
      const item = scored[i];
      const result = await callTools("create_match", {
        request_id: request_id,
        provider_id: item.provider.id,
        score: item.score,
        reason: item.reason,
        rank: i + 1,
      });
      matches.push({
        provider_id: item.provider.id,
        name: item.provider.name,
        score: item.score,
        reason: item.reason,
        rank: i + 1,
        match_id: result.data ? result.data.id : null,
      });
    }

    await callTools("log_decision", {
      request_id: request_id,
      agent: "matching",
      decision_action: "match",
      input: {
        category_id: category_id,
        district: district,
        candidate_count: providers.length,
      },
      output: {
        matched: matches.length,
        top_scores: matches.map(function (m) {
          return m.score;
        }),
      },
      status: matches.length > 0 ? "completed" : "needs_human",
    });

    return json({
      ok: true,
      matched: matches.length,
      matches: matches,
    });
  } catch (e) {
    console.error("ai-matching error:", e);
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
});
