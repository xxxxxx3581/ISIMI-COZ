# İŞİNİ HALLET / İŞİMİ ÇÖZ — MASTER PROJECT CONTEXT

> Bu belge, aynı platform üzerinde çalışan İŞİMİ ÇÖZ ve İŞİNİ HALLET katmanlarının ortak proje hafızasıdır.
>
> Amaç: ChatGPT, Claude, Grok ve gelecekte kullanılacak diğer AI/agent oturumlarının mevcut sistemi doğru anlamasını, iki ürün katmanını birbirine karıştırmamasını ve daha önce çalışan özellikleri bozacak değişiklikler yapmamasını sağlamak.
>
> KAYNAK ÖNCELİĞİ:
> 1. Canlı Supabase şeması ve canlı veriler
> 2. GitHub `main` branch'indeki mevcut kod
> 3. Bu Master Context
> 4. Eski taslaklar, migration dosyaları ve önceki konuşmalar
>
> Bir çelişki varsa canlı sistem esas alınır ve bu belge güncellenir.
>
> Son güncelleme: 2026-09-06

---

# 1. PLATFORMUN GENEL YAPISI

Bu sistem tek platform içinde iki ürün katmanından oluşur:

## 1.1 İŞİMİ ÇÖZ

Türkiye odaklı AI destekli hizmet/usta bulma ve talep platformudur.

Temel iş:

- müşteri talebi oluşturur
- talep Supabase'e kaydedilir
- AI talebi analiz eder
- uygun sağlayıcılar/eşleşmeler bulunur
- sağlayıcılar teklif verebilir
- müşteri teklifleri değerlendirebilir
- mevcut marketplace/AI pipeline çalışır

## 1.2 İŞİNİ HALLET

Aynı platforma eklenen AI destekli işlem ve evrak asistanı katmanıdır.

Amaç:

Kullanıcının Türkiye'deki resmi/idari işlemleri adım adım hazırlamasına yardımcı olmak.

Mevcut MVP:

- Taşınmaz işlemleri
- Konut satışı
- Gerçek kişi satıcı

ÖNEMLİ:

İŞİNİ HALLET ayrı bir ürün mantığına sahip olsa da mevcut platformdan bağımsız ayrı bir GitHub repository veya ayrı bir Supabase projesi değildir.

İki katman aynı platform ve aynı Supabase projesi üzerinde çalışır.

---

# 2. TEMEL TEKNİK KAYNAKLAR

## 2.1 GitHub

Repository:

`xxxxxx3581/ISIMI-COZ`

Branch:

`main`

Mevcut çalışan ana frontend:

`index.html`

## 2.2 Supabase

Project ref:

`zvffspbowdzvrrzefhkr`

Supabase URL:

`https://zvffspbowdzvrrzefhkr.supabase.co`

İŞİMİ ÇÖZ ve İŞİNİ HALLET aynı Supabase projesini kullanır.

---

# 3. İŞİMİ ÇÖZ — MEVCUT SİSTEM

## 3.1 Marketplace

İŞİMİ ÇÖZ, İzmir pilotu olarak başlayan hizmet/usta bulma platformudur.

Temel kavramlar:

- requests
- providers
- offers
- AI matching
- AI decisions
- AI jobs

## 3.2 Canlı Marketplace tabloları

### requests

Bilinen canlı alanlar:

- id
- customer_id
- category_id
- description
- district
- neighborhood
- urgency
- photo_url
- status
- created_at
- user_id
- is_urgent
- lat
- lng
- workspace
- updated_at

### providers

Bilinen canlı alanlar:

- id
- name
- phone
- district
- description
- active
- created_at
- city
- services
- updated_at
- user_id
- owner_id
- logo_url
- availability
- lat
- lng

### offers

Bilinen canlı alanlar:

- id
- request_id
- provider_id
- price
- available_time
- note
- status
- created_at
- provider_user_id
- on_the_way

### ai_jobs

Bilinen canlı alanlar:

- id
- request_id
- type
- status
- attempts
- last_error
- created_at
- updated_at

### ai_matches

Bilinen canlı alanlar:

- id
- request_id
- provider_id
- score
- reason
- rank
- created_at

### ai_decisions

Bilinen canlı alanlar:

- id
- request_id
- agent
- action
- input
- output
- status
- created_at

---

# 4. İŞİMİ ÇÖZ — ANA AI PIPELINE

