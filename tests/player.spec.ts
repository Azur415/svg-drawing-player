import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { PNG } from 'pngjs';
const drawing='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g"><stop stop-color="red"/><stop offset="1" stop-color="gold"/></linearGradient><clipPath id="clip"><rect width="180" height="180"/></clipPath></defs><g id="outer" transform="translate(5 5)"><path id="path" fill="url(#g)" d="m10 10 h70 v30 a20 20 0 0 1 -20 20 l-30 0 q-10 -10 -20 -10z m90 40 c10 -10 15 5 20 5 s20 15 10 20 t-30 10z"/><g id="nested"><circle id="circle" cx="100" cy="110" r="35" clip-path="url(#clip)"/></g></g><text x="10" y="190">Hello SVG</text></svg>';
async function load(page:Page,svg=drawing,name='drawing.svg'){
  await page.locator('#fileInput').setInputFiles({name,mimeType:'image/svg+xml',buffer:Buffer.from(svg)});
  await expect(page.locator('#filename')).toHaveText(name);
  await page.evaluate(()=> (window as any).drawingPlayer.player.pause());
}
test.beforeEach(async({page})=>{await page.goto('/');});
test('empty screen and original example, desktop and mobile',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await expect(page.locator('#empty')).toBeVisible();await page.screenshot({path:'test-results/desktop-empty.png'});
  expect((await page.locator('#stage').boundingBox())!.height).toBeGreaterThan(400);
  await page.locator('#example').click();await expect(page.locator('#filename')).toHaveText('pavilion.svg');
  expect(await page.evaluate(()=>(window as any).drawingPlayer.art.warnings)).not.toContain('sanitized');
  await page.evaluate(()=>{const p=(window as any).drawingPlayer.player;p.pause();p.seek(p.total);});
  await expect(page.locator('.art-frame')).toBeVisible();await page.screenshot({path:'test-results/desktop-complete.png'});
  expect(errors).toEqual([]);
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/mobile-canvas.png'});
  await page.locator('#sourceTab').click();await expect(page.locator('#code')).toBeVisible();await expect(page.locator('#stage')).not.toBeVisible();
  await expect(page.locator('#play')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});
