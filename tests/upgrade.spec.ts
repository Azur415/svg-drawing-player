import { test,expect } from '@playwright/test';
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700"><rect width="1000" height="700" fill="#eee9db"/><g id="details"><path d="M100 100 Q120 40 160 100 C190 130 110 160 100 100Z" fill="#a03d32"/><circle cx="265" cy="190" r="20" fill="#a03d32"/></g><g id="next-chapter"><path d="M800 500 Q820 440 860 500 C890 530 810 560 800 500Z" fill="#a03d32"/></g></svg>';
test.beforeEach(async({page})=>{await page.goto('/');await page.locator('#fileInput').setInputFiles({name:'camera.svg',mimeType:'image/svg+xml',buffer:Buffer.from(svg)});await expect(page.locator('#filename')).toHaveText('camera.svg');await page.evaluate(()=>{const p=(window as any).drawingPlayer.player;p.pause();p.configure('full');p.jump(1);});});
test('camera stays fixed within chapters and eases only across chapters',async({page})=>{
  await expect(page.locator('#cameraModeTrigger')).toContainText('Follow chapters');
  await page.waitForTimeout(750);
  const a=await page.evaluate(()=>(window as any).drawingPlayer.camera.view.slice());expect(a[2]).toBeGreaterThanOrEqual(1000/2.6);expect(a[2]).toBeLessThan(600);
  await page.evaluate(()=>(window as any).drawingPlayer.player.jump(2));
  await page.waitForTimeout(750);expect(await page.evaluate(()=>(window as any).drawingPlayer.camera.view)).toEqual(a);
  await page.evaluate(()=>(window as any).drawingPlayer.player.jump(3));
  const instant=await page.evaluate(()=>(window as any).drawingPlayer.camera.view.slice());expect(instant[0]).toBeCloseTo(a[0],0);
  await page.waitForTimeout(750);const b=await page.evaluate(()=>(window as any).drawingPlayer.camera.view.slice());expect(b[0]).toBeGreaterThan(a[0]+300);
  await expect(page.locator('#minimap')).toBeVisible();expect(await page.locator('#minimapRect').getAttribute('x')).toBe(String(b[0]));
  await page.locator('#minimapClose').click();await expect(page.locator('#minimap')).toBeHidden();await page.locator('#minimapToggle').click();await expect(page.locator('#minimap')).toBeVisible();
  await page.locator('#cameraModeTrigger').click();await page.locator('#cameraModeMenu').getByRole('option',{name:'Full view',exact:true}).click();await page.waitForTimeout(750);await expect(page.locator('#zoomLabel')).toHaveText('100%');
  await page.evaluate(()=>(window as any).drawingPlayer.player.jump(1));await page.waitForTimeout(150);await expect(page.locator('#zoomLabel')).toHaveText('100%');
  await page.locator('#zoomIn').click();await expect(page.locator('#cameraModeTrigger')).toContainText('Manual');
  const manual=await page.evaluate(()=>(window as any).drawingPlayer.camera.view.slice());await page.evaluate(()=>(window as any).drawingPlayer.player.jump(2));await page.waitForTimeout(150);expect(await page.evaluate(()=>(window as any).drawingPlayer.camera.view)).toEqual(manual);
});
test('future source is faded, completion brightens it, rewind restores fading',async({page})=>{
  await expect(page.locator('.code-line.future').first()).toBeVisible();
  expect(await page.locator('.code-line.future .source-text').first().evaluate(el=>getComputedStyle(el).opacity)).toBe('0.2');
  await page.evaluate(()=>{const p=(window as any).drawingPlayer.player;p.seek(p.total);});
  await expect(page.locator('.code-line.future')).toHaveCount(0);
  await page.evaluate(()=>(window as any).drawingPlayer.player.jump(1));await expect(page.locator('.code-line.future').first()).toBeVisible();
  await expect(page.locator('.brand-mark')).toHaveText('Azur.');await expect(page.locator('.brand p')).toHaveCount(0);
  await page.screenshot({path:'test-results/v1.1.1-source.png'});
});
test('character reveal advances, pauses, and rewinds deterministically',async({page})=>{
  const reveal=async(f:number)=>{await page.evaluate(f=>{const p=(window as any).drawingPlayer.player,s=p.segments[1];p.seek(s.start+s.duration*f);},f);return page.locator('.code-line.active').evaluateAll(rows=>rows.map(r=>Number((r as HTMLElement).dataset.revealed)));};
  const a=await reveal(.2),b=await reveal(.5);expect(b.reduce((a,b)=>a+b,0)).toBeGreaterThan(a.reduce((a,b)=>a+b,0));expect(await reveal(.2)).toEqual(a);
  await page.waitForTimeout(200);expect(await page.locator('.code-line.active').evaluateAll(rows=>rows.map(r=>Number((r as HTMLElement).dataset.revealed)))).toEqual(a);
  expect(await page.locator('.code-ink').count()).toBeGreaterThan(0);
  await page.screenshot({path:'test-results/v1.1-reveal.png'});
});
test('custom selects support selection and keyboard dismissal',async({page})=>{
  await page.locator('#speedTrigger').click();await expect(page.locator('#speedMenu')).toBeVisible();await page.screenshot({path:'test-results/v1.1-menu.png'});
  await page.locator('#speedMenu').getByRole('option',{name:'4×',exact:true}).click();await expect(page.locator('#speedTrigger')).toHaveText('4×');expect(await page.evaluate(()=>(window as any).drawingPlayer.player.speed)).toBe(4);
  await page.locator('#speedTrigger').press('ArrowDown');await expect(page.locator('#speedMenu')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#speedMenu')).toBeHidden();await expect(page.locator('#speedTrigger')).toBeFocused();
  await page.locator('#faster').click();await expect(page.locator('#speedTrigger')).toHaveText('8×');
  await page.locator('#fullscreen').click();await expect.poll(()=>page.evaluate(()=>document.fullscreenElement?.id)).toBe('canvasPanel');
  await page.locator('#cameraModeTrigger').click();await expect(page.locator('#canvasPanel > #cameraModeMenu')).toBeVisible();
  await page.locator('#cameraModeMenu').getByRole('option',{name:'Full view',exact:true}).click();await expect(page.locator('#cameraModeTrigger')).toHaveText('Full view');
  await page.evaluate(()=>document.exitFullscreen());
});
