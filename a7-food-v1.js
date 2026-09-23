(()=>{
if(window.__A7_FOOD_V1__)return;window.__A7_FOOD_V1__=1;
const K='isimi_food_cart_v1';
const E=v=>typeof escapeHTML==='function'?escapeHTML(v):String(v??'');
const M=n=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format((+n||0)/100);
const S=()=>typeof getAuthSession==='function'?getAuthSession():null;
const A=()=>{const s=S();if(!s?.access_token){openAuthModal?.('login');return null}return s};
const Q=(m,p,b=null)=>window.supabaseAuthRequest(m,p,b);
const C=()=>{try{return JSON.parse(localStorage.getItem(K)||'null')||{venue:null,items:[]}}catch(e){return{venue:null,items:[]}}};
const SAVE=c=>localStorage.setItem(K,JSON.stringify(c));
const CLEAR=()=>localStorage.removeItem(K);
const CNT=()=>C().items.reduce((n,x)=>n+(+x.quantity||0),0);
const SUM=()=>C().items.reduce((n,x)=>n+(+x.line_total_kurus||0),0);
const ST={
  new:'🟠 Sipariş alındı',
  accepted:'🟠 Onaylandı',
  preparing:'🟠 Hazırlanıyor',
  ready:'🟡 Hazır',
  on_the_way:'🟠 Yolda',
  delivered:'🟢 Teslim edildi',
  cancelled:'⚪ İptal'
};
const NEXT={
  new:[['accepted','Onayla'],['cancelled','İptal']],
  accepted:[['preparing','Hazırla'],['cancelled','İptal']],
  preparing:[['ready','Hazır'],['cancelled','İptal']],
  ready:[['on_the_way','Yola çıktı'],['delivered','Teslim'],['cancelled','İptal']],
  on_the_way:[['delivered','Teslim'],['cancelled','İptal']]
};

function css(){
  if(document.getElementById('a7FoodCss'))return;
  const s=document.createElement('style');s.id='a7FoodCss';
  s.textContent=[
    '.foodBrand{display:flex;align-items:center;gap:9px;margin:0 0 10px;padding:7px 10px;border-radius:12px;border:1px solid rgba(245,158,11,.4);background:rgba(245,158,11,.07)}',
    '.foodBrandIcon{flex:0 0 auto;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-size:15px;background:linear-gradient(145deg,#f59e0b,#ea580c);color:#fff}',
    '.foodBrandText{min-width:0;line-height:1.2;display:flex;flex-direction:column;gap:1px}',
    '.foodBrandText .fbSub{display:block!important;font-size:14px;font-weight:900;color:#d97706;letter-spacing:.02em}',
    '.foodBrandText .fbMain{display:block!important;font-size:11px;font-weight:700;color:var(--muted)}',
    '.foodShell{padding-bottom:12px}',
    '.foodTools{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}',
    '.foodTools input,.foodTools select{flex:1 1 120px;min-width:0;height:42px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--text);padding:0 12px;font:inherit}',
    '.foodChips{display:flex;gap:6px;overflow-x:auto;padding:0 0 8px;-webkit-overflow-scrolling:touch}',
    '.foodChip{flex:0 0 auto;height:34px;padding:0 12px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--text);font-weight:700;font-size:12px;cursor:pointer}',
    '.foodChip.on{border-color:rgba(245,158,11,.7);background:rgba(245,158,11,.14);color:#b45309}',
    '.foodGrid{display:grid;grid-template-columns:1fr;gap:10px}',
    '.foodVenue,.foodOrder{padding:14px;border:1px solid var(--line);border-radius:16px;background:var(--card);color:var(--text);text-align:left;width:100%;font:inherit;cursor:pointer}',
    '.foodVenue h3{margin:0 0 4px;font-size:16px}',
    '.foodMeta{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
    '.foodPill{display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:700;background:var(--v2-soft,rgba(0,0,0,.05));color:var(--muted)}',
    '.foodPill.open{background:rgba(34,160,107,.14);color:#0f9f6a}',
    '.foodPill.closed{background:rgba(148,163,184,.18);color:var(--muted)}',
    '.foodItem{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)}',
    '.foodItem:last-child{border-bottom:0}',
    '.foodAdd{width:40px;height:40px;border-radius:11px;border:1px solid var(--line);background:var(--card2,var(--card));color:var(--text);font-size:20px;cursor:pointer;flex:0 0 auto}',
    '.foodQty{display:inline-flex;align-items:center;gap:6px}',
    '.foodQty button{width:34px;height:34px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--text);font-size:16px;cursor:pointer}',
    '.foodCartBar{position:sticky;bottom:64px;z-index:10;margin-top:12px;padding:10px 12px;border:1px solid var(--line);border-radius:15px;background:var(--card);display:flex;gap:8px;align-items:center;box-shadow:0 8px 24px rgba(0,0,0,.08)}',
    '.foodCartBar button{flex:1}',
    '.foodSection{margin:14px 0 6px;font-size:14px;font-weight:900}',
    '.foodEmpty{padding:28px 14px;text-align:center;color:var(--muted);border:1px dashed var(--line);border-radius:16px}',
    '.foodActions{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}',
    '.foodActions button{min-height:36px;padding:0 10px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--text);font-weight:700;font-size:12px;cursor:pointer}',
    '.foodActions button.pri{background:var(--v2-pri,#0f9f6a);border-color:var(--v2-pri,#0f9f6a);color:var(--v2-pri-ink,#fff)}',
    '@media(min-width:720px){.foodGrid{grid-template-columns:1fr 1fr}}'
  ].join('');
  document.head.appendChild(s);
}
function foodBrandBar(){
  return '<div class="foodBrand" aria-label="İşimi Çöz Yemek"><div class="foodBrandIcon" aria-hidden="true">🍴</div><div class="foodBrandText"><span class="fbSub">Yemek</span><span class="fbMain">İşimi Çöz</span></div></div>';
}
function foodStickyCart(){
  const n=CNT();if(!n)return '';
  return '<div class="foodCartBar"><div><b>Sepet · '+n+' ürün</b><div class="small muted">'+M(SUM())+'</div></div><button type="button" class="v2Btn pri" onclick="showFoodCart()">Sepete git →</button></div>';
}

window.__foodFilter={q:'',district:'',cuisine:'',openOnly:false,delivery:''};

async function showFoodHome(){
  css();if(!A())return;setNav?.('navFood');
  app('<div class="foodShell">'+foodBrandBar()+
    '<div class="foodHero"><h1 style="margin:0 0 6px;font-size:22px">Yakınındaki yemekler</h1><p class="muted" style="margin:0 0 12px">Yerel işletmelerden keşfet, sipariş ver, takip et.</p></div>'+
    '<div class="foodTools">'+
    '<input id="foodQ" type="search" placeholder="Restoran ara" value="'+E(window.__foodFilter.q||'')+'" oninput="window.__foodFilter.q=this.value;foodLoad()">'+
    '<select id="foodDistrict" onchange="window.__foodFilter.district=this.value;foodLoad()"><option value="">Tüm ilçeler</option></select>'+
    '</div>'+
    '<div class="foodChips" id="foodChips"></div>'+
    '<div class="splitActions" style="margin-bottom:10px">'+
    '<button type="button" class="v2Btn" onclick="showFoodOrders()">📦 Siparişlerim</button>'+
    '<button type="button" class="v2Btn" onclick="showFoodBusiness()">🏪 İşletmem</button>'+
    '</div>'+
    '<div id="foodList"><div class="foodEmpty">Yükleniyor…</div></div>'+
    foodStickyCart()+
    '</div>');
  foodLoad();
}

async function foodLoad(){
  const r=document.getElementById('foodList');if(!r)return;
  try{
    const rows=await Q('GET','food_venues?select=id,name,district,city,cuisine_type,is_open,min_order_amount,delivery_mode,address_text&is_active=eq.true&order=is_open.desc,name.asc&limit=80');
    const list=Array.isArray(rows)?rows:[];
    const f=window.__foodFilter||{};
    const districts=[...new Set(list.map(x=>x.district).filter(Boolean))].sort();
    const cuisines=[...new Set(list.map(x=>x.cuisine_type).filter(Boolean))].sort();
    const sel=document.getElementById('foodDistrict');
    if(sel&&sel.options.length<=1){
      districts.forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=d;if(f.district===d)o.selected=true;sel.appendChild(o);});
    }
    const chips=document.getElementById('foodChips');
    if(chips){
      chips.innerHTML=
        '<button type="button" class="foodChip'+(f.openOnly?' on':'')+'" onclick="window.__foodFilter.openOnly=!window.__foodFilter.openOnly;foodLoad()">Açık</button>'+
        '<button type="button" class="foodChip'+(f.delivery==='self_delivery'?' on':'')+'" onclick="window.__foodFilter.delivery=(window.__foodFilter.delivery===\'self_delivery\'?\'\':\'self_delivery\');foodLoad()">Teslimat</button>'+
        '<button type="button" class="foodChip'+(f.delivery==='pickup'?' on':'')+'" onclick="window.__foodFilter.delivery=(window.__foodFilter.delivery===\'pickup\'?\'\':\'pickup\');foodLoad()">Gel-Al</button>'+
        cuisines.slice(0,8).map(c=>'<button type="button" class="foodChip'+(f.cuisine===c?' on':'')+'" onclick="window.__foodFilter.cuisine=(window.__foodFilter.cuisine===\''+E(c)+'\'?\'\':\''+E(c)+'\');foodLoad()">'+E(c)+'</button>').join('');
    }
    let filtered=list.filter(v=>{
      if(f.openOnly&&!v.is_open)return false;
      if(f.district&&v.district!==f.district)return false;
      if(f.cuisine&&v.cuisine_type!==f.cuisine)return false;
      if(f.delivery==='pickup'&&v.delivery_mode==='self_delivery')return false;
      if(f.delivery==='self_delivery'&&v.delivery_mode==='pickup')return false;
      if(f.q){
        let q=String(f.q).toLowerCase().trim();
        if(/\b(açık|acik)\b/.test(q)){ if(!v.is_open)return false; q=q.replace(/\b(açık|acik)\b/g,'').trim(); }
        if(/\b(gel\s*-?\s*al|gelal|pickup)\b/.test(q)){ if(v.delivery_mode==='self_delivery')return false; q=q.replace(/\b(gel\s*-?\s*al|gelal|pickup)\b/g,'').trim(); }
        if(/\b(teslimat|delivery)\b/.test(q)){ if(v.delivery_mode==='pickup')return false; q=q.replace(/\b(teslimat|delivery)\b/g,'').trim(); }
        const hay=[v.name,v.cuisine_type,v.district,v.city,v.address_text].join(' ').toLowerCase();
        if(q && !hay.includes(q))return false;
      }
      return true;
    });
    if(!filtered.length){
      r.innerHTML='<div class="foodEmpty">Şu anda uygun restoran bulunamadı.</div>';
      return;
    }
    r.innerHTML='<div class="foodGrid">'+filtered.map(v=>{
      const del=v.delivery_mode==='pickup'?'Gel-al':v.delivery_mode==='self_delivery'?'Teslimat':'Teslimat / Gel-al';
      const min=v.min_order_amount?('Min. '+M(v.min_order_amount)):'Min. yok';
      return '<button type="button" class="foodVenue" onclick="showFoodVenue(\''+E(v.id)+'\')">'+
        '<h3>'+E(v.name)+'</h3>'+
        '<div class="small muted">'+E([v.cuisine_type,v.district,v.city].filter(Boolean).join(' · '))+'</div>'+
        (v.address_text?'<div class="small muted" style="margin-top:4px">📍 '+E(v.address_text)+'</div>':'')+
        '<div class="foodMeta">'+
        '<span class="foodPill '+(v.is_open?'open':'closed')+'">'+(v.is_open?'🟢 Açık':'⚪ Kapalı')+'</span>'+
        '<span class="foodPill">'+E(min)+'</span>'+
        '<span class="foodPill">'+E(del)+'</span>'+
        '</div>'+
        '<div class="small" style="margin-top:10px;font-weight:800;color:var(--v2-pri,#0f9f6a)">Menüyü gör →</div>'+
        '</button>';
    }).join('')+'</div>';
  }catch(e){
    r.innerHTML='<div class="error">'+(E(e.message||'Restoranlar yüklenemedi.'))+'</div>';
  }
}

