from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# 1) Track explicit real-world official transaction state separately from preparation status.
s = s.replace(
"const H={step:0,answers:{},caseId:null,createdAt:null,dbId:null,status:null,module:null,kurumFlowId:null,documents:{},documentStatuses:{},documentFiles:{},caseSteps:[]};",
"const H={step:0,answers:{},caseId:null,createdAt:null,dbId:null,status:null,module:null,kurumFlowId:null,documents:{},documentStatuses:{},documentFiles:{},caseSteps:[],officialTransactionStatus:'not_completed'};"
)

# Initialize the separate state whenever a property-preparation flow starts.
s = s.replace(
"H.module='prop'; H.propFlowId=id; H.kurumFlowId=null; H.step=0; H.answers={}; H.documents={}; H.documentStatuses={}; H.documentFiles={}; H.caseId=null; H.dbId=null; H.createdAt=null; H.status='draft'; H.caseSteps=[];",
"H.module='prop'; H.propFlowId=id; H.kurumFlowId=null; H.step=0; H.answers={}; H.documents={}; H.documentStatuses={}; H.documentFiles={}; H.caseId=null; H.dbId=null; H.createdAt=null; H.status='draft'; H.caseSteps=[]; H.officialTransactionStatus='not_completed';"
)

# Restore the explicit official status when opening a saved property file.
s = s.replace(
"H.answers=(m.answers&&typeof m.answers==='object')?m.answers:{}; H.documents=(m.documents&&typeof m.documents==='object')?m.documents:{}; H.documentStatuses={}; H.documentFiles={}; H.caseSteps=[];",
"H.answers=(m.answers&&typeof m.answers==='object')?m.answers:{}; H.documents=(m.documents&&typeof m.documents==='object')?m.documents:{}; H.documentStatuses={}; H.documentFiles={}; H.caseSteps=[]; H.officialTransactionStatus=m.official_transaction_status||'not_completed';",
1
)

# Persist the separate state in property preparation files.
s = s.replace(
"disclaimer:f.disclaimer\n   }\n  };",
"disclaimer:f.disclaimer,\n   official_transaction_status:H.officialTransactionStatus||'not_completed'\n   }\n  };",
1
)

# Add explicit official-transaction confirmation action before the dispatcher.
marker = "function dispatch(a,e){"
if "function markOfficialTransactionCompleted()" not in s:
    insert = r'''async function markOfficialTransactionCompleted(){
 const session=getAuthSession();
 if(!session?.access_token||!session?.user?.id){openAuthModal('login');return;}
 if(!H.dbId){alert('Önce işlem dosyasını kaydetmelisin.');return;}
 if(!confirm('Gerçek resmî işlemi gerçekten tamamladığını onaylıyor musun?\n\nBu onay yalnızca dosya takibi içindir; İşini Hallet resmî işlemi doğrulamaz.'))return;
 H.officialTransactionStatus='completed_by_user';
 try{
  const current=await supabaseAuthRequest('GET','hallet_cases?select=metadata&id=eq.'+encodeURIComponent(H.dbId)+'&limit=1');
  const meta=(Array.isArray(current)&&current[0]&&current[0].metadata&&typeof current[0].metadata==='object')?current[0].metadata:{};
  meta.official_transaction_status='completed_by_user';
  meta.official_transaction_confirmed_at=new Date().toISOString();
  const rows=await supabaseAuthRequest('PATCH','hallet_cases?id=eq.'+encodeURIComponent(H.dbId),{metadata:meta,updated_at:new Date().toISOString()});
  if(!Array.isArray(rows)||!rows.length)throw new Error('Resmî işlem durumu kaydedilemedi.');
  propResult(true);
 }catch(e){
  H.officialTransactionStatus='not_completed';
  console.error('Resmî işlem durumu kaydedilemedi:',e);
  alert('Resmî işlem durumu kaydedilemedi.\n\n'+(e&&e.message?e.message:'Bilinmeyen hata'));
 }
}
'''
    s = s.replace(marker, insert + "\n" + marker, 1)

