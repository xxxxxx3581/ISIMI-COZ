1. Sabit Proje Kuralları
İŞİMİ-ÇÖZ GELİŞTİRME KURALLARI

Genel:
1. Mevcut çalışan özellikleri bozma.
2. Değişiklik yapmadan önce mevcut dosya yapısını ve ilgili kodu incele.
3. Hangi dosyaların etkileneceğini belirle, gereksiz dosya oluşturma,
   ilgisiz dosyalara dokunma.
4. Yeni özellikleri mevcut mimariye entegre et; paralel/tekrarlayan yapı kurma.

Güvenlik:
5. API anahtarlarını (ör. OPENAI_API_KEY) koda veya frontend'e yazma;
   environment variable / Supabase Secrets kullan.
6. Supabase bağlantılarını ve RLS politikalarını koruyarak çalış;
   RLS'i geçici olarak bile kapatma.

Kalite kontrolü:
7. Değişiklikleri uygula, ardından syntax ve çalışma hatalarını kontrol et.
8. Mümkünse otomatik test çalıştır.
9. Hata bulursan kullanıcıya bırakmadan önce kendin düzelt ve tekrar test et.
10. Deploy öncesi son kontrol yap: syntax hataları, eksik dosyalar,
    import hataları, eksik environment variable'lar, Supabase bağlantıları.

Ürün/UX:
11. Mobil görünümü bozma.
12. Yeni özellik ana ekranı gereksiz şekilde kalabalıklaştırmamalı.

Raporlama:
13. İşlem gerçekten tamamlanmadan "tamamlandı" deme; kalan/bilinmeyen
    noktaları açıkça belirt.
Not: Claude deploy işlemini kendi başına gerçekleştiremez (Render/Vercel gibi bir connector bağlı değilse). 10. madde Claude'un deploy'a hazırlık kontrolü yapmasını sağlar; gerçek deploy adımını sen tetiklersin — ya da ilgili connector bağlıysa Claude'dan bunu senin adına yapmasını iste.
2. Günlük Kullanım İçin Komut Şablonları
A. Genel değişiklik / bugfix
Bu projede mevcut çalışan özellikleri bozma. Önce mevcut dosya yapısını
ve kodu incele. Değişiklik yapmadan önce hangi dosyaların etkileneceğini
belirle. Değişiklikleri doğrudan uygula, ardından sözdizimi ve çalışma
hatalarını kontrol et. Hata varsa kendin düzelt ve tekrar test et. Bana
yalnızca tamamlanan işlemi ve varsa kalan problemi bildir.
B. Yeni özellik ekleme (Planla + Uygula + Test Et)
[Özellik adı]'nı projeye ekle. Önce mevcut mimariyi incele. Gerekli
dosyaları belirle. Uygula. Ardından otomatik olarak syntax kontrolü yap
ve mümkün olan testleri çalıştır. Hata bulursan kendin düzelt. Son olarak
GitHub'a hazır, çalışan bir sürüm bırak.
C. GitHub'a değişiklik uygularken
Değişiklikleri mevcut GitHub reposundaki doğru dosyalara uygula. Yeni
dosya gerekiyorsa oluştur. Gereksiz dosyalara dokunma. Değişikliklerden
sonra git diff ile neyin değiştiğini göster.
D. Deploy öncesi kontrol
Deploy etmeden önce projeyi kontrol et. JavaScript syntax hatalarını,
eksik dosyaları, import hatalarını, environment variable eksikliklerini
ve Supabase bağlantılarını kontrol et. Bulduğun hataları düzeltmeden
deploy etme.
E. Özellik paketi (birden fazla alt-özelliği tek görev olarak vermek için)
[Sistem adı] paketini tamamla. Kapsam:
- [alt özellik 1]
- [alt özellik 2]
- [alt özellik 3]
...

Bunları tek bir geliştirme görevi olarak ele al: önce mimariyi incele,
sonra sırayla uygula, her adımdan sonra kontrol et, en sonunda bana
tamamlanan ve varsa eksik kalan kısımları özetle.
Örnek dolu kullanım — "Hizmet sağlayıcı talep sistemi" paketi:
Hizmet sağlayıcı talep sistemi paketini tamamla. Kapsam:
- Yeni talep bildirimi
- Acil talep animasyonu
- Mesafeye göre sıralama
- Talep detay ekranı
- Kabul et / Reddet akışı
- Talep durumları
- Realtime güncelleme
- Mobil görünüm
- Hata kontrolü
F. Bağlı araçları amacına göre kullandırma
Connector'ları açık bırak, ama Claude'a hangi aracı ne için kullanacağını netleştir:
GitHub'ı kod/repo işlemleri için, Supabase'i database/edge function
işlemleri için, Render'ı deployment/log kontrolü için kullan. Ekran
görüntüsü istemeden önce, bağlı araçlardan doğrudan kontrol edebiliyorsan
onu kullan.
