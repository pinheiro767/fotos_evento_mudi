'use strict';
const ITEMS = [
  {type:'poster',src:'./assets/01-whey-protein.png',title:'Whey protein e músculos',description:'Descubra como as proteínas fornecem aminoácidos que ajudam na construção e recuperação dos músculos.'},
  {type:'poster',src:'./assets/02-segundo-cerebro.png',title:'Você sabia que temos um segundo cérebro?',description:'Conheça os neurônios do intestino e a ciência por trás da comunicação do sistema nervoso entérico.'},
  {type:'poster',src:'./assets/03-plantas-medicinais.png',title:'Plantas medicinais e o corpo',description:'Explore a relação entre compostos das plantas, órgãos e o funcionamento do corpo humano.'},
  {type:'poster',src:'./assets/04-tabagismo.png',title:'Tabagismo e respiração',description:'Veja como substâncias presentes na fumaça do cigarro podem prejudicar as vias respiratórias e os pulmões.'},
  {type:'poster',src:'./assets/05-cerebro-bem-estar.png',title:'O cérebro e o bem-estar',description:'Descubra como o cérebro se comunica com o corpo e participa do nosso bem-estar.'},
  {type:'poster',src:'./assets/06-cerebro-intestino.png',title:'Conexão cérebro-intestino',description:'Conheça os caminhos de comunicação entre o cérebro, o intestino e o restante do corpo.'},
  {type:'video',src:'./assets/07-video-cerebro.mp4',poster:'./assets/07-video-cerebro-poster.jpg',title:'Vídeo · O cérebro e o bem-estar',description:'Folder animado sobre a comunicação entre cérebro e corpo.',duration:5.056},
  {type:'video',src:'./assets/08-video-tabagismo.mp4',poster:'./assets/08-video-tabagismo-poster.jpg',title:'Vídeo · Tabagismo e respiração',description:'Folder animado que apresenta os impactos do tabagismo sobre os pulmões.',duration:5.056},
  {type:'video',src:'./assets/09-video-plantas.mp4',poster:'./assets/09-video-plantas-poster.jpg',title:'Vídeo · Plantas medicinais',description:'Folder animado sobre os compostos de plantas e a saúde do corpo.',duration:5.056}
];
const $ = id => document.getElementById(id);
const nodes = {
  currentTitle:$('currentTitle'),slideNumber:$('slideNumber'),slideTotal:$('slideTotal'),stageImg:$('stageImg'),stageVideo:$('stageVideo'),stageBadge:$('stageBadge'),stageBackdrop:$('stageBackdrop'),currentType:$('currentType'),currentDescription:$('currentDescription'),upNextBtn:$('upNextBtn'),upNextImg:$('upNextImg'),upNextLabel:$('upNextLabel'),upNextTitle:$('upNextTitle'),mediaLibrary:$('mediaLibrary'),playBtn:$('playBtn'),playText:$('playText'),playIcon:$('playIcon'),progressFill:$('progressFill'),progressTrack:$('progressTrack'),durationSelect:$('durationSelect'),videosToggle:$('videosToggle'),loopToggle:$('loopToggle'),soundToggle:$('soundToggle'),zoomDialog:$('zoomDialog'),zoomImage:$('zoomImage'),zoomTitle:$('zoomTitle'),zoomCanvas:$('zoomCanvas'),zoomLevel:$('zoomLevel'),helpDialog:$('helpDialog'),helpSteps:$('helpSteps'),toast:$('toast'),stage:$('stage')
};
const defaultSettings = {duration:12000,videos:true,loop:true,sound:false};
let settings = {...defaultSettings};
try {const saved=JSON.parse(localStorage.getItem('mudi-settings')||'{}'); settings={...settings,...saved};} catch(e) {}
if(![8000,12000,16000,25000,40000].includes(Number(settings.duration))) settings.duration=12000;
settings.videos=settings.videos!==false;
settings.loop=settings.loop!==false;
settings.sound=settings.sound===true;
let current=0,playing=false,lastFrame=0,elapsed=0,blockedElapsed=0,rafId=0,toastTimeout=null,deferredPrompt=null,filter='all',fullscreenFallback=false;
const activeIndices=()=>ITEMS.map((it,i)=>({it,i})).filter(x=>settings.videos||x.it.type==='poster').map(x=>x.i);
const pad=n=>String(n).padStart(2,'0');
const thumb = item=>item.type==='poster'?item.src:item.poster;
function saveSettings(){try{localStorage.setItem('mudi-settings',JSON.stringify(settings));}catch(e){}}
function notify(message){const n=nodes.toast;clearTimeout(toastTimeout);n.textContent=message;n.hidden=false;toastTimeout=setTimeout(()=>n.hidden=true,3700);}
function currentPosition(){return Math.max(0,activeIndices().indexOf(current));}
function getNext(direction=1){const visible=activeIndices();const idx=visible.indexOf(current);return visible[(idx+direction+visible.length)%visible.length];}
function getForward(){const visible=activeIndices();const idx=visible.indexOf(current);if(idx===visible.length-1&&!settings.loop)return null;return visible[(idx+1)%visible.length];}
function buildLibrary(){nodes.mediaLibrary.replaceChildren();ITEMS.forEach((it,i)=>{
 const button=document.createElement('button');button.type='button';button.className='library-item';button.dataset.idx=i;button.dataset.type=it.type;button.setAttribute('aria-label',`Abrir ${it.type==='video'?'vídeo':'folder'}: ${it.title}`);
 const cover=document.createElement('span');cover.className='library-cover';const img=document.createElement('img');img.src=thumb(it);img.alt='';img.loading=i<6?'eager':'lazy';cover.append(img);
 if(it.type==='video'){const badge=document.createElement('span');badge.className='library-play';badge.textContent='▶';badge.setAttribute('aria-hidden','true');cover.append(badge);}
 const meta=document.createElement('span');meta.className='library-meta';meta.textContent=it.type==='poster'?`FOLDER ${pad(i+1)}`:`VÍDEO ${pad(i-5)}`;
 const title=document.createElement('span');title.className='library-name';title.textContent=it.title;
 button.append(cover,meta,title);button.addEventListener('click',()=>{if(it.type==='video'&&!settings.videos){settings.videos=true;nodes.videosToggle.checked=true;saveSettings();}showItem(i,{scroll:true});});nodes.mediaLibrary.append(button);
 });updateLibrary();}