# Route the new action.
s = s.replace(
"if(a==='completecase')return markCaseCompleted();",
"if(a==='completecase')return markCaseCompleted();if(a==='official_complete')return markOfficialTransactionCompleted();",
1
)

# Replace only the property result renderer with the corrected semantics.
start = s.index('function propResult(fromSaved){')
end = s.index('\nfunction propPrint(){', start)
old = s[start:end]
new = r'''function propResult(fromSaved){
 const f=getPropFlow(H.propFlowId)||{title:'Taşınmaz hazırlığı',disclaimer:'',official:[]};
 const a=H.answers||{};
 const docs=getPropDocumentChecklist(a);
 const uploadedDocs=docs.filter(d=>getDocumentFiles(d.key).length>0);
 const readyDocs=docs.filter(d=>getDocumentFiles(d.key).length>0 || H.documents[d.key]===true);
 const missingDocs=docs.filter(d=>d.required!==false && !readyDocs.some(x=>x.key===d.key));
 const docState={total:docs.length,ready:readyDocs.length,uploaded:uploadedDocs.length,percent:docs.length?Math.round(readyDocs.length/docs.length*100):0,complete:docs.length>0&&missingDocs.length===0,missing:missingDocs};
 const steps=H.caseSteps&&H.caseSteps.length?H.caseSteps:defaultCaseSteps();
 const stepState=stepSummary();
 const isPreparationCompleted=H.status==='completed';
 const officialDone=H.officialTransactionStatus==='completed_by_user';
 const canComplete=!isPreparationCompleted&&docState.complete&&(stepState.done||0)>=(stepState.total||5)&&(stepState.total||0)>0;
 const answerLabel=(q,val)=>{if(val==null||String(val).trim()==='')return '—';if(q&&q.options){const hit=q.options.find(o=>o[0]===val);if(hit)return hit[1];}return String(val);};
 let paper='<div class="evrakPaper" id="evrakPrintArea"><h3 style="margin-top:0;text-align:center">'+esc(f.title)+'</h3><p style="text-align:center">Hazırlık / bilgilendirme dosyası — resmî belge veya sözleşme yerine geçmez</p><h4 style="margin:14px 0 8px">İşlem bilgileri</h4>';
 (f.questions||[]).forEach(q=>{paper+='<p><strong>'+esc(q.title)+':</strong> '+esc(answerLabel(q,a[q.key]))+'</p>';});
 paper+='<h4 style="margin:14px 0 8px">Belgeler</h4>'+(docs.length?docs.map(d=>'<p><strong>'+esc(d.title)+'</strong>: '+(getDocumentFiles(d.key).length?'Yüklendi':(H.documents[d.key]===true?'Hazır olarak işaretlendi':'Eksik / bekleniyor'))+'</p>').join(''):'<p>Belge listesi yok.</p>');
 paper+='<p style="font-size:12px;margin-top:18px">'+esc(f.disclaimer)+'</p></div>';
 const docHtml=docs.map(d=>{
   const files=getDocumentFiles(d.key), uploaded=files.length>0, checked=!!H.documents[d.key];
   const statusLabel=uploaded?'✓ Yüklendi':(checked?'✓ Hazır olarak işaretlendi':'○ Eksik / bekleniyor');
   return '<div class="docItem"><input type="checkbox" data-a="prop_doc" data-k="'+esc(d.key)+'" '+(checked?'checked':'')+'><span style="flex:1"><strong>'+esc(d.title)+'</strong>'+(d.required?' · gerekli':' · opsiyonel')+'<br><span class="hm">'+esc(d.reason||'')+'</span><br><span class="docStatus"><span class="'+(uploaded||checked?'ok':'warn')+'">'+statusLabel+'</span></span>'+(files.length?'<div style="margin-top:9px;display:grid;gap:7px">'+files.map((file,i)=>'<div style="display:flex;flex-direction:column;gap:6px;padding:8px;border:1px solid #29464d;border-radius:10px;background:#0e2025;width:100%;max-width:100%;box-sizing:border-box;overflow:hidden"><div style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:1.3">📄 '+esc(file.name||('Belge '+(i+1)))+'</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;width:100%;box-sizing:border-box"><button type="button" class="docActBtn" data-a="openDoc" data-k="'+esc(d.key)+'" data-i="'+i+'" style="display:block;width:100%;min-width:0;max-width:100%;box-sizing:border-box;text-align:center;padding:10px 4px;margin:0;border:1px solid #3d6b63;background:#0e5c53;color:#fff;border-radius:10px;font:700 12px Arial,sans-serif">Görüntüle</button><button type="button" class="docActBtn" data-a="deleteDoc" data-k="'+esc(d.key)+'" data-i="'+i+'" style="display:block;width:100%;min-width:0;max-width:100%;box-sizing:border-box;text-align:center;padding:10px 4px;margin:0;border:1px solid #8a4a4a;background:#6b2a2a;color:#fff;border-radius:10px;font:700 12px Arial,sans-serif">Sil</button></div></div>').join('')+'</div>':'')+'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:9px"><label style="display:inline-flex;align-items:center;gap:7px;margin:0;padding:8px 10px;border:1px solid #35535a;border-radius:10px;background:#10252b;color:#fff;font:700 12px Arial,sans-serif;cursor:pointer">📎 Belge ekle<input type="file" data-upload-doc="'+esc(d.key)+'" accept="application/pdf,image/*" style="display:none"></label></div></span></div>';
 }).join('');
 const stepHtml=steps.map((st,i)=>'<div class="li" style="display:flex;gap:10px;align-items:flex-start"><span>'+(st.status==='completed'?'✅':(i+1)+'.')+'</span><span style="flex:1"><strong>'+esc(st.title)+'</strong><br><span class="hm">'+esc(st.description||'')+'</span></span><button type="button" class="topb" data-a="stepToggle" data-k="'+esc(st.step_key||st.key)+'">'+(st.status==='completed'?'Geri al':'Tamamla')+'</button></div>').join('');
 const off=(f.official||[]).map(o=>'<a class="hb" href="'+esc(o.url)+'" target="_blank" rel="noopener noreferrer">'+esc(o.label)+' →</a>').join('');
 const preparationLabel=isPreparationCompleted?'🟢 Hazırlık dosyası tamamlandı':(canComplete?'🟢 Hazırlık için tüm koşullar sağlandı':'🟡 Hazırlık devam ediyor');
 const officialLabel=officialDone?'<span class="ok">🟢 Kullanıcı tarafından tamamlandı olarak onaylandı</span>':'<span class="warn">🟡 Henüz tamamlanmadı</span>';
 render(top(fromSaved?'cases':'tasinmaz')+'<div class="hc"><div class="hk">'+esc(f.title)+'</div><h1>İşlem dosyası</h1><p class="hm">Bu ekran hazırlık dosyanı takip eder. <strong>Resmî satış / tescil burada otomatik olarak tamamlanmış sayılmaz.</strong></p><div class="hl"><div class="li"><strong>Dosya no:</strong> '+esc(H.caseId||'—')+'</div><div class="li"><strong>Hazırlık adımları:</strong> '+stepState.done+' / '+stepState.total+' ('+stepState.percent+'%)</div><div class="li"><strong>Yüklenen belgeler:</strong> '+docState.uploaded+' / '+docState.total+' ('+docState.percent+'% hazır)</div><div class="li"><strong>Hazırlık dosyası durumu:</strong> '+preparationLabel+'</div><div class="li"><strong>Resmî işlem durumu:</strong> '+officialLabel+'<br><span class="hm small">İşini Hallet resmî kurum sistemindeki işlemi doğrulamaz. Bu alan yalnızca senin açık onayını kaydeder.</span></div></div><h2>İşlem bilgileri</h2><div class="hl">'+(f.questions||[]).map(q=>'<div class="li"><strong>'+esc(q.title)+'</strong><br><span class="hm">'+esc(answerLabel(q,a[q.key]))+'</span></div>').join('')+'</div><h2>Belgeler</h2><p class="hm small">Belgeleri buradan PDF veya görsel olarak yükleyebilirsin. Yüklemek gerçek dosya kaydı oluşturur; yalnızca işaretlemek belge yüklemek anlamına gelmez.</p><div class="hl">'+docHtml+'</div><div class="li"><strong>Gerekli belgeler:</strong> '+(missingDocs.length?'<span class="warn">Eksik — '+esc(missingDocs.map(d=>d.title).join(', '))+'</span>':'<span class="ok">✓ Tamam</span>')+'</div><h2>İşlem adımları</h2><p class="hm small">Bunlar <strong>hazırlık adımlarıdır</strong>; 5/5 olması resmî satışın gerçekleştiği anlamına gelmez.</p><div class="hl">'+stepHtml+'</div><h2>Resmî kanal</h2><p class="hm small">Resmî tescil, sözleşme veya başvuru ilgili kurumun kendi kanalında tamamlanır.</p><div class="hg">'+off+'</div>'+(!officialDone?'<div class="li" style="margin-top:12px;border:1px solid #35535a;border-radius:12px;padding:12px;background:#0d2025"><strong>Resmî işlemi gerçekten tamamladıysan</strong><br><span class="hm">Bunu yalnızca senin açık onayınla dosyaya kaydediyoruz.</span><div class="hg" style="margin-top:10px"><button class="hb" data-a="official_complete">🟢 İşlemimi tamamladım</button></div></div>':'<div class="li" style="margin-top:12px;border:1px solid #2f6f4e;border-radius:12px;padding:12px;background:#0f2a1c"><strong class="ok">🟢 Resmî işlem durumu: Kullanıcı onayladı</strong><br><span class="hm">Bu işaret yalnızca dosya takibidir; kurum kaydı doğrulaması değildir.</span></div>')+(canComplete?'<div class="li" style="margin-top:12px;border:1px solid #2f6f4e;border-radius:12px;padding:12px;background:#0f2a1c"><strong class="ok">✓ Hazırlık tamamlanabilir</strong><br><span class="hm">Tüm hazırlık adımları ve gerekli belge durumları tamamlandı. Bu, resmî satışın tamamlandığı anlamına gelmez.</span><div class="hg" style="margin-top:10px"><button class="hb hp" data-a="completecase">✓ Hazırlık dosyasını tamamlandı işaretle</button></div></div>':'')+(isPreparationCompleted?'<div class="li"><span class="ok">✓</span> <strong>Hazırlık dosyası tamamlandı.</strong><br><span class="hm">Resmî işlem durumu yukarıdaki ayrı alanda tutulur.</span></div>':'')+'<div class="hg" style="margin-top:14px"><button class="hb hp" data-a="prop_save">DOSYAYI KAYDET</button><button class="hb" data-a="prop_print">🖨️ PDF olarak kaydet / Yazdır</button><button class="hb" data-a="prop_whatsapp">WhatsApp’ta paylaş</button><button class="hb" data-a="cases">← İşlem Dosyalarıma dön</button></div>'+paper+'<p class="hm small">PDF yazdırma penceresinden “PDF olarak kaydet” seçilebilir. WhatsApp paylaşımında belge dosyasının kendisi gönderilmez; dosya özeti paylaşılır.</p></div>');
}
'''
s = s[:start] + new + s[end:]

# Ensure the reset action clears the separate state.
s = s.replace(
"H.caseId=null;H.dbId=null;H.status=null;H.module=null;H.kurumFlowId=null;H.caseSteps=[];return gate()",
"H.caseId=null;H.dbId=null;H.status=null;H.module=null;H.kurumFlowId=null;H.caseSteps=[];H.officialTransactionStatus='not_completed';return gate()",
1
)

p.write_text(s, encoding='utf-8')
print('patched index.html')
