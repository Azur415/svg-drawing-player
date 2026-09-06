import {test,expect} from '@playwright/test';
test('portrait chapters fit the canvas by their complete bounds and stay centered after resize',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 486 1391"><g id="hair"><rect x="170" y="30" width="140" height="90" fill="pink"/></g><g id="bag" transform="translate(10 20)"><rect x="100" y="820" width="70" height="80" fill="red"/><rect x="155" y="865" width="45" height="95" fill="brown"/></g></svg>';
  await page.locator('#fileInput').setInputFiles({name:'portrait.svg',mimeType:'image/svg+xml',buffer:Buffer.from(svg)});await expect(page.locator('#filename')).toHaveText('portrait.svg');
  await page.evaluate(()=>{const p=(window as any).drawingPlayer.player;p.pause();p.jump(1);});
  const read=()=>page.evaluate(()=>{const api=(window as any).drawingPlayer;return{view:api.camera.view.slice(),width:api.art.frame.clientWidth,height:api.art.frame.clientHeight};});
  const check=(s:Awaited<ReturnType<typeof read>>)=>{
    const [x,y,w,h]=s.view;
    expect(w/h).toBeCloseTo(s.width/s.height,5);
    expect(x+w/2).toBeCloseTo(160,4);expect(y+h/2).toBeCloseTo(910,4);
    expect(x).toBeLessThan(110);expect(y).toBeLessThan(840);expect(x+w).toBeGreaterThan(210);expect(y+h).toBeGreaterThan(980);
    expect(Math.max(100/w,140/h)).toBeCloseTo(1/1.2,5);
  };
  const first=await read();check(first);expect(parseInt(await page.locator('#zoomLabel').innerText())).toBeGreaterThan(260);
  await page.evaluate(()=>(window as any).drawingPlayer.player.jump(2));expect((await read()).view).toEqual(first.view);
  await page.setViewportSize({width:390,height:844});await expect.poll(async()=>{const s=await read();return Math.abs(s.view[2]/s.view[3]-s.width/s.height);}).toBeLessThan(.001);check(await read());
  await page.evaluate(()=>(window as any).drawingPlayer.player.jump(0));const hair=await read();expect(hair.view[0]+hair.view[2]/2).toBeCloseTo(240,4);expect(hair.view[1]+hair.view[3]/2).toBeCloseTo(75,4);
  await page.locator('#fit').click();expect((await read()).view).toEqual([0,0,486,1391]);await expect(page.locator('#zoomLabel')).toHaveText('100%');
});
