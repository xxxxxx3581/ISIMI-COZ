// Özüne Dön · iyzico Pazaryeri (SANDBOX) sunucusu — iş mantığı (Deno ve Node ile test edilebilir; Deno'ya özel API yok)
// -----------------------------------------------------------------------------
// DURUM: yalnız dosya; DEPLOY EDİLMEDİ. Dağıtım (kullanıcı onayıyla): supabase functions deploy oz-iyzico --no-verify-jwt
// (iyzico geri çağrısı JWT taşımaz; her uç kendi kimlik doğrulamasını yapar.)
//
// Uçlar (POST ?action=…):
//   init         → oturumlu alıcı; body {order_ids:[uuid]} — tutar ve kalemler SUNUCUDA oz_iyz_prepare ile veritabanından kurulur
//   callback     → iyzico tarayıcı POST'u (form: token); sonuç iyzico'ya sunucudan sorulur, oz_iyz_complete idempotenttir
//   sync_seller  → yalnız yönetici; body {seller_id} — onaylı satıcıyı alt üye açar/günceller (esnaf/çiftçi: manual_review)
//   approve      → yalnız yönetici; body {kind:'item'|'ship', id, op:'approve'|'disapprove'|'refund'}
//
// Yöntem: resmi Node SDK (iyzipay) yerine imzalı HTTP (IYZWSv2). Gerekçe: SDK Node'a özgü modüller (crypto, http) ister ve Deno'da
// uyumluluk katmanı gerektirir; imzalı HTTP Web Crypto + fetch ile bağımlılıksız çalışır ve Yemek tarafındaki canlı pf-payment
// fonksiyonuyla aynı (kanıtlanmış) desendir.
//
// Ortam değişkenleri (Supabase → Edge Functions → Secrets; DEĞERLER BURADA YOK, koda/loga yazılmaz):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY   (Supabase sağlar)
//   IYZICO_SANDBOX_API_KEY, IYZICO_SANDBOX_SECRET_KEY            ("sandbox-" ile başlamalı; pf-payment ile ortak)
//   IYZICO_BUYER_IDENTITY_NUMBER                                  (alıcı kimlik no; TODO: alıcıdan alınacak mı iyzico'ya soruluyor)
//   OZ_SITE_URL (yoksa PF_SITE_URL)                               ödeme dönüş sayfası
//   OZ_IYZICO_SUBMERCHANT_REQUIRED (isteğe bağlı JSON)           alt üye türüne göre zorunlu alanlar (teyitsiz → yapılandırılabilir)
//   OZ_IYZICO_REQUIRE_SIGNATURE ("true" ise yanıt imzası yoksa da reddedilir)
// Canlı iyzico (provider 'iyzico') bu sürümde KAPALIDIR; yalnız 'iyzico_sandbox' çalışır.
// -----------------------------------------------------------------------------

export type J = Record<string, any>;
export interface Deps {
  env: (k: string) => string;
  fetch: (url: string, init?: J) => Promise<any>;
  log: (msg: string, meta?: J) => void;
}