async function showFoodVenue(id){
  css();if(!A())return;
  try{
    const v=(await Q('GET','food_venues?select=id,name,district,city,cuisine_type,is_open,min_order_amount,delivery_mode,address_text,working_hours,phone&id=eq.'+encodeURIComponent(id)+'&limit=1'))?.[0];
    if(!v)throw new Error('İşletme bulunamadı.');
    const cats=await Q('GET','food_menu_categories?select=id,name,sort_order&venue_id=eq.'+encodeURIComponent(id)+'&is_active=eq.true&order=sort_order.asc,name.asc')||[];
    const items=await Q('GET','food_menu_items?select=id,category_id,name,description,price_kurus,is_available,sort_order&venue_id=eq.'+encodeURIComponent(id)+'&order=sort_order.asc,name.asc')||[];
    let h='<div class="foodShell">'+foodBrandBar()+
      '<button type="button" class="v2Btn sm" onclick="showFoodHome()">← Yemek</button>'+
      '<div class="foodHero" style="margin-top:10px"><h1 style="margin:0 0 4px">'+E(v.name)+'</h1>'+
      '<div class="foodMeta"><span class="foodPill '+(v.is_open?'open':'closed')+'">'+(v.is_open?'🟢 Açık':'⚪ Kapalı')+'</span>'+
      (v.cuisine_type?'<span class="foodPill">'+E(v.cuisine_type)+'</span>':'')+
      (v.min_order_amount?'<span class="foodPill">Min. '+M(v.min_order_amount)+'</span>':'')+
      '</div>'+
      '<div class="small muted" style="margin-top:8px">'+E([v.address_text,v.district,v.city].filter(Boolean).join(' · '))+'</div>'+
      (v.phone?'<div class="small muted">📞 '+E(v.phone)+'</div>':'')+
      '</div>';
    if(!cats.length&&!items.length){
      h+='<div class="foodEmpty">Bu restoran henüz menüsünü hazırlamadı.</div>';
    }else{
      const byCat={};
      items.forEach(it=>{const k=it.category_id||'_'; (byCat[k]=byCat[k]||[]).push(it);});
      (cats.length?cats:[{id:'_',name:'Menü'}]).forEach(c=>{
        const arr=byCat[c.id]||[];
        if(!arr.length&&c.id!=='_')return;
        h+='<div class="foodSection">'+E(c.name)+'</div>';
        if(!arr.length){h+='<div class="small muted">Bu kategoride ürün yok.</div>';return;}
        arr.forEach(i=>{
          const avail=i.is_available!==false;
          h+='<div class="foodItem"><div style="min-width:0"><b>'+E(i.name)+'</b>'+
            (i.description?'<div class="small muted">'+E(i.description)+'</div>':'')+
            '<div style="margin-top:4px"><b>'+M(i.price_kurus)+'</b>'+(avail?'':' · <span class="muted">Müsait değil</span>')+'</div></div>'+
            (avail?'<button type="button" class="foodAdd" aria-label="Sepete ekle" onclick="foodAdd(\''+E(v.id)+'\',\''+E(v.name)+'\',\''+E(i.id)+'\',\''+E(i.name)+'\','+(+i.price_kurus||0)+')">＋</button>':'')+
            '</div>';
        });
      });
      // uncategorized
      if(cats.length&&byCat['_']?.length){
        h+='<div class="foodSection">Diğer</div>';
        byCat['_'].forEach(i=>{
          const avail=i.is_available!==false;
          h+='<div class="foodItem"><div><b>'+E(i.name)+'</b><div><b>'+M(i.price_kurus)+'</b></div></div>'+
            (avail?'<button type="button" class="foodAdd" onclick="foodAdd(\''+E(v.id)+'\',\''+E(v.name)+'\',\''+E(i.id)+'\',\''+E(i.name)+'\','+(+i.price_kurus||0)+')">＋</button>':'')+'</div>';
        });
      }
    }
    h+=foodStickyCart()+'</div>';
    app(h);
  }catch(e){
    app('<div class="error">'+E(e.message||'Menü yüklenemedi.')+'</div>');
  }
}

