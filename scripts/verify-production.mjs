import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const root=resolve('dist');
const usageBodies=[];
const server=createServer(async(req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(!pathname.startsWith('/drawing-player/')){res.writeHead(404).end();return;}
  if(pathname==='/drawing-player/api/usage'){
    if(req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;usageBodies.push(body);}
    res.writeHead(204,{'Cache-Control':'no-store'}).end();return;
  }
  const file=resolve(root,pathname.slice('/drawing-player/'.length)||'index.html');
  if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  try{const content=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');res.end(content);}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
  browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:1000},locale:'zh-CN'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const failures=[];page.on('response',r=>{if(r.status()>=400)failures.push(r.url());});
  await page.goto(`http://127.0.0.1:${server.address().port}/drawing-player/`);
  await page.locator('#example').click();await page.locator('#filename').filter({hasText:'pavilion.svg'}).waitFor();
  await page.locator('#play').click();
  await page.locator('#seek').evaluate(el=>{el.value='10000';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForFunction(()=>document.querySelector('#percentage').textContent==='100%');
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>typeof window.drawingPlayer),'undefined');
  assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');
  assert.ok(usageBodies.length>0);
  const usage=usageBodies.map(body=>JSON.parse(body));
  assert.equal(usage.some(event=>event.event==='import_success'),true);
  assert.equal(usage.every(event=>!JSON.stringify(event).includes('pavilion.svg')),true);
  assert.equal(usage.every(event=>!('svg' in event)||typeof event.svg!=='string'),true);
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  await mkdir('.local',{recursive:true});await page.screenshot({path:'.local/preview-desktop.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.local/preview-mobile.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  console.log('Production smoke passed: repository subpath, example assets, playback, Chinese UI, mobile layout, no dev hooks or browser errors.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
