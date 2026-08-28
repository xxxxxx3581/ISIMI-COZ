 // supabase/functions/ai-customer/index.ts
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

const CATEGORY_MAP: Record<string, string[]> = {
  klima: ["klima", "kombi", "soğutma", "ısıtma", "klima bakım", "klima montaj", "klima arıza"],
  elektrik: ["elektrik", "priz", "sigorta", "aydınlatma", "elektrik arıza", "kablo"],
  tesisat: ["tesisat", "su kaçağı", "musluk", "lavabo", "tuvalet", "boru", "tıkanıklık"],
  temizlik: ["temizlik", "ev temizliği", "ofis temizliği", "derin temizlik", "halı yıkama"],
  nakliye: ["nakliye", "taşıma", "ev taşıma", "eşya taşıma", "kamyon"],
  beyaz_esya: ["beyaz eşya", "çamaşır makinesi", "buzdolabı", "bulaşık makinesi", "fırın"],
  cilingir: ["çilingir", "kilit", "kapı açma", "anahtar"],
  oto: ["oto", "araba", "araç", "lastik", "aku", "oto elektrik"],
};

function detectCategory(text: string): { category_id: string; confidence: number } {
  const normalized = text.toLocaleLowerCase("tr-TR");
  let best = { category_id: "genel", confidence: 0.3 };

  for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
    let hits = 0;
    for (const kw of keywords) {
      if (normalized.includes(kw)) hits++;
    }
    if (hits > 0) {
      const conf = Math.min(0.95, 0.5 + hits * 0.15);
      if (conf > best.confidence) {
        best = { category_id: cat, confidence: conf };
      }
    }
  }
  return best;
}

function detectUrgency(text: string): string {
  const n = text.toLocaleLowerCase("tr-TR");
  if (/(acil|hemen|şimdi|bugün|en kısa|yardım)/.test(n)) return "Acil";
  if (/(yarın|ertesi gün)/.test(n)) return "Yarın";
  return "Uygun zamanda";
}

function detectDistrict(text: string): string | null {
  const districts = [
    "konak", "karşıyaka", "bornova", "buca", "çiğli", "gaziemir", "balçova",
    "narlıdere", "bayraklı", "karabağlar", "torbalı", "menemen", "ödemiş",
    "selçuk", "foça", "urla", "çeşme", "seferihisar", "dikili", "bergama",
    "alsancak", "güzelyalı", "hatay", "basmane", "kemeraltı",
  ];
  const n = text.toLocaleLowerCase("tr-TR");
  for (const d of districts) {
    if (n.includes(d)) return d.charAt(0).toUpperCase() + d.slice(1);
  }
  return null;
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

    const description = String(request.description || "").trim();
    if (description.length < 3) {
      await callTools("log_decision", {
        request_id: request_id,
        agent: "customer",
        decision_action: "analyze",
        input: { description: description },
        output: { error: "description too short" },
        status: "needs_human",
      });
      return json({
        ok: true,
        needs_clarification: true,
        message: "Lütfen ihtiyacınızı biraz daha detaylı anlatın.",
      });
    }

    const cat = detectCategory(description);
    const urgency = detectUrgency(description);
    const district = detectDistrict(description) || request.district || null;

    const patch: Record<string, unknown> = {
      urgency: urgency,
      is_urgent: urgency === "Acil",
    };
    if (cat.category_id !== "genel") {
      patch.category_id = cat.category_id;
    }
    if (district && !request.district) {
      patch.district = district;
    }

    await callTools("update_request", { request_id: request_id, patch: patch });

    await callTools("log_decision", {
      request_id: request_id,
      agent: "customer",
      decision_action: "analyze",
      input: { description: description },
      output: {
        category_id: cat.category_id,
        confidence: cat.confidence,
        urgency: urgency,
        district: district,
        patch: patch,
      },
      status: cat.confidence < 0.5 ? "needs_human" : "completed",
    });

    return json({
      ok: true,
      category_id: cat.category_id,
      confidence: cat.confidence,
      urgency: urgency,
      district: district,
      needs_clarification: cat.confidence < 0.5,
    });
  } catch (e) {
    console.error("ai-customer error:", e);
    return err(e instanceof Error ? e.message : "Internal error", 500);
  }
});
