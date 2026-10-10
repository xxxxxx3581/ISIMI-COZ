// Özüne Dön test düzeneği: PF.rpc / PF.get sahte; ağ dışa kapalı
const { chromium } = require(process.env.PLAYWRIGHT_PATH||'/opt/node-tools/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'../..');
const IMG='images/home/market.jpg';
/* fotoğraflı ürünler: https adresi (httpsUrl yalnız https kabul eder); route ile assets/oz-cat'ten verilir */
const PHOTO='https://img.test/bal-recel.jpg',PHOTO2='https://img.test/recel.jpg';
/* repo kökünü sunan küçük statik sunucu (BASE verilmezse) */
let BASE=process.env.BASE||'';
function serve(){return new Promise(res=>{const MT={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.webp':'image/webp'};
 const sv=http.createServer((q,r)=>{const f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));if(!f.startsWith(ROOT)){r.statusCode=403;return r.end()}
  fs.readFile(f,(e,b)=>{if(e){r.statusCode=404;return r.end()}r.setHeader('content-type',MT[path.extname(f)]||'application/octet-stream');r.end(b)})});
 sv.listen(0,'127.0.0.1',()=>{BASE='http://127.0.0.1:'+sv.address().port;res(sv)})})}
function fixtures(o){o=o||{};
 const SET=Object.assign({market_enabled:false,market_open:true,seller_signup_enabled:true,orders_enabled:true,payment_mock:true,cod:true,return_days:14,min_order_kurus:0,is_admin:true,my_seller:{id:'s1',status:'approved'}},o.set||{});
 const cats=[{id:'c1',slug:'zeytinyagi',name:'Zeytinyağı',image_url:IMG,perishable:false},{id:'c2',slug:'bal',name:'Bal',image_url:null,perishable:false},{id:'c3',slug:'peynir',name:'Peynir',image_url:IMG,perishable:true}];
 const card=(i)=>({id:'p'+i,name:['Erken hasat soğuk sıkım zeytinyağı','Çam balı','Ezine peyniri','Kekik'][i%4]+' '+i,image:i%3===1?PHOTO:i%3?IMG:null,images:i===1?[PHOTO,PHOTO2]:i%3===1?[PHOTO]:[],origin_city:['Ayvalık','Muğla','Çanakkale','Denizli'][i%4],rating_avg:4.3,rating_count:12+i,category:cats[i%3].slug,seller_id:'s'+(i%2+1),seller_name:i%2?'Ege Bahçesi':'Yayla Üreticileri',price_kurus:125000+i*1000,compare_at_kurus:i%2?150000:null,in_stock:i!==3});
 const cards=[0,1,2,3,4,5].map(card);
 const sellers=[{id:'s1',display_name:'Yayla Üreticileri',slug:'yayla',city:'Muğla',district:'Ula',logo_url:IMG,rating_avg:4.6,rating_count:40},{id:'s2',display_name:'Ege Bahçesi',slug:'ege',city:'Ayvalık',district:null,logo_url:null,rating_avg:4.2,rating_count:8}];
 const detail={id:'p0',name:'Erken hasat soğuk sıkım zeytinyağı 0',description:'Ayvalık zeytinlerinden soğuk sıkım.',ingredients:'%100 zeytin',origin_city:'Ayvalık',origin_note:'Kendi bahçemizden',net_content:'1 L',shelf_life_days:540,storage_info:'Serin ve karanlık yerde saklayın.',allergens:['sut'],images:[IMG,IMG],organic_cert:'TR-OT-001',status:'published',rating_avg:4.5,rating_count:2,sold_count:31,category:{id:'c1',slug:'zeytinyagi',name:'Zeytinyağı'},
  variants:[{id:'v1',label:'500 ml',price_kurus:65000,compare_at_kurus:null,stock:10,weight_g:600},{id:'v2',label:'1 L',price_kurus:125000,compare_at_kurus:150000,stock:3,weight_g:1100},{id:'v3',label:'5 L',price_kurus:520000,compare_at_kurus:null,stock:0,weight_g:5200}],
  seller:{id:'s1',display_name:'Yayla Üreticileri',slug:'yayla',city:'Muğla',district:'Ula',story:'Üç kuşaktır zeytin yetiştiriyoruz.',logo_url:IMG,handling_days:2,free_ship_over_kurus:100000,rating_avg:4.6,rating_count:40},
  reviews:[{id:'r1',rating:5,comment:'Çok güzel.',seller_reply:'Teşekkürler!',created_at:'2026-09-01T10:00:00Z',name:'A. Y.'},{id:'r2',rating:4,comment:'Kargo biraz gecikti.',seller_reply:null,created_at:'2026-09-03T10:00:00Z',name:'M. K.'}],
  questions:[{id:'q1',question:'Asit oranı nedir?',answer:'%0,3',created_at:'2026-09-02T10:00:00Z'},{id:'q2',question:'Teneke var mı?',answer:null,created_at:'2026-09-04T10:00:00Z'}],is_favorite:false};
 const quote=(items)=>{const its=(items||[]).map(x=>{const v=detail.variants.find(y=>y.id===x.variant_id)||detail.variants[0];return {variant_id:v.id,product_id:'p0',name:detail.name,label:v.label,image:IMG,unit_price_kurus:v.price_kurus,qty:x.qty,line_total_kurus:v.price_kurus*x.qty,stock:v.stock,issue:v.stock<x.qty?'Stokta '+v.stock+' adet var':null}});const sub=its.reduce((n,x)=>n+x.line_total_kurus,0);
   return {groups:its.length?[{seller_id:'s1',seller_name:'Yayla Üreticileri',handling_days:2,items:its,subtotal_kurus:sub,shipping_kurus:sub>=100000?0:4990,total_kurus:sub+(sub>=100000?0:4990),weight_g:1100}]:[],subtotal_kurus:sub,shipping_kurus:sub>=100000?0:4990,total_kurus:sub+(sub>=100000?0:4990),issues:its.filter(x=>x.issue).map(x=>({variant_id:x.variant_id,message:x.issue}))}};
 const order={id:'o1',order_no:'OZ-1001',seller_id:'s1',status:o.orderStatus||'shipped',total_kurus:129990,subtotal_kurus:125000,shipping_fee_kurus:4990,payment_method:'mock',payment_status:'paid',carrier:'Yurtiçi Kargo',tracking_no:'123456',tracking_url:'https://example.com/t/123456',note:'Zile basmayın',created_at:'2026-10-01T10:00:00Z',ship_to:{title:'Ev',recipient:'Ali Veli',phone:'05321234567',city:'İzmir',district:'Bornova',neighborhood:'Kazımdirik',address_line:'100. Sk. No:5',postal_code:'35100'}};
 const items=[{id:'oi1',product_id:'p0',variant_id:'v2',name:detail.name,label:'1 L',image:IMG,unit_price_kurus:125000,qty:1,line_total_kurus:125000}];
 const R={
  oz_public_settings:SET,
  oz_home:{open:true,categories:cats,newest:cards,popular:cards.slice(0,4),sellers},
  oz_search_products:cards,oz_product_detail:detail,oz_quote:null,
  oz_producers:[Object.assign({},sellers[0],{cover_url:IMG,product_count:6,products:[{id:'p0',name:'Erken hasat zeytinyağı',image:IMG,price_kurus:125000},{id:'p2',name:'Ezine peyniri',image:null,price_kurus:89990},{id:'p4',name:'Çam balı',image:IMG,price_kurus:45000}]}),Object.assign({},sellers[1],{cover_url:null,logo_url:null,product_count:1,rating_count:0,products:[{id:'p1',name:'Çam balı 1',image:IMG,price_kurus:126000}]})],
  oz_save_address:'a9',oz_delete_address:true,
  oz_place_order:{duplicate:false,orders:[{id:'o1',order_no:'OZ-1001',seller_id:'s1',status:'awaiting_payment',total_kurus:129990}]},
  oz_mock_pay:{ok:true},oz_my_orders:[{id:'o1',order_no:'OZ-1001',status:order.status,total_kurus:129990,created_at:order.created_at,seller_name:'Yayla Üreticileri',items}],
  oz_order_detail:{order,seller_name:'Yayla Üreticileri',items,events:[{from:null,to:'new',role:'buyer',reason:null,at:'2026-10-01T10:00:00Z'},{from:'new',to:'accepted',role:'seller',reason:null,at:'2026-10-01T12:00:00Z'},{from:'packed',to:'shipped',role:'seller',reason:null,at:'2026-10-02T09:00:00Z'}],return:null,reviewed_product_ids:[],can_return:true},
  oz_transition_order:{ok:true},oz_request_return:{ok:true},oz_decide_return:{ok:true},oz_submit_review:{ok:true},oz_ask_question:'q9',oz_toggle_favorite:true,oz_my_favorites:cards.slice(0,2),oz_mark_notifications_read:true,
  oz_seller_apply:{seller_id:'s1'},oz_seller_add_document:'d9',oz_seller_delete_document:true,oz_seller_set_rates:true,oz_seller_submit:true,
  oz_product_save:'p9',oz_product_submit:true,oz_product_set_hidden:true,oz_product_delete:true,oz_variant_set_stock:true,
  oz_seller_dashboard:o.dash||{has_seller:true,status:'approved',status_reason:null,display_name:'Yayla Üreticileri',orders:{new:2,accepted:1,shipped:3},products:{published:4,pending:1},low_stock:2,open_questions:1,unreplied_reviews:1,open_returns:1},
  oz_seller_earnings:{in_progress_kurus:250000,holding_kurus:120000,available_kurus:80000,payout_pending_kurus:0,paid_kurus:500000,hold_days:7},
  oz_seller_orders:[Object.assign({},order,{status:'new',items,ship_to:order.ship_to,buyer_name:'Ali Veli',return:null}),Object.assign({},order,{id:'o2',order_no:'OZ-1002',status:'delivered',items,ship_to:order.ship_to,return:{id:'ret1',status:'requested',reason:'Hasarlı geldi',details:'Kapak kırık'}})],
  oz_reply_review:true,oz_answer_question:true,
  oz_admin_overview:{sellers_pending:2,products_pending:3,orders_open:5,returns_open:1,payouts_due_kurus:80000,gmv_kurus:1250000},
  oz_admin_settings:{oz_market_enabled:false,oz_seller_signup_enabled:true,oz_orders_enabled:true,oz_payment_mock_enabled:true,oz_cod_enabled:false,oz_return_days:14,oz_auto_deliver_days:10,oz_payout_hold_days:7,oz_unpaid_cancel_minutes:30,oz_default_ship_kurus:4990,oz_min_order_kurus:0},
  oz_admin_set_setting:true,
  oz_admin_list:(a)=>({sellers:[{id:'s1',display_name:'Yayla Üreticileri',status:'pending',city:'Muğla',created_at:'2026-09-01T10:00:00Z',owner_email:'a@b.c'}],products:[{id:'p0',name:detail.name,status:'pending',seller_name:'Yayla Üreticileri',price_kurus:125000,image:IMG,created_at:'2026-09-01T10:00:00Z'}],orders:[{id:'o1',order_no:'OZ-1001',status:'shipped',total_kurus:129990,seller_name:'Yayla',buyer_email:'x@y.z',created_at:'2026-10-01T10:00:00Z'}],returns:[{id:'ret1',order_id:'o2',order_no:'OZ-1002',status:'requested',reason:'Hasarlı',created_at:'2026-10-03T10:00:00Z'}],payouts:[{id:'po1',seller_id:'s1',seller_name:'Yayla',amount_kurus:80000,status:'pending',created_at:'2026-10-04T10:00:00Z'},{seller_id:'s2',seller_name:'Ege',available_kurus:30000}],reviews:[{id:'r1',rating:5,comment:'Güzel',product_name:'Zeytinyağı',is_hidden:false,created_at:'2026-09-01T10:00:00Z'}],questions:[{id:'q1',question:'Asit?',product_name:'Zeytinyağı',is_hidden:true,created_at:'2026-09-01T10:00:00Z'}]})[a.p_kind]||[],
  oz_admin_seller_detail:{seller:Object.assign({},sellers[0],{status:'pending',kind:'business',legal_name:'Yayla Tarım Ltd.',tax_no:'1234567890',tax_office:'Muğla',phone:'05000000000',ship_from_city:'Muğla',story:'Hikâye',handling_days:2,free_ship_over_kurus:100000,commission_bps:1000}),owner_email:'a@b.c',documents:[{id:'d1',doc_type:'tax_plate',file_name:'vergi.pdf',storage_path:'s1/x.pdf',status:'pending',mime:'application/pdf',size:12000}],rates:[{max_weight_g:2000,fee_kurus:4990},{max_weight_g:10000,fee_kurus:8990}]},
  oz_admin_review_seller:true,oz_admin_review_document:true,oz_admin_review_product:true,oz_admin_category_save:'c9',oz_admin_mark_refunded:true,oz_admin_create_payout:'po9',oz_admin_mark_payout:true,oz_admin_moderate:true,oz_admin_ops_tick:{auto_cancelled:1,auto_delivered:0,released:2},
  pf_my_roles:{is_admin:true,roles:['super']}
 };
 const T={
  oz_notifications:[{id:'n1',title:'Siparişin kargoda',body:'OZ-1001 yola çıktı.',order_id:'o1',created_at:'2026-10-02T09:00:00Z',read_at:null},{id:'n2',title:'Hoş geldin',body:null,created_at:'2026-09-01T09:00:00Z',read_at:'2026-09-01T10:00:00Z'}],
  oz_addresses:[{id:'a1',title:'Ev',recipient:'Ali Veli',phone:'05321234567',city:'İzmir',district:'Bornova',neighborhood:'Kazımdirik',address_line:'100. Sk. No:5',postal_code:'35100',is_default:true}],
  oz_seller_public:[Object.assign({},sellers[0],{story:'Üç kuşaktır zeytin yetiştiriyoruz.',cover_url:IMG,handling_days:2,free_ship_over_kurus:100000})],
  oz_sellers:[Object.assign({},sellers[0],{status:(o.dash&&o.dash.status)||'approved',kind:'business',legal_name:'Yayla Tarım Ltd.',tax_no:'1234567890',tax_office:'Muğla',phone:'05000000000',ship_from_city:'Muğla',story:'Hikâye',cover_url:IMG,handling_days:2,free_ship_over_kurus:100000,commission_bps:1000})],
  oz_seller_documents:[{id:'d1',doc_type:'tax_plate',file_name:'vergi.pdf',storage_path:'s1/x.pdf',status:'pending',created_at:'2026-09-01T10:00:00Z'}],
  oz_shipping_rates:[{id:'r1',max_weight_g:2000,fee_kurus:4990},{id:'r2',max_weight_g:10000,fee_kurus:8990}],
  oz_products:[{id:'p0',name:detail.name,status:'published',is_hidden:false,images:[IMG],category_id:'c1',description:'x',ingredients:'y',origin_city:'Ayvalık',origin_note:'',net_content:'1 L',shelf_life_days:540,storage_info:'',allergens:[],organic_cert:'',updated_at:'2026-09-01T10:00:00Z'},{id:'p1',name:'Çam balı',status:'rejected',status_reason:'Görsel net değil',is_hidden:false,images:[],category_id:'c2',updated_at:'2026-09-02T10:00:00Z'},{id:'p2',name:'Kekik',status:'draft',images:[],updated_at:'2026-09-03T10:00:00Z'}],
  oz_variants:[{id:'v1',product_id:'p0',label:'500 ml',price_kurus:65000,compare_at_kurus:null,stock:10,weight_g:600,sku:'Z500',is_active:true,sort:0},{id:'v2',product_id:'p0',label:'1 L',price_kurus:125000,compare_at_kurus:150000,stock:2,weight_g:1100,sku:'Z1',is_active:true,sort:1}],
  oz_questions:[{id:'q2',product_id:'p0',question:'Teneke var mı?',answer:null,created_at:'2026-09-04T10:00:00Z'}],
  oz_reviews:[{id:'r2',product_id:'p0',rating:4,comment:'Kargo biraz gecikti.',seller_reply:null,created_at:'2026-09-03T10:00:00Z'}],
  oz_payouts:[{id:'po1',amount_kurus:500000,status:'paid',bank_reference:'EFT-1',created_at:'2026-09-20T10:00:00Z',paid_at:'2026-09-21T10:00:00Z'}],
  oz_categories:cats
 };
 return {R,T,quote};
}
async function open(br,{w,h,logged=true,fx={},dsf=1,visible=false}={}){
 const ctx=await br.newContext({viewport:{width:w,height:h},deviceScaleFactor:dsf});
 const p=await ctx.newPage();const st={errors:[],calls:[],posts:[]};
 p.on('pageerror',e=>st.errors.push('pageerror: '+e.message));
 p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::ERR|favicon/i.test(m.text()))st.errors.push('console: '+m.text())});
 await p.route('**/*',r=>{const u=r.request().url();
  if(u.startsWith('http://127.0.0.1'))return r.continue();
  if(u.startsWith('https://img.test/'))return r.fulfill({status:200,contentType:'image/jpeg',body:fs.readFileSync(path.join(ROOT,'assets/oz-cat',u.split('/').pop()))});
  if(u.includes('/storage/v1/object/sign/'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({signedURL:'/object/sign/oz-docs/x?token=t'})});
  if(u.includes('/storage/v1/object/')){st.posts.push(u);return r.fulfill({status:200,contentType:'application/json',body:'{"Key":"x"}'})}
  if(u.includes('rest/v1'))return r.fulfill({status:200,contentType:'application/json',body:'[]'});
  return r.fulfill({status:200,body:''});});
 await p.addInitScript(([logged,visible])=>{const n=Math.floor(Date.now()/1000);
  if(logged)localStorage.setItem('isimi_coz_auth_session',JSON.stringify({access_token:'t',refresh_token:'r',expires_at:n+3600,user:{id:'00000000-0000-0000-0000-000000000001',email:'test@ornek.com'}}));
  if(!visible)Object.defineProperty(document,'hidden',{get:()=>true});},[logged,visible]);
 if(!BASE)await serve();await p.goto(BASE+'/index.html');await p.waitForTimeout(1200);
 const F=fixtures(fx);
 await p.exposeFunction('__ozLog',(fn,a)=>{st.calls.push([fn,a])});
 const Rs={};for(const k in F.R)if(typeof F.R[k]!=='function')Rs[k]=F.R[k];
 const lists={};['sellers','products','orders','returns','payouts','reviews','questions'].forEach(k=>lists[k]=F.R.oz_admin_list({p_kind:k}));
 await p.evaluate(({R,T,lists})=>{
  const R2=Object.assign({},R);
  // fonksiyon alanları serileşmez: oz_admin_list / oz_quote yeniden kur
  window.__OZ_FX={R:R2,T,lists};
  window.__OZ_FX.quote=function(items){const D=R2.oz_product_detail;const its=(items||[]).map(x=>{const v=D.variants.find(y=>y.id===x.variant_id)||D.variants[0];return {variant_id:v.id,product_id:D.id,name:D.name,label:v.label,image:D.images[0],unit_price_kurus:v.price_kurus,qty:x.qty,line_total_kurus:v.price_kurus*x.qty,stock:v.stock,issue:v.stock<x.qty?('Stokta '+v.stock+' adet var'):null}});const sub=its.reduce((n,x)=>n+x.line_total_kurus,0);const sh=sub>=100000||!sub?0:4990;return {groups:its.length?[{seller_id:'s1',seller_name:'Yayla Üreticileri',handling_days:2,items:its,subtotal_kurus:sub,shipping_kurus:sh,total_kurus:sub+sh,weight_g:1100}]:[],subtotal_kurus:sub,shipping_kurus:sh,total_kurus:sub+sh,issues:its.filter(x=>x.issue).map(x=>({variant_id:x.variant_id,message:x.issue}))}};
  const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
  window.PF=window.PF||{};
  window.PF.rpc=async function(fn,args){window.__ozLog(fn,args||{});await new Promise(r=>setTimeout(r,20));
   const F=window.__OZ_FX;if(F.fail&&F.fail[fn]){const x=F.fail[fn];const e=new Error(typeof x==='string'?x:x.message);if(typeof x==='object'){e.code=x.code;e.status=x.status}throw e}
   if(fn==='oz_admin_list'){const L=F.lists||{};return clone(L[args.p_kind]||[])}
   if(fn==='oz_quote')return clone(F.quote(args.p_items));
   if(!(fn in F.R)){const e=new Error('Could not find the function public.'+fn);e.code='PGRST202';throw e}
   return clone(F.R[fn])};
  window.PF.get=async function(path){window.__ozLog('GET '+path.split('?')[0],path);const t=path.split('?')[0];if(/iban=not.is.null/.test(path))return clone((window.__OZ_FX.T.__ibanIds||[]).map(id=>({id})));return clone(window.__OZ_FX.T[t]||[])};
 },{R:Rs,T:F.T,lists});
 return {ctx,p,st};
}
async function overflow(p){return p.evaluate(()=>{const se=document.scrollingElement;return se.scrollWidth-se.clientWidth})}
async function enter(p){await p.evaluate(()=>showHome());await p.waitForTimeout(500);await p.click('.hmTile[data-k=market]');await p.waitForTimeout(1200)}
module.exports={chromium,open,overflow,enter,fixtures,serve};