MEVCUT AI PIPELINE ÇALIŞAN SİSTEMDİR.

Temel mimari:

Frontend
→ `ai-orchestrator`
→ `ai-customer`
→ `ai-matching`
→ `ai-tools`
→ Supabase

Edge Functions:

- ai-orchestrator
- ai-customer
- ai-matching
- ai-tools

AI tools tarafındaki temel işlemler:

- get_request
- update_request
- find_providers
- create_match
- log_decision

ÖNEMLİ GELİŞTİRME KURALI:

Bu pipeline yeniden tasarlanmamalı veya gereksiz yere yeniden yazılmamalıdır.

Özellikle:

- request oluşturma
- request okuma
- provider akışı
- offer akışı
- teklif kabulü
- AI orchestrator
- AI customer
- AI matching
- AI tools

çalışan sistem olarak kabul edilir.

Yeni özellik eklenirken mevcut pipeline minimum diff ile korunmalıdır.

---

# 5. GROK OPERATIONS MİMARİSİ

Grok'un sisteme erişimi ana AI pipeline'dan ayrıdır.

Mimari:

Grok
→ ai-ops-mcp
→ ai-ops
→ Supabase REST / PostgREST

Bu katman operasyonel gözlem ve kontrollü erişim amacıyla oluşturulmuştur.

Ana marketplace AI pipeline'ı yeniden yazmaz.

---

# 6. ai-ops

Supabase Edge Function:

`ai-ops`

Mevcut sürüm:

v7

`verify_jwt = false`

Yetkilendirme:

`x-ops-key`

Header değeri Edge Function tarafındaki `OPS_API_KEY` secret ile doğrulanır.

## 6.1 Güvenlik

Grok'a:

- service_role key
- Supabase secret key
- sınırsız SQL erişimi

verilmemelidir.

Grok'un erişimi kontrollü operasyon araçları üzerinden yapılır.

## 6.2 get_system_health

Mevcut health kontrolü ağır tam tablo sorguları yerine COUNT tabanlı hafif sorgular kullanır.

Mevcut amaç:

- requests sayısı
- active providers sayısı
- failed jobs sayısı
- pending jobs sayısı

gibi sistem sağlığı metriklerini hızlı almak.

---

# 7. ai-ops-mcp

Supabase Edge Function:

`ai-ops-mcp`

Mevcut sürüm:

v4

MCP server:

`isimi-coz-ops`

Protocol:

`2024-11-05`

JWT:

`verify_jwt = false`

## 7.1 Mevcut 8 read-only tool

1. `get_system_health`
2. `list_requests`
3. `get_request`
4. `get_job_status`
5. `get_matches`
6. `get_offers`
7. `find_providers`
8. `get_decisions`

Bu araçlar ai-ops katmanındaki karşılıklarına yönlendirilir.

## 7.2 get_job_status kısıtı

`get_job_status` çağrılabilir.

Ancak mevcut read-only tool setinde `ai_jobs.id` değerlerini listeleyen bağımsız bir tool bulunmadığından gerçek bir job ID keşfetmek sınırlıdır.

Bu konu gelecekte geliştirilebilir.

Şu anda çözülmüş kabul edilmemelidir.

---

# 8. GROK WRITE ERİŞİMİ

Aşağıdaki write işlemleri şu anda açılmış özellikler değildir:

- run_orchestrator
- refresh_matches
- log_decision
- flag_needs_human
- update_request_fields
- force_status
- notify_provider
- notify_customer
- disable_provider
- bulk_reprocess

Bunlar yalnızca gelecek planı olarak değerlendirilmelidir.

AI agent'a otomatik write yetkisi verilmemelidir.

Write işlemleri gerektiğinde açık onay ve kontrollü approval mekanizması ile ele alınmalıdır.

---

# 9. İŞİMİ ÇÖZ — AÇIK GÜVENLİK GELİŞTİRMELERİ

Henüz tamamlanmış kabul edilmemesi gereken maddeler:

- rate limiting
- photo_url redaksiyonu
- telefon bilgilerinin redaksiyonu
- Grok operasyon okumalarının audit log'a yazılması
- daha kontrollü approval/write sistemi

Bu özellikler uygulanmadan "tam güvenli" veya "tamamlandı" olarak işaretlenmemelidir.

---

# 10. İŞİNİ HALLET — MEVCUT MİMARİ