export const IYZICO_SANDBOX = "https://sandbox-api.iyzipay.com";
export const PATHS = {
  cfInit: "/payment/iyzipos/checkoutform/initialize/auth/ecom",
  cfDetail: "/payment/iyzipos/checkoutform/auth/ecom/detail",
  approve: "/payment/iyzipos/item/approve",
  disapprove: "/payment/iyzipos/item/disapprove",
  refund: "/payment/refund", // TODO teyit: pazaryeri kırılım iadesi (paymentTransactionId ile) bu uç mu
  updateItem: "/payment/item", // PUT: hakediş güncelleme (paymentTransactionId, subMerchantKey, subMerchantPrice) — bu sürümde kullanılmıyor
  subMerchant: "/onboarding/submerchant", // POST oluştur, PUT güncelle
};
const TIMEOUT_MS = 15000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------- tutar
export function kurusToPrice(k: number): string {
  const n = Math.round(Number(k));
  if (!Number.isFinite(n) || n <= 0) throw new Error("amount");
  return (n / 100).toFixed(2);
}
export function priceToKurus(p: unknown): number {
  const n = Number(p);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

// ---------------------------------------------------------------- imza (IYZWSv2)
const enc = new TextEncoder();
async function hmacHex(key: string, data: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const b = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}
function b64(s: string): string {
  let o = "";
  for (const x of enc.encode(s)) o += String.fromCharCode(x);
  return btoa(o);
}
export async function iyzicoAuthHeader(apiKey: string, secret: string, path: string, payload: string, rnd: string): Promise<string> {
  const sig = await hmacHex(secret, rnd + path + payload);
  return "IYZWSv2 " + b64("apiKey:" + apiKey + "&randomKey:" + rnd + "&signature:" + sig);
}
export function safeEqual(a: string, b: string): boolean {
  const ea = enc.encode(a || ""), eb = enc.encode(b || "");
  if (!a || !b || ea.length !== eb.length) return false;
  let r = 0;
  for (let i = 0; i < ea.length; i++) r |= ea[i] ^ eb[i];
  return r === 0;
}
// Yanıt imzası (Checkout Form sonucu). TODO teyit: alan sırası iyzico belgesine göre
// [paymentStatus, paymentId, currency, basketId, conversationId, paidPrice, price, token]; imza yoksa null döner.
export async function responseSignatureOk(res: J, secret: string): Promise<boolean | null> {
  if (!res || typeof res.signature !== "string" || !res.signature) return null;
  const f = [res.paymentStatus, res.paymentId, res.currency, res.basketId, res.conversationId, res.paidPrice, res.price, res.token]
    .map((x) => (x === undefined || x === null ? "" : String(x)));
  return safeEqual((await hmacHex(secret, f.join(":"))).toLowerCase(), String(res.signature).toLowerCase());
}

export function sandboxKeys(env: (k: string) => string): { apiKey: string; secret: string } {
  const apiKey = env("IYZICO_SANDBOX_API_KEY"), secret = env("IYZICO_SANDBOX_SECRET_KEY");
  if (!apiKey || !secret) throw new Error("iyzico test anahtarları tanımlı değil");
  if (!apiKey.startsWith("sandbox-") || !secret.startsWith("sandbox-")) throw new Error("Test modunda yalnız sandbox anahtarı kullanılabilir");
  return { apiKey, secret };
}

// ---------------------------------------------------------------- sepet (yalnız sunucudan gelen hazırlıkla)
export function validateBasket(prep: J): void {
  const items = Array.isArray(prep && prep.items) ? prep.items : [];
  if (!items.length) throw new Error("Sepet boş");
  let sum = 0;
  for (const it of items) {
    const p = Number(it.price_kurus), s = Number(it.sub_merchant_price_kurus);
    if (!Number.isInteger(p) || p <= 0) throw new Error("Kalem fiyatı sıfır veya geçersiz");
    if (!Number.isInteger(s) || s <= 0 || s > p) throw new Error("Satıcı payı geçersiz");
    if (!it.sub_merchant_key) throw new Error("Satıcının alt üye anahtarı yok");
    if (!it.id) throw new Error("Kalem kimliği yok");
    sum += p;
  }
  if (sum !== Number(prep.amount_kurus)) throw new Error("Kalem toplamı ödeme tutarına eşit değil");
}
export function splitName(full: string): { name: string; surname: string } {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { name: "Musteri", surname: "Musteri" };
  if (parts.length === 1) return { name: parts[0], surname: parts[0] };
  return { name: parts.slice(0, -1).join(" "), surname: parts[parts.length - 1] };
}
export function normalizeGsm(p: unknown): string {
  const d = String(p || "").replace(/\D/g, "");
  if (d.startsWith("90") && d.length === 12) return "+" + d;
  if (d.startsWith("0") && d.length === 11) return "+9" + d;
  if (d.length === 10) return "+90" + d;
  return d ? "+" + d : "";
}
export function buildCheckoutRequest(prep: J, o: { ip: string; callbackUrl: string; identityNumber: string }): J {
  validateBasket(prep);
  const price = kurusToPrice(prep.amount_kurus);
  const b = prep.buyer || {}, a = prep.address || {};
  const nm = splitName(b.name || a.recipient || "");
  const addr = String(a.line || "Belirtilmedi").slice(0, 400);
  const city = String(a.city || "Istanbul").slice(0, 50);
  const contact = (nm.name + " " + nm.surname).trim();
  return {
    locale: "tr",
    conversationId: String(prep.conversation_id),
    price,
    paidPrice: price,
    currency: "TRY",
    basketId: String(prep.payment_id),
    paymentGroup: "PRODUCT",
    callbackUrl: o.callbackUrl,
    enabledInstallments: [1],
    buyer: {
      id: String(b.id), name: nm.name, surname: nm.surname, gsmNumber: normalizeGsm(b.phone), email: String(b.email || ""),
      identityNumber: o.identityNumber, registrationAddress: addr, ip: o.ip, city, country: "Turkey", zipCode: a.postal_code || undefined,
    },
    shippingAddress: { contactName: contact, city, country: "Turkey", address: addr, zipCode: a.postal_code || undefined },
    billingAddress: { contactName: contact, city, country: "Turkey", address: addr, zipCode: a.postal_code || undefined },
    basketItems: prep.items.map((it: J) => ({
      id: String(it.id), name: String(it.name || "Ürün").slice(0, 100), category1: it.kind === "ship" ? "Kargo" : "Gıda",
      itemType: "PHYSICAL", price: kurusToPrice(it.price_kurus),
      subMerchantKey: String(it.sub_merchant_key), subMerchantPrice: kurusToPrice(it.sub_merchant_price_kurus),
    })),
  };
}

// ---------------------------------------------------------------- sonuç doğrulama
export function safeSummary(res: J): J {
  const keep = ["status", "paymentStatus", "fraudStatus", "errorCode", "errorMessage", "errorGroup", "currency", "price", "paidPrice", "installment", "phase", "mdStatus"];
  const o: J = {};
  for (const k of keep) {
    const v = res ? res[k] : undefined;
    if (v === null || ["string", "number", "boolean"].includes(typeof v)) o[k] = typeof v === "string" ? v.slice(0, 300) : v;
  }
  return o;
}
export function verdict(res: J, pay: J): { success: boolean; paid: number; ref: string | null; error: string | null; items: J[] } {
  const paid = priceToKurus(res && res.paidPrice);
  const tx = Array.isArray(res && res.itemTransactions) ? res.itemTransactions : [];
  const items = tx.map((t: J) => ({ id: String(t.itemId || ""), payment_transaction_id: String(t.paymentTransactionId || "") }));
  const ok = !!res && res.status === "success" && String(res.paymentStatus || "").toUpperCase() === "SUCCESS" &&
    String(res.basketId || "") === String(pay.id) && String(res.conversationId || "") === String(pay.conversation_id) &&
    (res.currency ? res.currency === "TRY" : true) && (res.fraudStatus === undefined || res.fraudStatus === 1 || res.fraudStatus === "1") &&
    items.length > 0 && items.every((i: J) => i.id && i.payment_transaction_id);
  return {
    success: ok, paid: Number.isFinite(paid) ? paid : 0, ref: res && res.paymentId ? String(res.paymentId) : null,
    error: ok ? null : String((res && (res.errorMessage || res.paymentStatus)) || "ödeme başarısız").slice(0, 300), items,
  };
}

// ---------------------------------------------------------------- alt üye
// TEYİTSİZ: alt üye türüne göre zorunlu alanlar (iyzico'ya soruluyor). Varsayılan liste aşağıda; OZ_IYZICO_SUBMERCHANT_REQUIRED ile değiştirilebilir.
export const DEFAULT_REQUIRED: J = {
  PRIVATE_COMPANY: ["name", "email", "gsmNumber", "address", "iban", "taxOffice", "legalCompanyTitle", "identityNumber"],
  LIMITED_OR_JOINT_STOCK_COMPANY: ["name", "email", "gsmNumber", "address", "iban", "taxOffice", "taxNumber", "legalCompanyTitle"],
};
export function subMerchantRequest(s: J, required: J): { body: J | null; missing: string[] } {
  const type = String(s.sub_merchant_type || "");
  const body: J = {
    locale: "tr", conversationId: String(s.seller_id), subMerchantExternalId: String(s.seller_id), subMerchantType: type,
    name: s.name, email: s.email, gsmNumber: normalizeGsm(s.phone), address: s.address, iban: s.iban ? String(s.iban).replace(/\s/g, "") : null,
    taxOffice: s.tax_office, legalCompanyTitle: s.legal_name, currency: "TRY",
    contactName: splitName(s.iban_holder || s.legal_name || "").name, contactSurname: splitName(s.iban_holder || s.legal_name || "").surname,
  };
  if (type === "PRIVATE_COMPANY") body.identityNumber = s.tax_no && String(s.tax_no).length === 11 ? s.tax_no : null;
  if (type === "LIMITED_OR_JOINT_STOCK_COMPANY") body.taxNumber = s.tax_no && String(s.tax_no).length === 10 ? s.tax_no : null;
  const req: string[] = Array.isArray(required[type]) ? required[type] : [];
  if (!req.length) return { body: null, missing: ["(" + type + " için zorunlu alan listesi yok)"] };
  const missing = req.filter((k) => body[k] === undefined || body[k] === null || String(body[k]).trim() === "");
  if (s.sub_merchant_key) body.subMerchantKey = s.sub_merchant_key;
  return { body: missing.length ? null : body, missing };
}

// ---------------------------------------------------------------- HTTP yardımcıları
const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
function fail(message: string, status = 400): Response {
  return json({ ok: false, error: message }, status);
}
function redirect(url: string): Response {
  return new Response(null, { status: 303, headers: { Location: url } });
}
export function userMessage(e: unknown): { msg: string; status: number } {
  const m = String((e as Error)?.message || e || "");
  const code = (m.match(/^(PF_[A-Z]+):/) || [])[1];
  const clean = m.replace(/^PF_[A-Z]+:\s*/, "").slice(0, 200);
  if (code === "PF_AUTH") return { msg: clean || "Yetkin yok.", status: 403 };
  if (code === "PF_STATE") return { msg: clean, status: 409 };
  if (code === "PF_INPUT") return { msg: clean, status: 400 };
  return { msg: "Beklenmeyen bir hata oluştu. Biraz sonra tekrar dene.", status: 500 };
}

export function createHandler(d: Deps): (req: Request) => Promise<Response> {
  const env = (k: string) => String(d.env(k) || "").trim();
  const SB = () => env("SUPABASE_URL").replace(/\/+$/, "");
  const site = () => (env("OZ_SITE_URL") || env("PF_SITE_URL")).replace(/\/+$/, "");
  const back = (id: string) => (site() || "") + "/?oz_pay=" + encodeURIComponent(UUID.test(id) ? id : "x");

  async function rpc(fn: string, args: J): Promise<any> {
    const key = env("SUPABASE_SERVICE_ROLE_KEY");
    const headers: J = { apikey: key, "Content-Type": "application/json" };
    if (key.split(".").length === 3) headers.Authorization = "Bearer " + key;
    const r = await d.fetch(SB() + "/rest/v1/rpc/" + fn, { method: "POST", headers, body: JSON.stringify(args) });
    const text = await r.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!r.ok) throw new Error(String((data && (data.message || data.error)) || ("rpc " + fn + " " + r.status)));
    return data;
  }
  async function userFrom(req: Request): Promise<{ id: string } | null> {
    const h = req.headers.get("authorization") || "";
    const t = h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : "";
    if (!t || t.split(".").length !== 3) return null;
    const r = await d.fetch(SB() + "/auth/v1/user", { headers: { apikey: env("SUPABASE_ANON_KEY"), Authorization: "Bearer " + t } });
    if (!r.ok) return null;
    const u = await r.json().catch(() => null);
    return u && typeof u.id === "string" && UUID.test(u.id) ? { id: u.id } : null;
  }
  async function iyzico(path: string, body: J, method = "POST"): Promise<J> {
    const { apiKey, secret } = sandboxKeys(env);
    const payload = JSON.stringify(body);
    const rnd = String(Date.now()) + String(Math.floor(Math.random() * 1e9));
    const auth = await iyzicoAuthHeader(apiKey, secret, path, payload, rnd);
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const r = await d.fetch(IYZICO_SANDBOX + path, {
        method, signal: ctl.signal, body: payload,
        headers: { Authorization: auth, "x-iyzi-rnd": rnd, "Content-Type": "application/json", Accept: "application/json" },
      });
      return await r.json().catch(() => ({ status: "failure", errorMessage: "iyzico yanıtı okunamadı", _network: true }));
    } catch {
      // zaman aşımı / ağ: sonuç BİLİNMİYOR; çağıran başarılı da başarısız da saymaz
      return { status: "failure", errorMessage: "iyzico'ya ulaşılamadı", _network: true };
    } finally { clearTimeout(t); }
  }
  async function providerGate(): Promise<Response | null> {
    const p = await rpc("oz_payment_provider", {});
    if (p === "iyzico") return fail("Canlı iyzico ödemesi bu sürümde açık değil.", 403);
    if (p !== "iyzico_sandbox") return fail("Online ödeme şu an kapalı.", 409);
    return null;
  }
  function clientIp(req: Request): string {
    const xf = req.headers.get("x-forwarded-for") || "";
    return (xf.split(",")[0].trim() || req.headers.get("x-real-ip") || "127.0.0.1").slice(0, 39);
  }

  async function init(req: Request): Promise<Response> {
    const user = await userFrom(req);
    if (!user) return fail("Giriş yapmalısın.", 401);
    const g = await providerGate(); if (g) return g;
    const b = await req.json().catch(() => null);
    const ids = b && Array.isArray(b.order_ids) ? b.order_ids.filter((x: unknown) => typeof x === "string" && UUID.test(x)) : [];
    if (!ids.length || ids.length > 40 || ids.length !== b.order_ids.length) return fail("Sipariş seçilmedi.");
    // Tutar ve kalemler istemciden ALINMAZ; oz_iyz_prepare siparişlerden yeniden kurar.
    let prep: J;
    try { prep = await rpc("oz_iyz_prepare", { p_user: user.id, p_order_ids: ids }); } catch (e) { const u = userMessage(e); if (u.status === 500) d.log("oz-iyzico init prepare", { err: String((e as Error).message).slice(0, 200) }); return fail(u.msg, u.status); }
    const idn = env("IYZICO_BUYER_IDENTITY_NUMBER");
    if (!idn) { d.log("oz-iyzico init: IYZICO_BUYER_IDENTITY_NUMBER eksik"); return fail("Ödeme şu anda başlatılamıyor.", 503); }
    let reqBody: J;
    try { reqBody = buildCheckoutRequest(prep, { ip: clientIp(req), callbackUrl: SB() + "/functions/v1/oz-iyzico?action=callback", identityNumber: idn }); }
    catch (e) { d.log("oz-iyzico init sepet", { err: String((e as Error).message) }); return fail("Ödeme tutarı doğrulanamadı.", 409); }
    let res: J;
    try { res = await iyzico(PATHS.cfInit, reqBody); } catch (e) { d.log("oz-iyzico init yapılandırma", { err: String((e as Error).message) }); return fail("Ödeme şu anda başlatılamıyor.", 503); }
    if (res.status !== "success" || !res.token || !res.paymentPageUrl) {
      d.log("oz-iyzico init iyzico", { code: res.errorCode ?? null, msg: res.errorMessage ?? null, network: !!res._network });
      return fail("Ödeme sayfası açılamadı. Lütfen tekrar dene.", 502);
    }
    await rpc("oz_iyz_attach", { p_payment: prep.payment_id, p_token: String(res.token) });
    return json({ ok: true, payment_id: prep.payment_id, payment_page_url: res.paymentPageUrl, checkout_form_content: res.checkoutFormContent ?? null,
                  amount_kurus: prep.amount_kurus, mode: "sandbox" });
  }

  async function callback(req: Request): Promise<Response> {
    const form = await req.formData().catch(() => null);
    const token = form ? String(form.get("token") || "") : "";
    if (!token || token.length > 200) return new Response("bad request", { status: 400 });
    const pay = await rpc("oz_iyz_payment_by_token", { p_token: token });
    if (!pay || !pay.id) { d.log("oz-iyzico callback: token eşleşmedi"); return redirect(back("")); }
    if (pay.status !== "initiated") return redirect(back(pay.id)); // kopya / yeniden oynatma: işlem yok
    const res = await iyzico(PATHS.cfDetail, { locale: "tr", conversationId: pay.conversation_id, token });
    if (res._network) { d.log("oz-iyzico callback: sonuç sorgusu ulaşamadı (mutabakat bekliyor)", { payment: pay.id }); return redirect(back(pay.id)); }
    const { secret } = sandboxKeys(env);
    const sigOk = await responseSignatureOk(res, secret);
    const v = verdict(res, pay);
    let success = v.success;
    if (sigOk === false || (sigOk === null && env("OZ_IYZICO_REQUIRE_SIGNATURE") === "true")) {
      d.log("oz-iyzico callback: yanıt imzası doğrulanamadı", { payment: pay.id, signature: sigOk });
      success = false;
    }
    const out = await rpc("oz_iyz_complete", {
      p_payment: pay.id, p_token: token, p_success: success, p_payment_id: v.ref, p_paid_kurus: success ? v.paid : null,
      p_items: success ? v.items : null, p_summary: { ...safeSummary(res), signatureOk: sigOk }, p_error: success ? null : (v.error || "imza doğrulanamadı"),
    });
    if (out && out.refund_required) d.log("oz-iyzico callback: tahsilat var ama sipariş açılmadı; iade gerekir", { payment: pay.id });
    return redirect(back(pay.id));
  }

  async function syncSeller(req: Request): Promise<Response> {
    const user = await userFrom(req);
    if (!user) return fail("Giriş yapmalısın.", 401);
    const b = await req.json().catch(() => null);
    const sid = b && typeof b.seller_id === "string" && UUID.test(b.seller_id) ? b.seller_id : null;
    if (!sid) return fail("Satıcı seçilmedi.");
    let s: J;
    try { s = await rpc("oz_iyz_seller_for_sync", { p_actor: user.id, p_seller: sid }); } catch (e) { const u = userMessage(e); return fail(u.msg, u.status); }
    if (s.blocked) return json({ ok: false, manual_review: true, error: s.reason });
    let required: J = DEFAULT_REQUIRED;
    const custom = env("OZ_IYZICO_SUBMERCHANT_REQUIRED");
    if (custom) { try { required = JSON.parse(custom); } catch { d.log("oz-iyzico: OZ_IYZICO_SUBMERCHANT_REQUIRED okunamadı"); } }
    const r = subMerchantRequest(s, required);
    if (!r.body) {
      const reason = "Eksik alan: " + r.missing.join(", ");
      await rpc("oz_iyz_seller_sync_result", { p_actor: user.id, p_seller: sid, p_status: "manual_review", p_key: null, p_error: reason });
      return json({ ok: false, manual_review: true, error: reason });
    }
    const res = await iyzico(PATHS.subMerchant, r.body, s.sub_merchant_key ? "PUT" : "POST");
    if (res._network) return fail("iyzico'ya ulaşılamadı; biraz sonra tekrar dene.", 502);
    const key = String(res.subMerchantKey || s.sub_merchant_key || "");
    if (res.status === "success" && key) {
      await rpc("oz_iyz_seller_sync_result", { p_actor: user.id, p_seller: sid, p_status: "synced", p_key: key, p_error: null });
      return json({ ok: true, status: "synced" });
    }
    const err = String(res.errorMessage || "iyzico alt üye işlemi başarısız").slice(0, 300);
    d.log("oz-iyzico sync", { code: res.errorCode ?? null, msg: err });
    await rpc("oz_iyz_seller_sync_result", { p_actor: user.id, p_seller: sid, p_status: "failed", p_key: null, p_error: err });
    return json({ ok: false, status: "failed", error: err });
  }

  async function approve(req: Request): Promise<Response> {
    const user = await userFrom(req);
    if (!user) return fail("Giriş yapmalısın.", 401);
    const b = await req.json().catch(() => null);
    const kind = b && (b.kind === "item" || b.kind === "ship") ? b.kind : null;
    const op = b && ["approve", "disapprove", "refund"].includes(b.op) ? b.op : null;
    const id = b && typeof b.id === "string" && UUID.test(b.id) ? b.id : null;
    if (!kind || !op || !id) return fail("Geçersiz istek.");
    // Kapı (yönetici + sandbox + teslim + bekleme + açık iade yok) veritabanında; JWT'deki kullanıcı yönetici değilse PF_AUTH
    let t: J;
    try { t = await rpc("oz_iyz_approval_target", { p_actor: user.id, p_kind: kind, p_id: id, p_action: op }); } catch (e) { const u = userMessage(e); return fail(u.msg, u.status); }
    const conv = "oz-" + op + "-" + id;
    const res = op === "refund"
      ? await iyzico(PATHS.refund, { locale: "tr", conversationId: conv, paymentTransactionId: t.payment_transaction_id, price: kurusToPrice(t.price_kurus), currency: "TRY", ip: clientIp(req) })
      : await iyzico(op === "approve" ? PATHS.approve : PATHS.disapprove, { locale: "tr", conversationId: conv, paymentTransactionId: t.payment_transaction_id });
    if (res._network) { d.log("oz-iyzico approve: sonuç bilinmiyor", { op, kind, id }); return fail("iyzico'ya ulaşılamadı; sonuç bilinmiyor, panelden kontrol et.", 502); }
    const ok = res.status === "success";
    const rec = await rpc("oz_iyz_record_approval", { p_actor: user.id, p_kind: kind, p_id: id, p_action: op, p_success: ok, p_summary: { ...safeSummary(res), op }, p_error: ok ? null : String(res.errorMessage || "").slice(0, 300) });
    if (!ok) { d.log("oz-iyzico approve iyzico", { op, code: res.errorCode ?? null, msg: res.errorMessage ?? null }); return json({ ok: false, error: "iyzico işlemi reddetti: " + String(res.errorMessage || "bilinmeyen hata").slice(0, 200) }, 502); }
    return json({ ok: true, status: rec && rec.status });
  }

  return async function handler(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return fail("method", 405);
    const action = new URL(req.url).searchParams.get("action") || "";
    try {
      switch (action) {
        case "init": return await init(req);
        case "callback": return await callback(req);
        case "sync_seller": return await syncSeller(req);
        case "approve": return await approve(req);
        default: return fail("Bilinmeyen işlem.", 404);
      }
    } catch (e) {
      d.log("oz-iyzico " + action, { err: String((e as Error).message || "").slice(0, 200) });
      if (action === "callback") return redirect(back(""));
      const u = userMessage(e);
      return fail(u.msg, u.status);
    }
  };
}
