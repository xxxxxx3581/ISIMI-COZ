/* A7 — Reusable voice-to-text helper V1
   Adds an optional microphone control to textareas without changing submit flows. */
(()=>{
  if(window.__A7_VOICE_INPUT_V1__) return;
  window.__A7_VOICE_INPUT_V1__=1;

  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SpeechRecognition) return;

  const STYLE_ID='a7VoiceInputStyle';
  if(!document.getElementById(STYLE_ID)){
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent='.a7VoiceWrap{position:relative;width:100%}.a7VoiceWrap>textarea{padding-right:52px!important}.a7VoiceBtn{position:absolute;right:9px;top:9px;width:34px;height:34px;border:1px solid var(--line,#29415d);border-radius:10px;background:var(--card2,#122338);color:var(--text,#f1f5f9);display:grid;place-items:center;padding:0;z-index:2;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.16)}.a7VoiceBtn svg{width:18px;height:18px}.a7VoiceBtn.isListening{background:var(--primary,#14b87a);color:#03130d;border-color:var(--primary,#14b87a);animation:a7VoicePulse 1.15s ease-in-out infinite}.a7VoiceStatus{font-size:11px;color:var(--muted,#94a8bd);margin-top:5px;min-height:15px}.a7VoiceStatus.isLive{color:var(--primary,#14b87a);font-weight:800}@keyframes a7VoicePulse{50%{transform:scale(1.06);box-shadow:0 0 0 5px rgba(20,184,122,.12)}}';
    document.head.appendChild(s);
  }

  function setup(ta){
    if(!ta||ta.dataset.a7VoiceReady==='1'||ta.disabled||ta.readOnly) return;
    ta.dataset.a7VoiceReady='1';
    const wrap=document.createElement('div');
    wrap.className='a7VoiceWrap';
    ta.parentNode.insertBefore(wrap,ta);
    wrap.appendChild(ta);
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='a7VoiceBtn';
    btn.setAttribute('aria-label','Sesli anlat');
    btn.title='Sesli anlat';
    btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M6.5 11a5.5 5.5 0 0 0 11 0M12 16.5V21M8.5 21h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    wrap.appendChild(btn);
    const status=document.createElement('div');
    status.className='a7VoiceStatus';
    status.setAttribute('aria-live','polite');
    wrap.appendChild(status);

    let recognition=null;
    let listening=false;
    let baseText='';
    let finalText='';

    const setState=(live,msg)=>{
      listening=live;
      btn.classList.toggle('isListening',live);
      btn.setAttribute('aria-label',live?'Dinlemeyi durdur':'Sesli anlat');
      btn.title=live?'Dinlemeyi durdur':'Sesli anlat';
      status.classList.toggle('isLive',live);
      status.textContent=msg||'';
    };

    btn.addEventListener('click',(e)=>{
      e.preventDefault();
      e.stopPropagation();
      if(listening){try{recognition&&recognition.stop()}catch(_){}return;}
      try{
        recognition=new SpeechRecognition();
        recognition.lang='tr-TR';
        recognition.continuous=false;
        recognition.interimResults=true;
        baseText=ta.value.trim();
        finalText='';
        setState(true,'Dinliyorum… konuşabilirsin.');
        recognition.onresult=(event)=>{
          let interim='';
          for(let i=event.resultIndex;i<event.results.length;i++){
            const text=event.results[i][0]?.transcript||'';
            if(event.results[i].isFinal) finalText+=text+' ';
            else interim+=text;
          }
          const spoken=(finalText+interim).trim();
          const combined=baseText?(baseText+(spoken?' '+spoken:'')):spoken;
          ta.value=combined;
          ta.dispatchEvent(new Event('input',{bubbles:true}));
        };
        recognition.onend=()=>{
          setState(false,finalText.trim()?'Ses metne dönüştürüldü.':'');
          recognition=null;
        };
        recognition.onerror=(event)=>{
          const msg=event.error==='not-allowed'?'Mikrofon izni verilmedi.':event.error==='no-speech'?'Ses algılanamadı.':'Sesli giriş başlatılamadı.';
          setState(false,msg);
          recognition=null;
        };
        recognition.start();
      }catch(err){
        console.warn('A7 voice input:',err);
        setState(false,'Sesli giriş bu cihazda başlatılamadı.');
      }
    });
  }

  function scan(){
    document.querySelectorAll('textarea').forEach(setup);
  }
  const observer=new MutationObserver(scan);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
})();