function updateLibrary(){nodes.mediaLibrary.querySelectorAll('.library-item').forEach(el=>{let i=Number(el.dataset.idx);el.setAttribute('aria-current',String(i===current));el.hidden=filter!=='all'&&el.dataset.type!==filter;});document.querySelectorAll('.filter').forEach(btn=>{let selected=btn.dataset.filter===filter;btn.classList.toggle('is-selected',selected);btn.setAttribute('aria-pressed',String(selected));});}
function updateNext(){const nextIndex=getForward(),next=nextIndex===null?null:ITEMS[nextIndex];nodes.upNextBtn.disabled=!next;
 if(!next){nodes.upNextImg.src=thumb(ITEMS[0]);nodes.upNextLabel.textContent='FIM DA MOSTRA';nodes.upNextTitle.textContent='Apresentação concluída';return;}
 nodes.upNextImg.src=thumb(next);nodes.upNextLabel.textContent=next.type==='poster'?`FOLDER ${pad(nextIndex+1)}`:`VÍDEO ${pad(nextIndex-5)}`;nodes.upNextTitle.textContent=next.title;
}
function updatePlayButton(){nodes.playBtn.setAttribute('aria-pressed',String(playing));nodes.playText.textContent=playing?'Pausar apresentação':(elapsed>0?'Continuar apresentação':'Iniciar apresentação');nodes.playIcon.innerHTML=playing?'<path d="M7 5v14M17 5v14"/>':'<path d="m8 5 11 7-11 7z"/>'; $('fullPlayBtn').textContent=playing?'❚❚':'▶'; $('fullPlayBtn').setAttribute('aria-label',playing?'Pausar apresentação':'Continuar apresentação');}
function updateProgress(value){let pct=Math.max(0,Math.min(100,value));nodes.progressFill.style.width=pct.toFixed(2)+'%';nodes.progressTrack.setAttribute('aria-valuenow',String(Math.round(pct)));}
function syncSettingsUI(){nodes.durationSelect.value=String(settings.duration);nodes.videosToggle.checked=settings.videos;nodes.loopToggle.checked=settings.loop;nodes.soundToggle.checked=settings.sound;nodes.stageVideo.muted=!settings.sound;}
function showItem(index,{scroll=false}={}){
 if(index<0||index>=ITEMS.length)return;
 const old=ITEMS[current];nodes.stageVideo.pause();
 if(old.type==='video'){nodes.stageVideo.removeAttribute('src');nodes.stageVideo.load();}
 current=index;elapsed=0;blockedElapsed=0;lastFrame=0;updateProgress(0);
 const item=ITEMS[current],indices=activeIndices();
 nodes.stageImg.hidden=item.type==='video';nodes.stageVideo.hidden=item.type!=='video';
 if(item.type==='poster'){
   nodes.stageImg.src=item.src;nodes.stageImg.alt=`Folder do evento: ${item.title}`;
 }else{
   nodes.stageVideo.src=item.src;nodes.stageVideo.poster=item.poster;nodes.stageVideo.muted=!settings.sound;
   nodes.stageVideo.load();
   if(playing)startVideo();
 }
 nodes.stageBackdrop.style.backgroundImage=`url('${thumb(item)}')`;
 nodes.stageBadge.innerHTML=item.type==='poster'?'<span class="badge-dot"></span> FOLDER ORIGINAL':'<span class="badge-dot"></span> VÍDEO ANIMADO';
 nodes.currentTitle.textContent=item.title;
 nodes.slideNumber.textContent=pad(indices.indexOf(current)+1);
 nodes.slideTotal.textContent=pad(indices.length);
 nodes.currentType.textContent=item.type==='poster'?`FOLDER ${pad(current+1)} DE 06`:`VÍDEO ${pad(current-5)} DE 03`;
 nodes.currentDescription.textContent=item.description;
 $('zoomBtn').disabled=item.type==='video';$('zoomBtn').title=item.type==='video'?'Ampliação disponível nos folders':'Ampliar folder';
 updateNext();updateLibrary();updatePlayButton();
 if(scroll){nodes.stage.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});}
}
function startVideo(){if(nodes.stageVideo.hidden)return;nodes.stageVideo.muted=!settings.sound;const p=nodes.stageVideo.play();if(p&&typeof p.catch==='function')p.catch(async()=>{if(!nodes.stageVideo.muted){nodes.stageVideo.muted=true;try{await nodes.stageVideo.play();notify('Vídeo iniciado sem áudio por restrição do navegador.');return;}catch(e){}}notify('Toque no vídeo para iniciar a reprodução.');});}
function setPlaying(value){playing=!!value;lastFrame=0;
 if(playing){if(ITEMS[current].type==='video')startVideo();cancelAnimationFrame(rafId);rafId=requestAnimationFrame(tick);}
 else{nodes.stageVideo.pause();cancelAnimationFrame(rafId);}
 updatePlayButton();}