function foodAdd(venueId,venueName,itemId,itemName,price){
  if(!A())return;
  let c=C();
  if(c.venue&&c.venue.id&&c.venue.id!==venueId&&c.items.length){
    if(!confirm('Sepette başka restorandan ürün var. Sepeti temizleyip bu restorana geçilsin mi?'))return;
    c={venue:null,items:[]};
  }
  c.venue={id:venueId,name:venueName};
  const i=c.items.find(x=>x.menu_item_id===itemId);
  if(i){i.quantity+=1;i.line_total_kurus=i.quantity*i.unit_price_kurus;}
  else c.items.push({menu_item_id:itemId,name_snapshot:itemName,unit_price_kurus:+price||0,quantity:1,line_total_kurus:+price||0});
  SAVE(c);
  try{showFoodVenue(venueId);}catch(e){}
}

function foodQty(itemId,delta){
  const c=C();
  const i=c.items.find(x=>x.menu_item_id===itemId);
  if(!i)return;
  i.quantity+=delta;
  if(i.quantity<=0)c.items=c.items.filter(x=>x.menu_item_id!==itemId);
  else i.line_total_kurus=i.quantity*i.unit_price_kurus;
  if(!c.items.length){CLEAR();showFoodHome();return;}
  SAVE(c);showFoodCart();
}

