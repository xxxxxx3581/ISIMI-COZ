# Özüne Dön — Tasarım Jetonları

Kaynak: `index.html` içindeki `/*K21-BASLA*/ … /*K21-BITIS*/` bloğu (yalnız `html:root .oz*` kapsamı). Bu belge AJ1 (Paket 1–7) sonrası durumu anlatır.

## Temalar

| Tema | Nasıl seçilir | Tanım yeri |
|---|---|---|
| Krem (varsayılan) | `localStorage['isimi_oz_theme']` yok veya `'dark'` dışında bir değer | `html:root body.ozWorld.ozLt{…}` |
| Koyu | Hesabım › Görünüm (değer `'dark'`) | `html:root{…}` ve `html:root body.ozWorld{…}` |

`ensureWorld()` → `themeApply()` gövdeye `ozLt` sınıfını ekler, `leaveWorld()` kaldırır; platformun geri kalanı etkilenmez.

## Çekirdek jetonlar

| Jeton | Koyu | Krem | Kullanım |
|---|---|---|---|
| `--oz-bg` | `#2B2118` | `#F6F0E3` | sayfa zemini |
| `--oz-card` | `#3A2D20` | `#FFFDF8` | kart / panel zemini |
| `--oz-card2` | `#4A3A27` | `#F0E8D8` | ikincil yüzey (düğme, alan) |
| `--oz-line` | `#54422D` | `#E1D6BF` | kenarlık |
| `--oz-line2` | `#6B5A44` | `#CDBFA3` | güçlü kenarlık |
| `--oz-text` | `#F6ECDC` | `#1F2A22` | ana metin |
| `--oz-muted` | `#CDBB9F` | `#5B5242` | ikincil metin |
| `--oz-muted2` | `#A99983` | `#6C6150` | üçüncül metin (AA ≥4.5; P6'da koyu `#9C8B72` → `#A99983`) |
| `--oz-acc` | `#28804F` | `#1F6B45` | birincil eylem zemini (beyaz yazı AA) |
| `--oz-acc2` / `L` / `B` | `#4FB67F` | `#1F6B45` / `#3E8F66` / `#2E8B57` | yeşil vurgu: metin / çizgi / dolgu |
| `--oz-sun` / `L` / `B` | `#F7D24A` | `#8A5A00` / `#C9A33A` / `#F2C14E` | fiyat, sarı vurgu: metin / çizgi / dolgu |
| `--oz-bad` / `L` | `#E5735A` | `#B3402A` / `#D9694A` | hata: metin / çizgi |
| `--oz-warn` | `#E0A84A` | `#B9770E` | uyarı |
| `--oz-ink` | `#1F3B2A` | — | koyu yeşil mürekkep |
| `--oz-w` | `880px` (≥1100 px ekranda `1120px`) | aynı | masaüstü içerik genişliği (üst çubuk, şeritler, alt menü, ödeme çubuğu) |

### Türetilmiş renk jetonları (`--oz-x<HEX><T|L|B>`)

P1'de koddaki 657 sabit renk, 90 adet `--oz-x…` jetonuna taşındı. Ad, koyu temadaki özgün rengi ve rolü taşır:
`T` = metin, `L` = çizgi/kenarlık, `B` = dolgu (zemin). Koyu değer = addaki renk; krem değerleri `body.ozWorld.ozLt` bloğundadır.
Beyaz yazı taşıyan dolgular (ör. durum sayaçları, rozetler) kremde de koyu kalır.

### Bilerek sabit bırakılan renkler (149)

Beyaz metin (`#fff`), parlak dolgu + koyu metin çiftleri, `.ozBn` / `.ozHs` / `.ozHeroN` afişleri, `.ozPP .cv` / `.ozPrd .cv` kapakları, `.ozToast`.
P6 erişilebilirlik düzeltmeleri de sabit değerdir (her iki temada aynı zeminde durur):

| Öğe | Değer | Neden |
|---|---|---|
| `.ozBdg.dot` (zil / sipariş rozeti) | `#C4492F` | beyaz rakam AA |
| `.ozProg.col` adım 1 / adım 3 | `#C4492F` / `#2F6FA8` | beyaz rakam AA |
| `.ozSoCnt .c2` (Hazırlanıyor sayacı) | `#9A6410` | beyaz yazı AA |

## Ölçü ve hareket

- Boşluk: 4/8 px ölçeği.
- Dokunma alanı: en az 44×44 px (P6). Bilinen tek istisna, sepet adet düğmeleri `.ozCoL .q button`: 40×44 px (görünmez `::after` alanı genişletir).
- Odak halkası: `:focus-visible` 2 px; koyuda `--oz-sunL`, kremde `--oz-acc`.
- Hareket: 150–200 ms; `prefers-reduced-motion: reduce` iken kaydırma ve geçişler anında olur.
- Masaüstü: ödeme ekranı ≥900 px'te iki sütun (`.ozCo.ozCo2`).

## Yeni sınıflar (AJ1)

| Sınıf | Paket | Amaç |
|---|---|---|
| `.ozPrFrom` | P3 | seçenekli üründe "X ₺'den başlayan fiyatlarla" |
| `.ozCoSum`, `.ozCoL .lt` | P3 | sepet özeti ve satır tutarı (yalnız `oz_quote` yanıtından) |
| `#ozHP` | P3 | Keşfet "Öne çıkan ürünler" (satıcıların altında) |
| `.ozSoIt` | P4 | satıcı sipariş kartında fotoğraflı kalem satırı |
| `.ozEmptyA` | P7 | sonuçsuz aramada "Kategorilere göz at" + "Öne çıkan ürünler" |
| `.ozPdTr` | P7 | ürün detayında kargo süresi + iade koşulu + satıcı tek blok (yalnız `handling_days`, `free_ship_over_kurus`, `return_days`) |
| `.ozOdN.ozNext` | P7 | sipariş detayında "Sıradaki adım" (durum + kargo firması) |
| `.ozQMx` | P7 | adet sınırı açıklaması (arayüz sınırı 50; stok daha azsa stok) |
| `.ozStQ` | P7 | satıcı stok formunda −/+ (kayıt yalnız "Kaydet" ile, mevcut `oz_variant_set_stock`) |

## Testler

- `tests/oz-ui/aj1-tema.test.js`: iki tema, AA, 320/360/390/430/768/1280 px × 7 ekran taşma ve alt menü ≥44 px, P3 ve P7 davranışları.
- `tests/oz-ui/harness.js`: `theme` seçeneği (`'dark'` varsayılan; `''` = uygulama varsayılanı, yani krem).
- `tests/oz-ui/ac4-surum.test.js`: CSS referansı `dbd46f0` (AJ1 son tasarım commit'i).
