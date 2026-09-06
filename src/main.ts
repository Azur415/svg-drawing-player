import './style.css';
import './upgrade.css';
import './readability.css';
import { importArtwork } from './importer';
import { Player, speeds } from './player';
import { CodeView } from './code-view';
import { Camera, type CameraMode } from './camera';
import { SelectControl } from './select';
import packageInfo from '../package.json';
import { messages, type Key, type Language } from './i18n';
import type { Artwork, Mode } from './model';

const icon=(name:string)=>{const paths:Record<string,string>={upload:'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',play:'m9 5 11 7-11 7Z',pause:'M8 5v14M16 5v14',restart:'M4 9a8 8 0 1 1 1 9M4 3v6h6',prev:'M5 5v14m13-14L7 12l11 7Z',next:'M19 5v14M6 5l11 7-11 7Z',fit:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',download:'M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5',layers:'m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5',file:'M14 2H5v20h14V7Zm0 0v5h5M8 12h8m-8 4h6',arrow:'M5 12h14m-5-5 5 5-5 5',cross:'m6 6 12 12M6 18 18 6'};return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.file}"/></svg>`;};
const button=(id:string,key:Key,ico:string,classes='')=>`<button id="${id}" class="${classes}" data-title="${key}" aria-label="${key}">${icon(ico)}</button>`;
document.querySelector('#app')!.innerHTML=`
<div class="shell">
 <header class="topbar"><div class="brand"><div class="brand-mark">Azur<span class="brand-dot">.</span></div><h1>SVG Drawing Player</h1></div><div class="top-actions"><span class="privacy"><i></i><span data-i18n="local"></span></span><button id="language" class="text-button" data-title="language">EN / 中</button><button id="help" class="text-button" data-i18n="help"></button><button id="import" class="dark-button">${icon('upload')}<span data-i18n="import"></span></button></div></header>
 <div class="document-bar"><div class="document-name">${icon('file')}<span id="filename" data-i18n="noFile"></span><span id="filemeta"></span></div><div class="document-actions"><button id="notes" hidden><span class="note-dot"></span><span data-i18n="details"></span></button><button id="download" data-title="download" disabled>${icon('download')}<span data-i18n="download"></span></button></div></div>
 <nav class="mobile-tabs"><button id="canvasTab" class="selected" data-i18n="showCanvas"></button><button id="sourceTab" data-i18n="showSource"></button></nav>
 <main id="workspace" class="workspace">
  <section id="canvasPanel" class="canvas-panel"><div class="panel-header"><div><span class="panel-index">01 /</span><span data-i18n="canvas"></span></div><div class="panel-actions"><button id="chaptersButton" data-title="chapters" disabled>${icon('layers')}<span data-i18n="chapters"></span></button><select id="cameraMode" data-title="cameraMode"><option value="follow" data-i18n="followCamera"></option><option value="overview" data-i18n="overview"></option><option value="manual" data-i18n="manualCamera"></option></select><button id="minimapToggle" data-title="minimap" aria-pressed="true">${icon('fit')}</button></div></div>
   <div id="stage" class="stage"><div id="frameHost" class="frame-host"></div><div id="gesture" class="gesture" hidden></div>
    <div id="empty" class="empty-state"><div class="eyebrow"><span class="red-dot"></span> SVG / DRAWING STUDY</div><div class="line-art" aria-hidden="true"><svg viewBox="0 0 200 140"><path d="M28 108 94 131 176 89 111 67Z M28 108V52L94 77v54m0-54 82-40v52M28 52 109 13l67 24M58 63v37l36 13m17-44v35l41-21V49"/><circle cx="109" cy="13" r="4"/><circle cx="94" cy="77" r="4"/><circle cx="176" cy="89" r="4"/></svg></div><h2 data-i18n="dropTitle"></h2><p data-i18n="dropText"></p><button id="choose" class="dark-button">${icon('upload')}<span data-i18n="choose"></span></button><button id="example" class="example-button"><span data-i18n="example"></span>${icon('arrow')}</button><small data-i18n="limit"></small></div>
    <div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div>
    <div id="canvasTools" class="canvas-tools" hidden><button id="zoomOut" aria-label="Zoom out">−</button><span id="zoomLabel">100%</span><button id="zoomIn" aria-label="Zoom in">+</button><span class="tool-separator"></span>${button('fit','fit','fit')}${button('fullscreen','fullscreen','fit')}</div>
    <aside id="minimap" class="minimap" hidden><div class="minimap-header"><span data-i18n="minimap"></span>${button('minimapClose','close','cross')}</div><div id="minimapBody" class="minimap-body"><img id="minimapImage" alt=""/><svg id="minimapBounds" aria-hidden="true"><rect id="minimapRect"/></svg></div></aside>
    <div id="dropOverlay" class="drop-overlay" hidden>${icon('upload')}<span data-i18n="dropOverlay"></span></div>
   </div><div class="canvas-bottom"><span id="status"><i></i><span data-i18n="ready"></span></span><span id="chapterName">—</span></div>
   <aside id="chapterPanel" class="chapter-panel" hidden><div class="chapter-heading"><strong data-i18n="chapters"></strong>${button('closeChapters','close','cross')}</div><div id="chapterList"></div></aside>
  </section>
  <div id="splitter" class="splitter" role="separator" tabindex="0" aria-label="Resize panels" aria-orientation="vertical" aria-valuemin="35" aria-valuemax="75" aria-valuenow="60"></div>
  <section class="code-panel"><div class="panel-header"><div><span class="panel-index">02 /</span><span data-i18n="source"></span></div><span class="source-format">SVG / XML</span></div><div id="codeEmpty" class="code-empty"><span class="code-symbol">&lt;/&gt;</span><p data-i18n="codeEmpty"></p><small data-i18n="codeHint"></small></div><div id="code" class="code-scroll" tabindex="0" aria-label="SVG source" hidden></div><button id="followCode" class="follow-code" hidden>${icon('arrow')}<span data-i18n="followCode"></span></button><div class="code-bottom"><span id="lineReadout">—</span><span>UTF-8</span></div></section>
 </main>
 <section class="transport"><div class="timeline-info"><div><span class="eyebrow" data-i18n="progress"></span><span id="percentage">00%</span></div><div class="time-label"><span id="clock">00:00 / 01:00</span><span id="remaining"></span></div></div><div class="timeline"><div id="ticks" class="ticks"></div><input id="seek" type="range" min="0" max="10000" value="0" step="1" aria-label="Drawing progress" disabled></div>
 <div class="controls"><div class="playback-controls">${button('restart','restart','restart')}${button('previous','previous','prev')}<button id="play" class="dark-button play-button" disabled>${icon('play')}<span data-i18n="play"></span></button>${button('next','next','next')}<span class="control-separator"></span><div class="speed-control"><button id="slower" data-title="slower">−</button><select id="speed" data-title="speed">${speeds.map(s=>`<option value="${s}" ${s===1?'selected':''}>${s}×</option>`).join('')}</select><button id="faster" data-title="faster">+</button></div><span id="stepCount" class="step-count">—</span></div><div class="mode-controls"><select id="mode"><option value="quick" data-i18n="quick"></option><option value="full" data-i18n="full"></option></select><select id="duration" aria-label="Target duration"><option value="30">30 s</option><option value="60" selected>60 s</option><option value="120">120 s</option></select></div></div>
 </section><footer><span data-i18n="footer"></span><span class="footer-right">SVG DRAWING PLAYER <i>✳</i> OPEN SOURCE</span></footer>
</div><input id="fileInput" type="file" accept=".svg,image/svg+xml" hidden><div id="notice" class="notice" role="status" hidden></div><dialog id="dialog"><div class="dialog-top"><span>SVG / DRAWING STUDY</span>${button('closeDialog','close','cross')}</div><h2 id="dialogTitle"></h2><p id="dialogBody"></p></dialog>`;

const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
let lang:Language;
try {lang=(localStorage.getItem('svg-player-language') as Language)|| (navigator.language.startsWith('zh')?'zh':'en');}catch{lang='en';}
if(!messages[lang])lang='en';
const t=(key:Key)=>messages[lang][key];
const player=new Player();
const code=new CodeView($('code'),following=>{$('followCode').hidden=following;});
let art:Artwork|null=null, aborter:AbortController|null=null, importId=0, view:number[]=[0,0,1,1], cameraChapter=-1;
const camera=new Camera(next=>{view=next.slice();if(art){const w=art.frame.clientWidth||art.view[2],h=art.frame.clientHeight||art.view[3],base=Math.min(w/art.view[2],h/art.view[3]);$('zoomLabel').textContent=Math.round(Math.min(w/view[2],h/view[3])/base*100)+'%';}const rect=$('minimapRect');['x','y','width','height'].forEach((key,i)=>rect.setAttribute(key,String(view[i])));});
const selects=Array.from(document.querySelectorAll<HTMLSelectElement>('select')).map(select=>new SelectControl(select));
let minimapVisible=true,minimapURL='';
let chaptersVisible=true;
let noticeTimer=0;
function notify(message:string,persistent=false){clearTimeout(noticeTimer);$('notice').textContent=message;$('notice').hidden=false;if(!persistent)noticeTimer=window.setTimeout(()=>$('notice').hidden=true,5500);}
function localize(){
  document.documentElement.lang=lang==='zh'?'zh-CN':'en';
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n as Key));
  document.querySelectorAll<HTMLElement>('[data-title]').forEach(el=>{el.title=t(el.dataset.title as Key);el.setAttribute('aria-label',el.title);});
  if(art){$('filename').textContent=art.name;renderChapters();}
  selects.forEach(s=>s.refresh());
  update();
}
function clock(ms:number){const s=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
let lastPlaying:boolean|undefined;
function update(){
  const loaded=!!art;
  for(const id of ['restart','previous','next','seek','play','download','chaptersButton'])$(id).toggleAttribute('disabled',!loaded);
  if(loaded){$('previous').toggleAttribute('disabled',player.time===0);$('next').toggleAttribute('disabled',player.time>=player.total);}
  $('slower').toggleAttribute('disabled',player.speed===speeds[0]);$('faster').toggleAttribute('disabled',player.speed===speeds.at(-1));
  $('speed').setAttribute('aria-label',t('speed'));
  const pct=loaded?player.time/player.total:0;
  const seek=$<HTMLInputElement>('seek');seek.value=String(Math.round(pct*10000));seek.style.setProperty('--progress',`${pct*100}%`);seek.setAttribute('aria-valuetext',`${Math.round(pct*100)}%`);
  $('percentage').textContent=String(Math.round(pct*100)).padStart(2,'0')+'%';
  $('clock').textContent=`${clock(player.time)} / ${clock(loaded?player.total:player.target*1000)}`;
  $('remaining').textContent=loaded?`${t('remaining')} ${clock((player.total-player.time)/player.speed)}`:'';
  $('status').classList.toggle('running',player.playing);
  $('status').lastElementChild!.textContent=t(!loaded?'ready':player.playing?'drawing':player.time>=player.total?'complete':'paused');
  if(lastPlaying!==player.playing){$('play').innerHTML=icon(player.playing?'pause':'play')+'<span></span>';lastPlaying=player.playing;}
  $('play').lastElementChild!.textContent=t(player.playing?'pause':'play');
  if(!art)return;
  const item=art.items[player.first],last=art.items[player.last];
  $('filemeta').textContent=`${art.items.length.toLocaleString()} ${t('steps')} / ${art.chapters.length} ${t('layers')}`;
  $('stepCount').textContent=`${player.time>=player.total?art.items.length:player.first+1} / ${art.items.length}`;
  if(item && last){
    code.highlight(item.startLine,last.endLine,Math.min(1,player.progress/.82),player.time>=player.total);
    camera.follow(player.first,player.last,player.time>=player.total);
    $('lineReadout').textContent=`L ${item.startLine+1}${last.endLine!==item.startLine?' — '+(last.endLine+1):''}`;
    const name=art.chapters[item.chapter].name;
    $('chapterName').textContent=name==='—'?t('emptyChapter'):name;
    if(cameraChapter!==item.chapter){cameraChapter=item.chapter;
      $('chapterList').querySelectorAll('button').forEach((b,i)=>b.classList.toggle('active',i===item.chapter));
      const active=$('chapterList').children[item.chapter] as HTMLElement;
      if(active&&!$('chapterPanel').hidden){
        const list=$('chapterList'),top=active.offsetTop-list.offsetTop;
        if(top<list.scrollTop||top+active.offsetHeight>list.scrollTop+list.clientHeight)list.scrollTop=Math.max(0,top-list.clientHeight/2);
      }
    }
  }
}
player.addEventListener('change',update);
function renderChapters(){
  if(!art)return;$('chapterList').replaceChildren();
  art.chapters.forEach((c,i)=>{const b=document.createElement('button');const number=document.createElement('span');number.textContent=String(i+1).padStart(2,'0');const label=document.createElement('span');label.textContent=c.name==='—'?t('emptyChapter'):c.name;b.append(number,label);b.title=label.textContent;b.classList.toggle('active',i===art!.items[player.first]?.chapter);b.onclick=()=>player.jump(c.first);$('chapterList').append(b);});
  renderTicks();
}
function renderTicks(){if(!art)return;$('ticks').replaceChildren();art.chapters.forEach(c=>{const s=player.segments.find(s=>c.first>=s.first&&c.first<=s.last);if(!s)return;const tick=document.createElement('button');tick.style.left=`${s.start/player.total*100}%`;tick.title=c.name;tick.setAttribute('aria-label',c.name);tick.onclick=()=>player.jump(c.first);$('ticks').append(tick);});}
async function load(raw:string,name:string,id:number,signal:AbortSignal){
  let next:Artwork|undefined;
  try {
    next=await importArtwork(raw,name,$('frameHost'),signal);
    if(id!==importId||signal.aborted){next.frame.remove();return;}
    art=next;code.load(art.lines);$('code').hidden=false;$('codeEmpty').hidden=true;$('empty').hidden=true;$('gesture').hidden=false;$('canvasTools').hidden=false;
    $('filename').textContent=name;$('notes').hidden=!art.warnings.length;cameraChapter=-1;view=art.view.slice();
    toggleChapters(chaptersVisible);camera.load(art);$<HTMLSelectElement>('cameraMode').value='follow';selects.forEach(s=>s.refresh());
    loadMinimap();player.load(art);renderChapters();$('notice').hidden=true;
    if(art.warnings.length)notify(art.warnings.map(k=>t(k as Key)).join(' '));
  } catch(e){if(id===importId && !signal.aborted)notify(t((e instanceof Error && e.message in messages.en?e.message:'failed') as Key));}
}
function beginImport(){aborter?.abort();aborter=new AbortController();const id=++importId;notify(t('loading'),true);return {id,signal:aborter.signal};}
async function fileImport(files:FileList|File[]){
  if(files.length!==1){notify(t('multiple'));return;}
  const file=files[0];if(!file.name.toLowerCase().endsWith('.svg')){notify(t('type'));return;}
  if(file.size>10*1024*1024){notify(t('size'));return;}
  const {id,signal}=beginImport();try{const raw=await file.text();if(!signal.aborted)await load(raw,file.name,id,signal);}catch{if(!signal.aborted)notify(t('failed'));}
}
$('import').onclick=$('choose').onclick=()=>$<HTMLInputElement>('fileInput').click();
$<HTMLInputElement>('fileInput').onchange=e=>{const input=e.target as HTMLInputElement;if(input.files?.length)void fileImport(input.files);input.value='';};
$('example').onclick=async()=>{const {id,signal}=beginImport();try{const response=await fetch(import.meta.env.BASE_URL+'examples/pavilion.svg',{signal});if(!response.ok)throw Error();await load(await response.text(),'pavilion.svg',id,signal);}catch{if(!signal.aborted)notify(t('failed'));}};
let dragDepth=0;
window.addEventListener('dragenter',e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();dragDepth++;$('dropOverlay').hidden=false;}});
window.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files'))e.preventDefault();});
window.addEventListener('dragleave',()=>{dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)$('dropOverlay').hidden=true;});
window.addEventListener('drop',e=>{e.preventDefault();dragDepth=0;$('dropOverlay').hidden=true;if(e.dataTransfer?.files.length)void fileImport(e.dataTransfer.files);});
$('play').onclick=()=>player.playing?player.pause():player.play();$('restart').onclick=()=>player.restart();$('previous').onclick=()=>player.step(-1);$('next').onclick=()=>player.step(1);
$('slower').onclick=()=>setSpeed(speeds[Math.max(0,speeds.indexOf(player.speed)-1)]);$('faster').onclick=()=>setSpeed(speeds[Math.min(speeds.length-1,speeds.indexOf(player.speed)+1)]);
function setSpeed(value:number){player.setSpeed(value);$<HTMLSelectElement>('speed').value=String(value);selects.forEach(s=>s.refresh());}
$<HTMLSelectElement>('speed').onchange=e=>setSpeed(Number((e.target as HTMLSelectElement).value));
function configure(){const mode=$<HTMLSelectElement>('mode').value as Mode;player.configure(mode,Number($<HTMLSelectElement>('duration').value));$('duration').hidden=mode==='full';renderTicks();update();}
$('mode').onchange=$('duration').onchange=configure;
let resume=false,seekFrame=0,pendingSeek:number|null=null;
function flushSeek(){cancelAnimationFrame(seekFrame);seekFrame=0;if(pendingSeek!==null){player.seek(pendingSeek);pendingSeek=null;}}
$('seek').addEventListener('pointerdown',()=>{resume=player.playing;player.pause();});
$('seek').addEventListener('input',e=>{const value=Number((e.target as HTMLInputElement).value);player.pause();pendingSeek=value/10000*player.total;if(!seekFrame)seekFrame=requestAnimationFrame(flushSeek);});
const endSeek=()=>{flushSeek();if(resume&&player.time<player.total)player.play();resume=false;};
$('seek').addEventListener('change',endSeek);$('seek').addEventListener('pointercancel',endSeek);
$('followCode').onclick=()=>code.setFollow(true);
function toggleChapters(show:boolean){
  chaptersVisible=show;const visible=show&&!!art;
  $('chapterPanel').hidden=!visible;$('canvasPanel').classList.toggle('has-chapters',visible);
  $('chaptersButton').setAttribute('aria-expanded',String(visible));$('chaptersButton').setAttribute('aria-controls','chapterPanel');$('chaptersButton').setAttribute('aria-pressed',String(visible));
}
$('chaptersButton').onclick=()=>toggleChapters(!chaptersVisible);$('closeChapters').onclick=()=>toggleChapters(false);
$('language').onclick=()=>{lang=lang==='zh'?'en':'zh';try{localStorage.setItem('svg-player-language',lang);}catch{/* optional preference */}localize();};
function showDialog(title:string,body:string){$('dialogTitle').textContent=title;$('dialogBody').textContent=body;$<HTMLDialogElement>('dialog').showModal();}
$('help').onclick=()=>showDialog(t('helpTitle'),t('helpBody'));$('notes').onclick=()=>showDialog(t('details'),art!.warnings.map(k=>t(k as Key)).join('\n\n'));
$('closeDialog').onclick=()=>$<HTMLDialogElement>('dialog').close();$('dialog').onclick=e=>{if(e.target===$('dialog'))$<HTMLDialogElement>('dialog').close();};
$('download').onclick=()=>{if(!art)return;const url=URL.createObjectURL(new Blob([art.source],{type:'image/svg+xml'}));const a=document.createElement('a');a.href=url;a.download=art.name.replace(/\.svg$/i,'')+'.sanitized.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function applyView(){camera.setManual(view);}
function manual(){camera.setMode('manual');$<HTMLSelectElement>('cameraMode').value='manual';selects.forEach(s=>s.refresh());}
function zoom(factor:number){if(!art)return;manual();const width=Math.max(art.view[2]/25,Math.min(art.view[2]*5,view[2]*factor));const ratio=width/view[2];view=[view[0]+view[2]*(1-ratio)/2,view[1]+view[3]*(1-ratio)/2,width,view[3]*ratio];applyView();}
$('zoomIn').onclick=()=>zoom(.8);$('zoomOut').onclick=()=>zoom(1.25);$('fit').onclick=()=>{if(art){manual();view=art.view.slice();applyView();camera.setMode('overview');$<HTMLSelectElement>('cameraMode').value='overview';selects.forEach(s=>s.refresh());}};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('canvasPanel').requestFullscreen();}catch{notify(t('failed'));}};
$<HTMLSelectElement>('cameraMode').onchange=()=>{camera.setMode($<HTMLSelectElement>('cameraMode').value as CameraMode);camera.follow(player.first,player.last,player.time>=player.total);};
function loadMinimap(){if(!art)return;if(minimapURL)URL.revokeObjectURL(minimapURL);const doc=new DOMParser().parseFromString(art.source,'image/svg+xml');doc.documentElement.setAttribute('width',String(art.view[2]));doc.documentElement.setAttribute('height',String(art.view[3]));minimapURL=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(doc)],{type:'image/svg+xml'}));$<HTMLImageElement>('minimapImage').src=minimapURL;$('minimapBody').style.aspectRatio=String(art.view[2]/art.view[3]);$('minimapBounds').setAttribute('viewBox',art.view.join(' '));$('minimap').hidden=!minimapVisible;}
function toggleMinimap(show:boolean){minimapVisible=show;$('minimap').hidden=!show||!art;$('minimapToggle').setAttribute('aria-pressed',String(show));}
$('minimapClose').onclick=()=>toggleMinimap(false);$('minimapToggle').onclick=()=>toggleMinimap(!minimapVisible);
$('gesture').addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(e.deltaY*.001));},{passive:false});
let pan:{x:number;y:number;view:number[];a:number;d:number}|null=null;
$('gesture').addEventListener('pointerdown',e=>{if(!art)return;manual();const m=art.svg.getScreenCTM()!.inverse();pan={x:e.clientX,y:e.clientY,view:view.slice(),a:m.a,d:m.d};$('gesture').setPointerCapture(e.pointerId);});
$('gesture').addEventListener('pointermove',e=>{if(!pan)return;view=[pan.view[0]-(e.clientX-pan.x)*pan.a,pan.view[1]-(e.clientY-pan.y)*pan.d,pan.view[2],pan.view[3]];applyView();});
for(const event of ['pointerup','pointercancel'])$('gesture').addEventListener(event,()=>pan=null);
function setSplit(value:number){value=Math.max(35,Math.min(75,value));$('workspace').style.setProperty('--split',`${value}%`);$('splitter').setAttribute('aria-valuenow',String(Math.round(value)));}
let resizing=false;
$('splitter').addEventListener('pointerdown',e=>{resizing=true;$('splitter').setPointerCapture(e.pointerId);});
$('splitter').addEventListener('pointermove',e=>{if(resizing){const b=$('workspace').getBoundingClientRect();setSplit((e.clientX-b.left)/b.width*100);}});
for(const event of ['pointerup','pointercancel'])$('splitter').addEventListener(event,()=>resizing=false);
$('splitter').addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();setSplit(Number($('splitter').getAttribute('aria-valuenow'))+(e.key==='ArrowRight'?2:-2));}});
function mobileTab(source:boolean){$('workspace').classList.toggle('show-source',source);$('sourceTab').classList.toggle('selected',source);$('canvasTab').classList.toggle('selected',!source);}
$('canvasTab').onclick=()=>mobileTab(false);$('sourceTab').onclick=()=>mobileTab(true);
document.addEventListener('keydown',e=>{if($<HTMLDialogElement>('dialog').open||e.ctrlKey||e.metaKey||e.altKey||/INPUT|SELECT|TEXTAREA|BUTTON/.test((e.target as HTMLElement).tagName)||e.target===$('code'))return;if(e.code==='Space'){e.preventDefault();player.playing?player.pause():player.play();}else if(e.key==='ArrowRight'){e.preventDefault();player.step(1);}else if(e.key==='ArrowLeft'){e.preventDefault();player.step(-1);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)player.pause();});
localize();
document.querySelector('.footer-right')!.append(' / v'+packageInfo.version);
// Local test hooks are excluded from production builds.
if(import.meta.env.DEV)(window as unknown as {drawingPlayer:unknown}).drawingPlayer={player,camera,get art(){return art;},load:async(raw:string,name='test.svg')=>{const {id,signal}=beginImport();await load(raw,name,id,signal);}};