function showFoodCart(){
  css();if(!A())return;
  const c=C();
  if(!c.items.length){
    app('<div class="foodShell">'+foodBrandBar()+'<div class="foodEmpty"><b>Sepetin boş</b><div style="margin-top:8px">Restoranları keşfet ve ürün ekle.</div><button type="button" class="v2Btn pri" style="margin-top:14px" onclick="showFoodHome()">Restoranları keşfet</button></div></div>');
    return;
  }
  app('<div class="foodShell">'+foodBrandBar()+
    '<button type="button" class="v2Btn sm" onclick="showFoodVenue(\''+E(c.venue.id)+'\')">← Menü</button>'+
    '<div class="foodHero" style="margin-top:10px"><h1 style="margin:0">'+E(c.venue.name)+'</h1><p class="muted">'+CNT()+' ürün · '+M(SUM())+'</p></div>'+
    c.items.map(it=>'<div class="foodItem"><div><b>'+E(it.name_snapshot)+'</b><div class="small muted">'+M(it.unit_price_kurus)+'</div></div>'+
      '<div class="foodQty"><button type="button" onclick="foodQty(\''+E(it.menu_item_id)+'\',-1)">−</button><b>'+it.quantity+'</b><button type="button" onclick="foodQty(\''+E(it.menu_item_id)+'\',1)">＋</button></div></div>').join('')+
    '<div class="card" style="margin-top:12px">'+
    '<label>Teslimat<select id="fcMode"><option value="self_delivery">🛵 Teslimat</option><option value="pickup">📦 Gel-al</option></select></label>'+
    '<label>Telefon<input id="fcPhone" inputmode="tel" placeholder="05xx..."></label>'+
    '<label>Adres<textarea id="fcAddr" rows="2" placeholder="Teslimat adresi"></textarea></label>'+
    '<label>Not<textarea id="fcNote" rows="2" placeholder="Sipariş notu (isteğe bağlı)"></textarea></label>'+
    '<label>Ödeme<select id="fcPay"><option value="cash_on_delivery">Kapıda nakit</option><option value="card_on_delivery">Kapıda kart</option><option value="agree_with_venue">İşletme ile anlaş</option></select></label>'+
    '<div style="margin:10px 0;display:flex;justify-content:space-between"><span class="muted">Ara toplam</span><b>'+M(SUM())+'</b></div>'+
    '<div style="margin:0 0 10px;display:flex;justify-content:space-between"><span class="muted">Teslimat</span><b>'+M(0)+'</b></div>'+
    '<div style="display:flex;justify-content:space-between;font-size:16px"><span>Toplam</span><b>'+M(SUM())+'</b></div>'+
    '<button type="button" class="v2Btn pri" style="width:100%;margin-top:12px" onclick="foodOrder()">Siparişi gönder</button>'+
    '</div></div>');
}