İŞİNİ HALLET şu anda mevcut ana `index.html` içinde çalışan tek dosyalı yapıdadır.

Hallet mantığı:

- ayrı bağımsız `isini-hallet.js` dosyasına bağlı değildir
- ayrı bağımsız `isini-hallet.css` dosyasına bağlı değildir
- mevcut `index.html` içinde gömülü olarak çalışır

Bu nedenle gelecekte yapılacak çalışmalarda hayali veya deploy edilmemiş ayrı Hallet dosyaları mevcut sistemmiş gibi kabul edilmemelidir.

---

# 11. İŞİNİ HALLET — CANLI SUPABASE TABLOSU

Canlı tablo:

`public.hallet_cases`

## 11.1 Canlı kolonlar

| Kolon | Tip | Durum |
|---|---|---|
| id | uuid | NOT NULL |
| case_type | text | NOT NULL |
| status | text | NOT NULL |
| title | text | nullable |
| summary | text | nullable |
| user_id | uuid | nullable |
| customer_id | uuid | nullable |
| district | text | nullable |
| city | text | nullable |
| metadata | jsonb | NOT NULL |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

## 11.2 case_type constraint

Canlı constraint:

`case_type = 'konut_satisi'`

Dolayısıyla mevcut MVP için kullanılacak değer:

`konut_satisi`

` t asinmaz_konut_satisi` veya başka bir değer kullanılmamalıdır.

## 11.3 status değerleri

Canlı olarak kabul edilen değerler:

- draft
- in_progress
- waiting_user
- completed
- cancelled

---

# 12. İŞİNİ HALLET — KAYIT SİSTEMİ

Mevcut `DOSYAYI KAYDET` özelliği çalışmaktadır.

Akış:

Kullanıcı işlem dosyasını tamamlar
→ `DOSYAYI KAYDET`
→ Supabase authentication session kontrolü
→ `hallet_cases`

İlk kayıtta:

`INSERT`

Sonraki kayıt işlemlerinde:

`UPDATE`

Mevcut kayıtta kullanılan temel bilgiler:

- case_type
- status
- title
- summary
- user_id
- customer_id
- district
- city
- metadata
- created_at
- updated_at

## 12.1 metadata

Cevaplar ve hesaplama sonuçları ayrı tablolar yerine mevcut yapıda `metadata` JSONB alanında tutulmaktadır.

Metadata içinde mevcut mantıksal alanlar:

- case_no
- module
- transaction_type
- answers
- calculations
- warnings
- source_note

Bu yapı gelecekte değiştirilmeden önce canlı şema ve mevcut frontend kodu kontrol edilmelidir.

---

# 13. İŞİNİ HALLET — MEVCUT KONUT SATIŞI SORU AKIŞI

Mevcut MVP soru anahtarları:

1. `seller_type`
2. `property_location`
3. `title_deed`
4. `multiple_owners`
5. `encumbrance`
6. `representation`
7. `acquisition_date`
8. `acquisition_type`
9. `buyer_ready`
10. `sale_price`
11. `acquisition_price`
12. `building`

Bu sorular işlem dosyasının ön kontrol bilgilerini oluşturur.

---

# 14. İŞİNİ HALLET — MEVCUT SONUÇ EKRANI

Mevcut sonuç ekranında temel olarak:

- işlem numarası
- uyarılar
- 5 yıllık kontrol
- potansiyel değer artış kazancı uyarısı
- satış bedeli
- edinim bedeli
- brüt fark
- tapu harcı ön hesaplaması
- gerekli belgeler
- sonraki adımlar
- resmi kaynak notu

gösterilir.

Ayrıca:

`DOSYAYI KAYDET`

işlemi bulunur.

---

# 15. İŞLEM NUMARASI

Hallet sonuç ekranında işlem dosyası için `IH-...` formatında bir case numarası oluşturulur.

Bu numara mevcut `metadata` içinde:

`case_no`

alanında tutulur.

Bu değer `hallet_cases` tablosunda ayrı bir `case_no` kolonu olarak bulunmaz.

ÖNEMLİ:

`case_no` üzerinden Supabase `on_conflict` işlemi yapılmamalıdır.

---

# 16. KONUT SATIŞI HESAPLAMALARI

Mevcut MVP'de kullanılan temel hesaplamalar:

- satış bedeli
- edinim bedeli
- brüt fark
- satıcı tapu harcı ön hesabı
- alıcı tapu harcı ön hesabı
- toplam tapu harcı
- 5 yıllık kontrol

Mevcut tapu harcı ön hesaplama mantığı:

- satıcı: %2
- alıcı: %2
- toplam: %4

Mevcut hesaplamanın bir ön kontrol olduğu unutulmamalıdır.

Resmi işlem sırasında güncel resmi değerler ve resmi kurum hesaplamaları esas alınmalıdır.

Belediye emlak vergi değeri ve diğer resmi masraf kalemleri ayrıca doğrulanmadan kesin ödeme tutarı gibi gösterilmemelidir.

---

# 17. İŞİNİ HALLET — BELGE KONTROLÜ

Mevcut MVP'de koşullara göre temel belgeler arasında:

- kimlik
- temsil belgesi gerekiyorsa temsil belgesi
- tapu bilgisi
- bina varsa DASK
- çoklu malik durumunda malik/temsil kontrolü

bulunabilir.

Belge listesi hukuki/resmi kesin liste olarak sunulmamalıdır.

Güncel TKGM ve ilgili resmi kurum şartları işlem sırasında esas alınmalıdır.

---

# 18. İŞİNİ HALLET — 5 YIL KONTROLÜ

Mevcut akışta `acquisition_date` üzerinden 5 yıllık kontrol yapılır.

Edinim türü satın alma ve ilgili koşullar oluşuyorsa değer artış kazancı açısından uyarı oluşturulur.

Bu bölüm:

- ön kontrol
- bilgilendirme

amaçlıdır.

Vergi yükümlülüğünün kesin tespiti olarak değerlendirilmemelidir.

---

# 19. İŞİNİ HALLET — AI / KURAL MOTORU DURUMU

ÖNEMLİ:

Hallet'in mevcut soru/form akışı ile bağımsız bir AI/kural motoru aynı şey değildir.

Mevcut sistemde:

- soru akışı vardır
- cevapların toplanması vardır
- hesaplama ve uyarı mantığı vardır
- işlem dosyasının Supabase'e kaydedilmesi vardır

Ancak gelecekte geliştirilecek daha kapsamlı AI/kural motoru:

- resmi mevzuat kuralları
- belge gereksinimleri
- işlem adımları
- vergi/harç kuralları
- resmi kaynak doğrulaması

gibi alanları kapsayacak şekilde ayrıca tasarlanmalıdır.

Henüz uygulanmamış bir AI/kural motoru "canlı" veya "tamamlandı" olarak kabul edilmemelidir.

---

# 20. ESKİ HALLET MİMARİ TASLAKLARI

Daha önce daha kapsamlı bir Hallet mimarisi tasarlanmıştır.

Örnek hedef tablolar:

- hallet_case_answers
- hallet_documents
- hallet_case_steps
- requirements
- case_requirements
- document_extractions
- calculations
- official_sources
- generated_documents
- case_events
- notifications
- audit_logs

Bu yapı mevcut canlı sistemin tamamı değildir.

Şu anda canlı ve doğrulanmış Hallet kayıt tablosu:

`public.hallet_cases`

Eski migration veya mimari taslaklar canlı şema ile karıştırılmamalıdır.

Yeni tablo eklenmeden önce canlı Supabase şeması kontrol edilmeli ve açık onay alınmalıdır.

---

# 21. İŞİNİ HALLET — GÜVENLİK VE HUKUKİ SINIRLAR

İŞİNİ HALLET:

- resmi makam değildir
- avukat değildir
- vergi danışmanı değildir
- resmi kurum kararının yerine geçmez

AI tarafından oluşturulacak belge veya açıklamalar:

- resmi belge olarak kabul edilmemeli
- resmi kurum başvurusu yerine geçmemeli
- kullanıcıya kesin hukuki/vergi sonucu gibi sunulmamalıdır

Resmi mevzuat veya ücret bilgisi doğrulanmadığında sistem bunu açıkça belirtmelidir.

Tahmin veya varsayım, doğrulanmış resmi bilgi gibi gösterilmemelidir.

---

# 22. İKİ SİSTEMİN BİRBİRİNE ETKİSİ

İŞİMİ ÇÖZ:

- marketplace
- hizmet talebi
- provider
- offer
- matching
- mevcut AI pipeline

İŞİNİ HALLET:

- resmi/idari işlem
- işlem dosyası
- soru akışı
- belge kontrolü
- hesaplama
- işlem adımları