test('mouse scrubbing resumes, zoom and splitter work',async({page})=>{
  await load(page);await page.locator('#play').click();
  const box=(await page.locator('#seek').boundingBox())!;
  await page.mouse.move(box.x+box.width*.2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height/2,{steps:8});await page.mouse.up();
  const state=await page.evaluate(()=>{const p=(window as any).drawingPlayer.player;return {fraction:p.time/p.total,playing:p.playing};});expect(state.fraction).toBeGreaterThan(.65);expect(state.fraction).toBeLessThan(.8);expect(state.playing).toBe(true);
  await page.locator('#fit').click();await page.locator('#zoomIn').click();await expect(page.locator('#zoomLabel')).toHaveText('125%');await page.locator('#fit').click();await expect(page.locator('#zoomLabel')).toHaveText('100%');
  await page.locator('#splitter').focus();await page.keyboard.press('ArrowLeft');await expect(page.locator('#splitter')).toHaveAttribute('aria-valuenow','58');
});
test('completed pixels match sanitized source including effects and references',async({page})=>{
  const complex='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><filter id="blur"><feGaussianBlur stdDeviation="2"/></filter><mask id="m"><rect width="200" height="200" fill="white"/><circle cx="70" cy="70" r="20" fill="black"/></mask><symbol id="s" viewBox="0 0 40 40"><path d="m0 0h40v40H0z" fill="gold"/></symbol></defs><style>.blue{fill:steelblue} .edge{stroke:#a03d32;stroke-width:3}</style><g opacity=".6" mask="url(#m)"><rect class="blue" x="10" y="10" width="80" height="90"/><circle cx="65" cy="70" r="45" fill="red"/></g><circle cx="140" cy="50" r="25" fill="green" filter="url(#blur)"/><use href="#s" x="100" y="100" width="50" height="50"/><path class="edge" d="m10 140a20 20 0 1 1 40 0m10 0h30" fill="none"/><text x="20" y="185" font-size="15">SVG &amp; code</text></svg>';
  await load(page,complex,'effects.svg');
  const safe=await page.evaluate(()=>(window as any).drawingPlayer.art.source);expect(safe).toContain('<use');expect(safe).toContain('id="blur"');
  // Exclude the UI toolbar's fractional-pixel box shadow from artwork pixels.
  await page.locator('#fit').click();
  await page.addStyleTag({content:'#canvasTools,#notice,#minimap{visibility:hidden!important}'});
  await page.evaluate(()=>{const p=(window as any).drawingPlayer.player;p.seek(p.total*.4);p.seek(p.total);});
  const completed=await page.locator('.art-frame').screenshot();
  await page.evaluate(()=>{const {art}=(window as any).drawingPlayer;const xml=new DOMParser().parseFromString(art.source,'image/svg+xml');art.frame.contentDocument.body.replaceChildren(art.frame.contentDocument.importNode(xml.documentElement,true));});
  const reference=await page.locator('.art-frame').screenshot();fs.writeFileSync('test-results/effects-complete.png',completed);fs.writeFileSync('test-results/effects-reference.png',reference);
  const a=PNG.sync.read(completed),b=PNG.sync.read(reference);let different=0;for(let i=0;i<a.data.length;i+=4)if(a.data.subarray(i,i+4).compare(b.data.subarray(i,i+4)))different++;console.log('Different pixels:',different);expect(different).toBe(0);
});
test('embedded image, cancellation, drop and downloaded document',async({page})=>{
  const image='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><image width="100" height="100" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII="/></svg>';
  await load(page,image,'image.svg');
  expect(await page.evaluate(()=>(window as any).drawingPlayer.art.source)).toContain('data:image/png;base64,');
  await page.evaluate(async(svg)=>{const api=(window as any).drawingPlayer;await Promise.all([api.load(svg,'old.svg'),api.load(svg,'new.svg')]);},drawing);await expect(page.locator('#filename')).toHaveText('new.svg');await expect(page.locator('.art-frame')).toHaveCount(1);
  await page.evaluate(svg=>{const dt=new DataTransfer();dt.items.add(new File([svg],'dropped.svg',{type:'image/svg+xml'}));window.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}));},drawing);await expect(page.locator('#filename')).toHaveText('dropped.svg');
  const downloaded=page.waitForEvent('download');await page.locator('#download').click();const download=await downloaded;const path=await download.path();expect(fs.readFileSync(path!,'utf8')).toBe(await page.evaluate(()=>(window as any).drawingPlayer.art.source));
});
test('nested shapes are unique, commands trace, missing viewBox inferred',async({page})=>{
  await load(page);
  const data=await page.evaluate(()=>{const {art,player}=(window as any).drawingPlayer;player.seek(0);return {count:art.items.length,unique:new Set(art.items.map((i:any)=>i.el)).size,total:player.total,trace:art.items[0].trace,length:art.items[0].length,chapters:art.chapters.map((c:any)=>c.name)};});
  expect(data.count).toBe(3);expect(data.unique).toBe(3);expect(data.total).toBeCloseTo(60000);expect(data.trace).toBe(true);expect(data.length).toBeGreaterThan(100);
  await load(page,'<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="20" width="80" height="30"/></svg>','inferred.svg');
  const view=await page.evaluate(()=>(window as any).drawingPlayer.art.view);expect(view[2]).toBeGreaterThan(80);
});
test('seeking is deterministic and final artwork restores original styles',async({page})=>{
  await load(page);
  const data=await page.evaluate(()=>{const {art,player:p}=(window as any).drawingPlayer;
    p.seek(p.total*.32);const first=art.svg.outerHTML;p.seek(p.total*.9);p.seek(p.total*.32);const second=art.svg.outerHTML;
    p.seek(p.total);const restored=art.items.every((i:any)=>i.el.getAttribute('style')===i.style);return {same:first===second,restored,overlays:art.svg.querySelectorAll('[data-player-overlay]').length};
  });
  expect(data).toEqual({same:true,restored:true,overlays:0});
  await page.evaluate(()=>{const p=(window as any).drawingPlayer.player;p.seek(p.total*.4);});
  const before=await page.locator('#clock').textContent();await page.locator('#faster').click();expect(await page.locator('#clock').textContent()).toBe(before);
  await page.locator('#modeTrigger').click();await page.locator('#modeMenu').getByRole('option',{name:'Every element'}).click();
  expect(await page.evaluate(()=>(window as any).drawingPlayer.player.playing)).toBe(false);
  await page.locator('#next').click();await page.locator('#previous').click();
  await page.keyboard.press('Tab');
});
test('sanitizes scripts and external resources and isolates CSS',async({page})=>{
  const external:string[]=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:5173')&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:http://127.0.0.1:5173/'))external.push(r.url());});
  const bad='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" onload="parent.pwned=1"><script>parent.pwned=1</script><style>@import "https://evil.example/a.css"; rect{fill:url(https://evil.example/a);stroke:red} #app{opacity:0}</style><foreignObject width="100" height="100"><div xmlns="http://www.w3.org/1999/xhtml">bad</div></foreignObject><image href="https://evil.example/a.png"/><rect width="90" height="90" fill="u\\72l(https://evil.example/escaped)" style="fill:red;filter:url(https://evil.example/b);animation:test 1s"/><animate attributeName="x"/><use href="https://evil.example/a.svg#x"/></svg>';
  await load(page,bad,'unsafe.svg');
  const data=await page.evaluate(()=>{const {art}=(window as any).drawingPlayer;return{source:art.source,pwned:(window as any).pwned,hostOpacity:getComputedStyle(document.querySelector('#app')!).opacity};});
  expect(data.source).not.toMatch(/evil\.example|onload|<script|foreignObject|<animate|animation:/);
  expect(data.pwned).toBeUndefined();expect(data.hostOpacity).toBe('1');expect(external).toEqual([]);
});
test('invalid, oversized and cyclic files leave current drawing intact',async({page})=>{
  await load(page);
  for(const [name,svg] of [['broken.svg','<svg>'],['cycle.svg','<svg xmlns="http://www.w3.org/2000/svg"><g id="a"><use href="#a"/></g></svg>'],['empty.svg','<svg xmlns="http://www.w3.org/2000/svg"/>'],['huge.svg',' '.repeat(10*1024*1024+1)],['nodes.svg','<svg xmlns="http://www.w3.org/2000/svg">'+'<g/>'.repeat(20001)+'</svg>']]){
    await page.locator('#fileInput').setInputFiles({name,mimeType:'image/svg+xml',buffer:Buffer.from(svg)});
    await expect(page.locator('#notice')).toBeVisible();await expect(page.locator('#notice')).not.toContainText('Preparing');await expect(page.locator('#filename')).toHaveText('drawing.svg');await expect(page.locator('.art-frame')).toHaveCount(1);
  }
});
test('code can be explored, followed, and language preference persists',async({page})=>{
  await page.locator('#example').click();await expect(page.locator('#filename')).toHaveText('pavilion.svg');
  await page.locator('#code').hover();await page.mouse.wheel(0,400);await expect(page.locator('#followCode')).toBeVisible();
  await page.locator('#followCode').click();await expect(page.locator('#followCode')).toBeHidden();
  await page.locator('#language').click();const lang=await page.locator('html').getAttribute('lang');await page.reload();expect(await page.locator('html').getAttribute('lang')).toBe(lang);
});
test('complex local regression and virtualized source',async({page})=>{
  const path='../svg-reconstruction/building.svg';test.skip(!fs.existsSync(path),'Local artwork is not distributed with the open-source project.');
  await load(page,fs.readFileSync(path,'utf8'),'building.svg');
  const result=await page.evaluate(()=>{const {art,player:p}=(window as any).drawingPlayer;const start=performance.now();for(const pct of [.2,.8,.1,.5,1])p.seek(p.total*pct);return {count:art.items.length,unique:new Set(art.items.map((i:any)=>i.el)).size,rows:document.querySelectorAll('.code-line').length,elapsed:performance.now()-start,batches:p.segments.length,lines:art.lines.length};});
  expect(result.count).toBe(result.unique);expect(result.count).toBeGreaterThan(2000);expect(result.rows).toBeLessThan(80);expect(result.batches).toBeLessThan(result.count);expect(result.elapsed).toBeLessThan(5000);
  await page.screenshot({path:'test-results/building-regression.png'});
  console.log('Building regression:',result);
});