async function foodOrder(){
  if(!A())return;
  const c=C();if(!c.items.length)return alert('Sepet boş.');
  const mode=document.getElementById('fcMode')?.value||'self_delivery';
  const phone=(document.getElementById('fcPhone')?.value||'').trim();
  const addr=(document.getElementById('fcAddr')?.value||'').trim();
  const note=(document.getElementById('fcNote')?.value||'').trim();
  const pay=document.getElementById('fcPay')?.value||'cash_on_delivery';
  if(!phone)return alert('Telefon gerekli.');
  if(mode==='self_delivery'&&!addr)return alert('Teslimat için adres gerekli.');
  try{
    const orderBody={
      venue_id:c.venue.id,
      delivery_mode:mode,
      phone:phone,
      address_text:mode==='pickup'?(addr||null):addr,
      note:note||null,
      payment_method:pay
    };
    const ord=await Q('POST','food_orders',orderBody);
    const order=Array.isArray(ord)?ord[0]:ord;
    if(!order?.id)throw new Error('Sipariş oluşturulamadı.');
    for(const it of c.items){
      await Q('POST','food_order_items',{
        order_id:order.id,
        menu_item_id:it.menu_item_id,
        quantity:it.quantity
      });
    }
    CLEAR();
    app('<div class="foodShell">'+foodBrandBar()+
      '<div class="foodEmpty" style="border-style:solid;border-color:rgba(15,159,106,.35)">'+
      '<div style="font-size:28px">✅</div><b>Siparişiniz alındı</b>'+
      '<div class="small muted" style="margin-top:8px">#'+E(String(order.id).slice(0,8).toUpperCase())+'</div>'+
      '<div style="margin-top:10px">'+M(order.total_kurus||SUM())+'</div>'+
      '<button type="button" class="v2Btn pri" style="margin-top:14px" onclick="showFoodOrders()">Siparişlerim</button>'+
      '<button type="button" class="v2Btn" style="margin-top:8px" onclick="showFoodHome()">Yemeğe dön</button>'+
      '</div></div>');
  }catch(e){alert(e.message||'Sipariş gönderilemedi.');}
}