Aynı platformda bulunmalarına rağmen görevleri farklıdır.

ÖNEMLİ:

Hallet geliştirilirken İşimi Çöz marketplace tablolarının veya AI pipeline'ının gereksiz şekilde değiştirilmesi kabul edilmez.

---

# 23. FRONTEND GELİŞTİRME KURALI

Mevcut çalışan ana dosya:

`index.html`

Mevcut kullanıcı deneyimini bozacak toplu rewrite yapılmamalıdır.

Özellikle mevcut:

- giriş
- kayıt
- home
- talep oluşturma
- talep listesi
- talep detayları
- provider akışları
- teklif akışları
- teklif kabulü
- Hallet akışı
- Supabase bağlantısı

kontrol edilmeden büyük frontend değişikliği yapılmamalıdır.

---

# 24. AUTHENTICATION

Mevcut frontend Supabase Auth session kullanır.

Hallet dosya kaydı sırasında:

- kullanıcı oturumu
- access token
- kullanıcı ID

kontrol edilir.

Kimlik doğrulaması olmayan kullanıcı için dosya kaydetme işlemi gerçekleştirilmemeli ve uygun giriş/kayıt akışına yönlendirilmelidir.

Secret key'ler frontend içine gömülmemelidir.

---

# 25. SUPABASE GELİŞTİRME KURALLARI

Her yeni değişiklikten önce:

1. Canlı tablo şeması kontrol edilir.
2. Mevcut constraint'ler kontrol edilir.
3. RLS/policy durumu kontrol edilir.
4. Mevcut frontend sorguları kontrol edilir.
5. Mevcut çalışan kayıt akışı korunur.

Özellikle:

- tablo kolonları varsayılmamalı
- olmayan kolonlar kullanılmamalı
- constraint değerleri varsayılmamalı
- eski migration canlı şema gibi kabul edilmemeli

---

# 26. MASTER CONTEXT GÜNCELLEME KURALI

Bu belge kalıcı proje hafızasıdır.

Ancak canlı sistemin yerine geçmez.

Yeni bir özellik uygulandığında:

1. Önce kod değişir.
2. Deploy edilir.
3. Test edilir.
4. Gerçek çalışma doğrulanır.
5. Daha sonra Master Context güncellenir.

Henüz test edilmemiş bir özellik:

`PLANLANDI`

veya

`UYGULANMADI`

olarak tutulmalıdır.

---

# 27. AJANLARIN ROLLERİ

## ChatGPT

Öncelikli kullanım:

- ürün akışı
- kullanıcı deneyimi
- Hallet soru akışı
- işlem dosyası
- frontend değişiklikleri
- mimari kararların koordinasyonu

## Claude

Öncelikli kullanım:

- kod inceleme
- repo analizi
- kontrollü refactoring
- uygulama planı
- teknik doğrulama

GitHub write erişimi yoksa GitHub'a doğrudan commit atamaz.

## Grok

Öncelikli kullanım:

- araştırma
- mimari değerlendirme
- ai-ops-mcp üzerinden operasyonel gözlem
- Supabase sistem durumunu read-only inceleme
- SQL/JS taslakları

Grok'un MCP erişimi write yetkisi anlamına gelmez.

---

# 28. KESİNLİKLE BOZULMAMASI GEREKENLER

Aşağıdaki çalışan sistemler açık onay olmadan topluca yeniden yazılmamalıdır:

## İşimi Çöz

- requests akışı
- providers akışı
- offers akışı
- teklif kabulü
- createRequest
- mevcut Supabase helpers
- ai-orchestrator
- ai-customer
- ai-matching
- ai-tools
- ai-ops
- ai-ops-mcp

## İşini Hallet

- mevcut tek dosyalı `index.html`
- Hallet soru akışı
- sonuç ekranı
- `DOSYAYI KAYDET`
- `hallet_cases` kayıt sistemi

---

# 29. DEĞİŞİKLİK YAPMADAN ÖNCE KONTROL LİSTESİ

Her agent şu sırayı izlemelidir:

### Adım 1

Canlı sistemi oku.

### Adım 2

Değiştirilecek dosyayı oku.

### Adım 3

Mevcut kodun ne yaptığını anla.

### Adım 4

Değişikliğin mevcut özelliklere etkisini kontrol et.

### Adım 5

Mümkün olan en küçük değişikliği yap.

