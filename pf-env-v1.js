/* Supabase adres/anahtarı tek yerde. Bugün her ortam TEST projesine bağlanır.
   LIVE kurulum gününde doldurulur; yalnız url + key dolu VE sayfa hosts listesindeki bir alan adındaysa LIVE kullanılır.
   Anahtar publishable (genel) anahtardır; gizli (service_role) anahtar buraya YAZILMAZ. */
window.PF_ENV = (function(){
  var TEST = {url:'https://zvffspbowdzvrrzefhkr.supabase.co', key:'sb_publishable_L_qb9Q4fHktE51PEqEhTAg_O4R0eDiW'};
  var LIVE = {url:'', key:'', hosts:[]};   // kurulum gününde doldurulacak; şimdi BOŞ
  var h = location.hostname;
  var useLive = !!(LIVE.url && LIVE.key && LIVE.hosts.indexOf(h) > -1);
  var e = useLive ? LIVE : TEST;
  return {url:e.url, key:e.key, live:useLive};
})();