async function showFoodOrders(){
  css();if(!A())return;
  try{
    const a=await Q('GET','food_orders?select=id,status,total_kurus,created_at,venue_id,food_venues(name)&order=created_at.desc&limit=40');
    const list=Array.isArray(a)?a:[];
    app('<div class="foodShell">'+foodBrandBar()+
      '<button type="button" class="v2Btn sm" onclick="showFoodHome()">← Yemek</button>'+
      '<h1 style="margin:12px 0 10px">📦 Siparişlerim</h1>'+
      (function(){
        if(!list.length)return '<div class="foodEmpty">Henüz sipariş yok.</div>';
        const active=list.filter(o=>!['delivered','cancelled'].includes(o.status));
        const past=list.filter(o=>['delivered','cancelled'].includes(o.status));
        const card=o=>{
          const name=o.food_venues?.name||'Restoran';
          return '<div class="foodOrder">'+
            '<div style="display:flex;justify-content:space-between;gap:8px"><b>'+E(name)+'</b><span class="foodPill">'+E(ST[o.status]||o.status)+'</span></div>'+
            '<div class="small muted" style="margin-top:6px">#'+E(String(o.id).slice(0,8).toUpperCase())+' · '+new Date(o.created_at).toLocaleString('tr-TR')+'</div>'+
            '<div style="margin-top:8px;font-weight:800">'+M(o.total_kurus)+'</div></div>';
        };
        return (active.length?'<div class="foodSection">Aktif</div>'+active.map(card).join(''):'')+(past.length?'<div class="foodSection">Geçmiş</div>'+past.map(card).join(''):'');
      })()+
      '</div>');
  }catch(e){app('<div class="error">'+E(e.message||'Siparişler yüklenemedi.')+'</div>');}
}

function showFoodBusiness(){
  css();if(!A())return;
  Q('GET','food_venues?select=id,name,is_open,district,city,phone,cuisine_type,min_order_amount&owner_user_id=eq.'+encodeURIComponent(S().user.id)+'&limit=1')
    .then(v=>{
      if(!v?.length){
        return app('<div class="foodShell">'+foodBrandBar()+
          '<button type="button" class="v2Btn sm" onclick="showFoodHome()">← Yemek</button>'+
          '<div class="card" style="margin-top:12px"><h1 style="margin-top:0">🏪 İşletme kaydı</h1>'+
          '<label>İşletme adı<input id="frName"></label>'+
          '<label>İlçe<input id="frDistrict" placeholder="Örn. Karabağlar"></label>'+
          '<label>Telefon<input id="frPhone" inputmode="tel"></label>'+
          '<label>Mutfak<input id="frCuisine" placeholder="Pide, Kebap..."></label>'+
          '<button type="button" class="v2Btn pri" style="width:100%;margin-top:10px" onclick="foodCreate()">Kaydet</button></div></div>');
      }
      const x=v[0];
      app('<div class="foodShell">'+foodBrandBar()+
        '<button type="button" class="v2Btn sm" onclick="showFoodHome()">← Yemek</button>'+
        '<div class="foodHero" style="margin-top:10px"><h1 style="margin:0 0 6px">🏪 '+E(x.name)+'</h1>'+
        '<span class="foodPill '+(x.is_open?'open':'closed')+'">'+(x.is_open?'🟢 Açık':'⚪ Kapalı')+'</span></div>'+
        '<div class="splitActions">'+
        '<button type="button" class="v2Btn" onclick="foodOpen(\''+E(x.id)+'\','+(!x.is_open)+')">'+(x.is_open?'Kapat':'Aç')+'</button>'+
        '<button type="button" class="v2Btn" onclick="foodMenu(\''+E(x.id)+'\')">📋 Menü</button>'+
        '</div>'+
        '<h2 style="margin:16px 0 8px">Gelen siparişler</h2>'+
        '<div id="foodOwnerOrders"><div class="foodEmpty">Yükleniyor…</div></div></div>');
      foodOwnerOrders(x.id);
    })
    .catch(e=>app('<div class="error">'+E(e.message||'İşletme paneli açılamadı.')+'</div>'));
}