### Adım 6

Deploy/test yap.

### Adım 7

Gerçek sonucu doğrula.

### Adım 8

Başarılıysa Master Context'i güncelle.

---

# 30. ŞU ANDAKİ DOĞRULANMIŞ DURUM

## İşimi Çöz

- Marketplace mevcut.
- Supabase backend mevcut.
- AI pipeline mevcut.
- ai-orchestrator mevcut.
- ai-customer mevcut.
- ai-matching mevcut.
- ai-tools mevcut.
- ai-ops mevcut.
- ai-ops-mcp mevcut.
- Grok için 8 read-only tool mevcut.
- Write tool'lar açılmış değildir.

## İşini Hallet

- Tek dosyalı `index.html` içinde çalışmaktadır.
- Konut satışı MVP'si bulunmaktadır.
- Soru akışı bulunmaktadır.
- Sonuç/işlem dosyası ekranı bulunmaktadır.
- İşlem numarası oluşturulmaktadır.
- Uyarı ve hesaplama mantığı bulunmaktadır.
- `DOSYAYI KAYDET` çalışmaktadır.
- `hallet_cases` canlı Supabase tablosuna kayıt yapılmaktadır.
- İlk kayıt INSERT, sonraki kayıt UPDATE mantığındadır.
- `case_type = 'konut_satisi'` kullanılmaktadır.

---

# 31. ŞU ANDA YAPILMAMIŞ / GELECEKTEKİ İŞLER

Aşağıdakiler uygulanmış kabul edilmemelidir:

## İşimi Çöz

- get_job_status için job ID keşif mekanizması
- rate limiting
- PII/photo redaksiyonu
- ops audit log
- kontrollü AI write araçları
- approval workflow

## İşini Hallet

- kapsamlı AI/kural motoru
- kapsamlı requirement engine
- gelişmiş belge extraction/OCR
- generated official-document workflow
- gelişmiş case documents sistemi
- gelişmiş case steps sistemi
- resmi kaynakların otomatik güncellenmesi
- Hallet için ayrı MCP read-only tool seti
- ikinci işlem tipi
- kapsamlı RLS/Storage mimarisi

Bunlar gelecekte planlanabilir ancak uygulanmış özellik olarak gösterilmemelidir.

---

# 32. GELİŞTİRME FELSEFESİ

Temel prensip:

> Önce çalışan sistemi koru, sonra genişlet.

Kurallar:

- Varsayım yapma.
- Canlı şemayı kontrol et.
- Canlı kodu kontrol et.
- Eski migration'ı gerçek şema kabul etme.
- Deploy edilmemiş özelliği canlı kabul etme.
- Resmi bilgiyi doğrulamadan kesin bilgi olarak sunma.
- Secret'ları frontend'e koyma.
- RLS'i rastgele değiştirme.
- Çalışan AI pipeline'ı gereksiz yere yeniden yazma.
- Hallet ile İşimi Çöz mimarilerini birbirine karıştırma.
- Büyük rewrite yerine minimal diff kullan.
- Test edilmeden "tamamlandı" deme.

---

# 33. SON KAYNAK HİYERARŞİSİ

Bir agent aşağıdaki bilgiler arasında çelişki görürse:

### 1. Canlı Supabase

En yüksek öncelik.

### 2. GitHub `main`

İkinci öncelik.

### 3. Bu Master Context

Üçüncü öncelik.

### 4. Eski konuşmalar / taslaklar / migration dosyaları

En düşük öncelik.

Bir özellik yalnızca eski bir konuşmada veya taslak dosyada varsa ve canlı sistemde doğrulanamıyorsa:

`UYGULANMAMIŞ / DOĞRULANMADI`

olarak kabul edilir.

---

# 34. MASTER CONTEXT SONU

Bu belge:

- İŞİMİ ÇÖZ'ün çalışan marketplace + AI sistemini
- İŞİNİ HALLET'in mevcut işlem dosyası sistemini
- Grok / ai-ops-mcp operasyon katmanını
- canlı Supabase gerçeklerini
- geliştirme sınırlarını
- gelecekteki yol haritasını

tek bir kalıcı bağlam altında toplar.

Ana prensip:

**Çalışanı bozma. Canlıyı doğrula. Varsayım yapma. Küçük değiştir. Test et. Sonra belgeyi güncelle.**

END OF MASTER CONTEXT