function togglePlaying(){setPlaying(!playing);}
function tick(t){if(!playing)return;if(!lastFrame)lastFrame=t;const dt=Math.min(t-lastFrame,140);lastFrame=t;
 if(!document.hidden){
  const it=ITEMS[current];
  if(it.type==='video'){
    const video=nodes.stageVideo;
    if(video.readyState>0&&video.duration>0){elapsed=video.currentTime*1000;updateProgress(100*video.currentTime/video.duration);}
    else{elapsed+=dt;updateProgress(100*elapsed/(it.duration*1000));}
    // If the browser cannot play autoplay, do not block the entire digital signage sequence.
    if(video.paused&&!video.ended)blockedElapsed+=dt;else blockedElapsed=0;
    if(blockedElapsed>=3500)advanceAutomatically();
  }else{elapsed+=dt;updateProgress(elapsed/settings.duration*100);if(elapsed>=settings.duration)advanceAutomatically();}
 }
 if(playing)rafId=requestAnimationFrame(tick);
}
function advanceAutomatically(){const next=getForward();if(next===null){setPlaying(false);updateProgress(100);notify('Apresentação concluída.');return;}showItem(next);}
function goRelative(delta){const next=getNext(delta);showItem(next);}
function downloadCurrent(){let it=ITEMS[current];const a=document.createElement('a');a.href=it.src;a.download=it.src.split('/').pop();document.body.append(a);a.click();a.remove();notify(it.type==='video'?'Download do vídeo iniciado.':'Download do folder iniciado.');}
function enterFullscreen(){let el=nodes.stage;
 if(!playing)setPlaying(true);
 if(document.fullscreenElement){document.exitFullscreen?.().catch(()=>{});return;}
 if(el.requestFullscreen){el.requestFullscreen().then(()=>{document.body.classList.add('presentation-fullscreen');}).catch(()=>{fallbackFull();});}else fallbackFull();
}
function fallbackFull(){fullscreenFallback=!fullscreenFallback;document.body.classList.toggle('presentation-fullscreen',fullscreenFallback);window.scrollTo(0,0);if(fullscreenFallback)notify('Modo de exibição ativado. Toque novamente para sair.');}
function fullscreenChanged(){if(!document.fullscreenElement&&!fullscreenFallback)document.body.classList.remove('presentation-fullscreen');if(document.fullscreenElement)document.body.classList.add('presentation-fullscreen');}
function leaveFullscreen(){if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});fullscreenFallback=false;document.body.classList.remove('presentation-fullscreen');}
let zoomScale=1,zoomX=0,zoomY=0,pointers=new Map(),gesture=null;
function setZoom(s,x=zoomX,y=zoomY){zoomScale=Math.max(1,Math.min(5,s));if(zoomScale===1){x=0;y=0;}const c=nodes.zoomCanvas;const maxX=Math.max(0,c.clientWidth*(zoomScale-1)/2),maxY=Math.max(0,c.clientHeight*(zoomScale-1)/2);zoomX=Math.max(-maxX,Math.min(maxX,x));zoomY=Math.max(-maxY,Math.min(maxY,y));nodes.zoomImage.style.transform=`translate(${zoomX}px,${zoomY}px) scale(${zoomScale})`;nodes.zoomLevel.textContent=Math.round(zoomScale*100)+'%';}
function showZoom(){const it=ITEMS[current];if(it.type!=='poster')return;nodes.zoomImage.src=it.src;nodes.zoomImage.alt=`Folder ampliado: ${it.title}`;nodes.zoomTitle.textContent=it.title;setZoom(1,0,0);nodes.zoomDialog.showModal();}
function closeZoom(){nodes.zoomDialog.close();pointers.clear();gesture=null;}
function pointerDown(e){e.preventDefault();nodes.zoomCanvas.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture=null;}
function pointerMove(e){if(!pointers.has(e.pointerId))return;e.preventDefault();const before=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const pts=[...pointers.values()];if(pts.length===1&&zoomScale>1){setZoom(zoomScale,zoomX+e.clientX-before.x,zoomY+e.clientY-before.y);}else if(pts.length===2){let dx=pts[0].x-pts[1].x,dy=pts[0].y-pts[1].y,dist=Math.sqrt(dx*dx+dy*dy);if(gesture)setZoom(gesture.scale*dist/gesture.dist,gesture.x,gesture.y);else gesture={dist,scale:zoomScale,x:zoomX,y:zoomY};}}
function pointerUp(e){pointers.delete(e.pointerId);gesture=null;}
let touchStart=null;
function bindEvents(){
 $('prevBtn').addEventListener('click',()=>goRelative(-1));$('nextBtn').addEventListener('click',()=>goRelative(1));nodes.upNextBtn.addEventListener('click',()=>{const idx=getForward();if(idx!==null)showItem(idx,{scroll:true});});
 $('mobilePrev').addEventListener('click',()=>goRelative(-1));$('mobileNext').addEventListener('click',()=>goRelative(1));
 nodes.playBtn.addEventListener('click',togglePlaying);$('fullBtn').addEventListener('click',enterFullscreen);$('exitFullBtn').addEventListener('click',leaveFullscreen);$('fullPlayBtn').addEventListener('click',togglePlaying);$('downloadBtn').addEventListener('click',downloadCurrent);$('zoomBtn').addEventListener('click',showZoom);
 nodes.durationSelect.addEventListener('change',e=>{settings.duration=Number(e.target.value);elapsed=0;updateProgress(0);saveSettings();notify('Tempo atualizado.');});
 nodes.videosToggle.addEventListener('change',e=>{settings.videos=e.target.checked;if(!settings.videos&&ITEMS[current].type==='video')showItem(0);else{nodes.slideTotal.textContent=pad(activeIndices().length);nodes.slideNumber.textContent=pad(currentPosition()+1);updateNext();}saveSettings();notify(settings.videos?'Vídeos incluídos na apresentação.':'Somente folders na apresentação.');});
 nodes.loopToggle.addEventListener('change',e=>{settings.loop=e.target.checked;updateNext();saveSettings();});
 nodes.soundToggle.addEventListener('change',e=>{settings.sound=e.target.checked;nodes.stageVideo.muted=!settings.sound;saveSettings();notify(settings.sound?'Áudio habilitado.':'Áudio desligado.');});
 nodes.stageVideo.addEventListener('ended',()=>{if(playing){updateProgress(100);advanceAutomatically();}});
 nodes.stageVideo.addEventListener('error',()=>{if(ITEMS[current].type==='video')notify('Não foi possível abrir este vídeo. Verifique a conexão ou o arquivo.');});
 nodes.stageVideo.addEventListener('play',()=>{if(playing)lastFrame=0;});
 document.addEventListener('keydown',e=>{const dialogOpen=nodes.zoomDialog.open||nodes.helpDialog.open;const inInput=['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName);if(dialogOpen||inInput||e.altKey||e.metaKey||e.ctrlKey)return;
  if(e.key==='ArrowRight'){e.preventDefault();goRelative(1);}else if(e.key==='ArrowLeft'){e.preventDefault();goRelative(-1);}else if(e.key===' '){e.preventDefault();togglePlaying();}else if(e.key.toLowerCase()==='f'){e.preventDefault();enterFullscreen();}else if(e.key==='Escape'&&fullscreenFallback){leaveFullscreen();}
 });
 nodes.stage.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
 nodes.stage.addEventListener('touchend',e=>{if(!touchStart||e.changedTouches.length!==1)return;const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.45)goRelative(dx<0?1:-1);touchStart=null;},{passive:true});
 document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;updateLibrary();}));
 nodes.zoomCanvas.addEventListener('pointerdown',pointerDown);nodes.zoomCanvas.addEventListener('pointermove',pointerMove);nodes.zoomCanvas.addEventListener('pointerup',pointerUp);nodes.zoomCanvas.addEventListener('pointercancel',pointerUp);
 nodes.zoomCanvas.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoomScale+(e.deltaY<0?.2:-.2));},{passive:false});
 nodes.zoomCanvas.addEventListener('dblclick',()=>setZoom(zoomScale>=2?1:2,0,0));
 $('zoomIn').addEventListener('click',()=>setZoom(zoomScale+.25));$('zoomOut').addEventListener('click',()=>setZoom(zoomScale-.25));$('zoomReset').addEventListener('click',()=>setZoom(1,0,0));$('zoomClose').addEventListener('click',closeZoom);
 nodes.zoomDialog.addEventListener('click',e=>{if(e.target===nodes.zoomDialog)closeZoom();});
 $('helpClose').addEventListener('click',()=>nodes.helpDialog.close());$('helpOk').addEventListener('click',()=>nodes.helpDialog.close());
 $('shareBtn').addEventListener('click',async()=>{try{if(navigator.share){await navigator.share({title:'MUDI em Movimento',text:'A anatomia da vida saudável: 8 e 15 de novembro, das 14h às 17h, no MUDI/UEM.',url:location.href});}else if(navigator.clipboard){await navigator.clipboard.writeText(location.href);notify('Link copiado!');}else{notify('Copie o endereço do navegador para compartilhar.');}}catch(e){if(e.name!=='AbortError')notify('Não foi possível compartilhar.');}});
 $('installBtn').addEventListener('click',installApp);
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;});
 window.addEventListener('appinstalled',()=>{deferredPrompt=null;notify('Aplicativo instalado com sucesso!');});
 document.addEventListener('fullscreenchange',fullscreenChanged);
 window.addEventListener('pagehide',()=>{nodes.stageVideo.pause();});
}
async function installApp(){if(deferredPrompt){const prompt=deferredPrompt;deferredPrompt=null;prompt.prompt();try{const result=await prompt.userChoice;if(result?.outcome==='accepted')notify('Instalação solicitada.');}catch(e){}return;}
 const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const appMode=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone;
 nodes.helpSteps.innerHTML=appMode?'<p>Este aplicativo já está aberto no modo instalado.</p>':isiOS?'<ol><li>Abra esta página no <strong>Safari</strong>.</li><li>Toque em <strong>Compartilhar</strong>.</li><li>Escolha <strong>Adicionar à Tela de Início</strong>.</li></ol>':'<ol><li>Abra este endereço usando <strong>Chrome ou Edge</strong>.</li><li>Abra o menu <strong>⋮</strong> do navegador.</li><li>Selecione <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</li></ol>';
 nodes.helpDialog.showModal();}
async function init(){syncSettingsUI();buildLibrary();bindEvents();showItem(0);if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){try{await navigator.serviceWorker.register('./sw.js',{scope:'./'});}catch(e){console.warn('Service worker indisponível:',e);}}}
init();