async function foodOwnerOrders(venueId){
  const r=document.getElementById('foodOwnerOrders');if(!r)return;
  try{
    const orders=await Q('GET','food_orders?select=id,status,total_kurus,created_at,phone,address_text,note,delivery_mode&venue_id=eq.'+encodeURIComponent(venueId)+'&order=created_at.desc&limit=40')||[];
    if(!orders.length){r.innerHTML='<div class="foodEmpty">Sipariş yok.</div>';return;}
    const html=[];
    for(const o of orders){
      let items=[];
      try{items=await Q('GET','food_order_items?select=name_snapshot,quantity,line_total_kurus&order_id=eq.'+encodeURIComponent(o.id))||[];}catch(e){}
      const btns=(NEXT[o.status]||[]).map(([st,lab])=>'<button type="button" class="'+(st==='cancelled'?'':'pri')+'" onclick="foodStatus(\''+E(o.id)+'\',\''+st+'\')">'+E(lab)+'</button>').join('');
      html.push('<div class="foodOrder">'+
        '<div style="display:flex;justify-content:space-between"><b>#'+E(String(o.id).slice(0,8).toUpperCase())+'</b><span class="foodPill">'+E(ST[o.status]||o.status)+'</span></div>'+
        '<div class="small muted" style="margin-top:4px">'+new Date(o.created_at).toLocaleString('tr-TR')+' · '+E(o.delivery_mode==='pickup'?'Gel-al':'Teslimat')+'</div>'+
        '<div class="small" style="margin-top:6px">📞 '+E(o.phone||'-')+(o.address_text?' · 📍 '+E(o.address_text):'')+'</div>'+
        (o.note?'<div class="small muted">Not: '+E(o.note)+'</div>':'')+
        '<div style="margin-top:8px">'+items.map(it=>E(it.quantity)+'× '+E(it.name_snapshot)).join('<br>')+'</div>'+
        '<div style="margin-top:8px;font-weight:900">'+M(o.total_kurus)+'</div>'+
        (btns?'<div class="foodActions">'+btns+'</div>':'')+
        '</div>');
    }
    r.innerHTML=html.join('');
  }catch(e){r.innerHTML='<div class="error">'+E(e.message||'Siparişler yüklenemedi.')+'</div>';}
}

async function foodCreate(){
  const n=(document.getElementById('frName')?.value||'').trim();
  if(!n)return alert('İşletme adı gerekli.');
  try{
    await Q('POST','food_venues',{
      owner_user_id:S().user.id,
      name:n,
      district:(document.getElementById('frDistrict')?.value||'').trim()||null,
      phone:(document.getElementById('frPhone')?.value||'').trim()||null,
      cuisine_type:(document.getElementById('frCuisine')?.value||'').trim()||null,
      city:'İzmir',
      delivery_mode:'both',
      is_active:true,
      is_open:false
    });
    showFoodBusiness();
  }catch(e){alert(e.message||'Kaydedilemedi.');}
}

async function foodOpen(id,on){
  try{await Q('PATCH','food_venues?id=eq.'+encodeURIComponent(id),{is_open:!!on});showFoodBusiness();}
  catch(e){alert(e.message||'Durum değiştirilemedi.');}
}

async function foodStatus(id,s){
  try{await Q('PATCH','food_orders?id=eq.'+encodeURIComponent(id),{status:s});showFoodBusiness();}
  catch(e){alert(e.message||'Durum değiştirilemedi.');}
}

async function foodMenu(v){
  css();if(!A())return;
  try{
    const c=await Q('GET','food_menu_categories?select=id,name,is_active,sort_order&venue_id=eq.'+encodeURIComponent(v)+'&order=sort_order.asc,name.asc')||[];
    const i=await Q('GET','food_menu_items?select=id,category_id,name,description,price_kurus,is_available&venue_id=eq.'+encodeURIComponent(v)+'&order=name.asc')||[];
    const cats=Array.isArray(c)?c:[];
    const items=Array.isArray(i)?i:[];
    let h='<div class="foodShell">'+foodBrandBar()+
      '<button type="button" class="v2Btn sm" onclick="showFoodBusiness()">← İşletme</button>'+
      '<h1 style="margin:12px 0">📋 Menü yönetimi</h1>'+
      '<div class="card"><b>1) Kategori ekle</b><input id="fmCat" placeholder="Örn. Döner"><button type="button" class="v2Btn pri" style="width:100%;margin-top:8px" onclick="foodCat(\''+E(v)+'\')">Kategori kaydet</button></div>'+
      '<div class="card" style="margin-top:10px"><b>2) Ürün ekle</b>'+
      (cats.length?'':'<div class="small muted" style="margin:6px 0">Önce en az bir kategori ekle.</div>')+
      '<input id="fmName" placeholder="Ürün adı">'+
      '<input id="fmDesc" placeholder="Açıklama (isteğe bağlı)">'+
      '<input id="fmPrice" type="number" min="0" step="1" placeholder="Fiyat (TL)">'+
      '<select id="fmCatSel"><option value="">Kategori seç (zorunlu)</option>'+cats.map(x=>'<option value="'+E(x.id)+'">'+E(x.name)+'</option>').join('')+'</select>'+
      '<button type="button" class="v2Btn pri" style="width:100%;margin-top:8px" onclick="foodItemAdd(\''+E(v)+'\')">Ürün kaydet</button></div>';
    if(!cats.length) h+='<div class="foodEmpty" style="margin-top:12px">Henüz kategori yok. Önce kategori ekle.</div>';
    cats.forEach(x=>{
      const list=items.filter(z=>String(z.category_id||'')===String(x.id));
      h+='<section class="section"><h2 style="margin:14px 0 6px">'+E(x.name)+' <span class="small muted">('+list.length+')</span></h2>';
      if(!list.length) h+='<div class="small muted">Bu kategoride ürün yok.</div>';
      list.forEach(z=>{
        h+='<div class="foodItem"><div><b>'+E(z.name)+'</b><div class="small muted">'+M(z.price_kurus)+(z.is_available===false?' · Müsait değil':'')+'</div></div>'+
          '<button type="button" class="v2Btn sm" onclick="foodItemToggle(\''+E(v)+'\',\''+E(z.id)+'\','+(z.is_available===false?'true':'false')+')">'+(z.is_available===false?'Aç':'Kapat')+'</button></div>';
      });
      h+='</section>';
    });
    const orphan=items.filter(z=>!z.category_id);
    if(orphan.length){
      h+='<section class="section"><h2 style="margin:14px 0 6px">Kategorisiz <span class="small muted">('+orphan.length+')</span></h2>';
      orphan.forEach(z=>{
        h+='<div class="foodItem"><div><b>'+E(z.name)+'</b><div class="small muted">'+M(z.price_kurus)+'</div></div>'+
          (cats.length?'<select onchange="foodItemAssignCat(\''+E(v)+'\',\''+E(z.id)+'\',this.value)" style="max-width:140px"><option value="">Kategori bağla</option>'+cats.map(x=>'<option value="'+E(x.id)+'">'+E(x.name)+'</option>').join('')+'</select>':'')+
          '</div>';
      });
      h+='</section>';
    }
    app(h+'</div>');
  }catch(e){app('<div class="error">'+E(e.message||'Menü açılamadı.')+'</div>');}
}


