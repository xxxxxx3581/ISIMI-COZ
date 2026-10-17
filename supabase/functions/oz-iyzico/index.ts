// Özüne Dön · iyzico Pazaryeri (SANDBOX) — Edge Function giriş noktası. Ayrıntılar ve ortam değişkenleri: ./core.ts
// DURUM: yalnız dosya; DEPLOY EDİLMEDİ. Anahtarlar yalnız ortam değişkeninden okunur; burada ve loglarda yoktur.
import { createHandler } from "./core.ts";

Deno.serve(createHandler({
  env: (k: string) => Deno.env.get(k) ?? "",
  fetch: (url: string, init?: Record<string, unknown>) => fetch(url, init as RequestInit),
  // Yalnız kısa ileti + güvenli alanlar (hata kodu/mesajı, kimlikler). Anahtar, kart ve ham yanıt asla loglanmaz.
  log: (msg: string, meta?: Record<string, unknown>) => console.error(msg, meta ? JSON.stringify(meta) : ""),
}));