async function foodCat(v){
  const n=(document.getElementById('fmCat')?.value||'').trim();
  if(!n)return alert('Kategori adı gir.');
  try{
    const row=await Q('POST','food_menu_categories',{venue_id:v,name:n,is_active:true});
    const ok=Array.isArray(row)?row[0]:row;
    if(!ok||!ok.id)throw new Error('Kategori kaydı dönmedi.');
    foodMenu(v);
  }catch(e){alert(e.message||'Kategori eklenemedi.');}
}

async function foodItemAdd(v){
  const name=(document.getElementById('fmName')?.value||'').trim();
  const desc=(document.getElementById('fmDesc')?.value||'').trim();
  const priceTl=Number(document.getElementById('fmPrice')?.value||0);
  const cat=(document.getElementById('fmCatSel')?.value||'').trim()||null;
  if(!name)return alert('Ürün adı gerekli.');
  if(!cat)return alert('Önce kategori seç. Kategori yoksa önce kategori ekle.');
  if(!(priceTl>=0))return alert('Geçerli fiyat gir.');
  try{
    await Q('POST','food_menu_items',{
      venue_id:v,
      category_id:cat,
      name:name,
      description:desc||null,
      price_kurus:Math.round(priceTl*100),
      is_available:true
    });
    foodMenu(v);
  }catch(e){alert(e.message||'Ürün eklenemedi.');}
}

async function foodItemToggle(v,id,to){
  try{await Q('PATCH','food_menu_items?id=eq.'+encodeURIComponent(id),{is_available:to===true||to==='true'});foodMenu(v);}
  catch(e){alert(e.message||'Güncellenemedi.');}
}

async function foodItemAssignCat(v,id,catId){
  const cat=(catId||'').trim();
  if(!cat)return;
  try{await Q('PATCH','food_menu_items?id=eq.'+encodeURIComponent(id),{category_id:cat});foodMenu(v);}
  catch(e){alert(e.message||'Kategori bağlanamadı.');}
}
window.showFoodHome=showFoodHome;
window.foodLoad=foodLoad;
window.showFoodVenue=showFoodVenue;
window.showFoodCart=showFoodCart;
window.foodAdd=foodAdd;
window.foodQty=foodQty;
window.foodOrder=foodOrder;
window.showFoodOrders=showFoodOrders;
window.showFoodBusiness=showFoodBusiness;
window.foodCreate=foodCreate;
window.foodOpen=foodOpen;
window.foodStatus=foodStatus;
window.foodMenu=foodMenu;
window.foodCat=foodCat;
window.foodItemAdd=foodItemAdd;
window.foodItemToggle=foodItemToggle;
window.foodItemAssignCat=foodItemAssignCat;
window.openFood=showFoodHome;
})();
