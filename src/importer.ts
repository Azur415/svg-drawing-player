import DOMPurify from 'dompurify';
import * as css from 'css-tree';
import type { Artwork, DrawingItem } from './model';

const NS = 'http://www.w3.org/2000/svg';
const geometry = new Set(['path','rect','circle','ellipse','line','polygon','polyline']);
const leaves = new Set([...geometry, 'text', 'image', 'use']);
const traceRoles = new Set(['fill','stroke']);
const definitions = new Set(['defs','clipPath','mask','marker','pattern','symbol','linearGradient','radialGradient','filter','title','desc','metadata','style']);
const allowedCSS = new Set(('fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset opacity color stop-color stop-opacity flood-color flood-opacity lighting-color clip-path clip-rule mask filter marker-start marker-mid marker-end font-family font-size font-weight font-style letter-spacing word-spacing text-anchor dominant-baseline alignment-baseline paint-order vector-effect visibility display transform transform-origin transform-box').split(' '));
const raster = /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i;

function cleanCSS(value: string, inline: boolean): string {
  try {
    const ast = css.parse(value, { context: inline ? 'declarationList' : 'stylesheet' });
    css.walk(ast, { enter(node: css.CssNode, item: css.ListItem<css.CssNode>, list: css.List<css.CssNode>) {
      if (node.type === 'Atrule' || node.type === 'Raw') { if (list) list.remove(item); return; }
      if (node.type !== 'Declaration') return;
      let safe = allowedCSS.has(node.property.toLowerCase());
      css.walk(node.value, child => {
        if (child.type === 'Url' && !/^#[\w:.-]+$/.test(child.value)) safe = false;
        if (child.type === 'Raw' || (child.type === 'Function' && !['rgb','rgba','hsl','hsla','matrix','matrix3d','translate','translatex','translatey','scale','scalex','scaley','rotate','skew','skewx','skewy','calc'].includes(child.name.toLowerCase()))) safe = false;
      });
      if (!safe && list) list.remove(item);
    }});
    return css.generate(ast);
  } catch { return ''; }
}

function sameCSS(left: string, right: string, inline: boolean): boolean {
  try {
    const context = inline ? 'declarationList' : 'stylesheet';
    return JSON.stringify(css.parse(left, { context })) === JSON.stringify(css.parse(right, { context }));
  } catch { return left === right; }
}

export function sanitizeSVG(raw: string): { source: string; changed: boolean } {
  if (new Blob([raw]).size > 10 * 1024 * 1024) throw Error('size');
  if (!raw.trim()) throw Error('empty');
  if (/<!DOCTYPE|<!ENTITY/i.test(raw)) throw Error('xml');
  const parsed = new DOMParser().parseFromString(raw, 'image/svg+xml');
  if (parsed.querySelector('parsererror') || parsed.documentElement.localName !== 'svg' || parsed.documentElement.namespaceURI !== NS) throw Error('xml');
  if (parsed.querySelectorAll('*').length > 20000) throw Error('elements');
  const before = new XMLSerializer().serializeToString(parsed.documentElement);
  // IDs stay inside a script-free frame, so names such as "blur" must remain
  // available for SVG references. Explicitly admit use, then restrict its href
  // and bound reference expansion below before any browser insertion.
  const purified = DOMPurify.sanitize(before, { USE_PROFILES: { svg: true, svgFilters: true }, SANITIZE_DOM:false, FORBID_TAGS: ['script','foreignObject','animate','animateMotion','animateTransform','set','discard','feImage'], ADD_TAGS: ['style','use'], ADD_ATTR:['role'] });
  const doc = new DOMParser().parseFromString(purified, 'image/svg+xml');
  if (doc.querySelector('parsererror')) throw Error('xml');
  let changed = DOMPurify.removed.some(r => 'attribute' in r || ('element' in r && r.element.nodeName !== 'BODY'));
  for (const el of Array.from(doc.querySelectorAll('*'))) {
    if (el.localName === 'style') {
      const old = el.textContent || ''; const next = cleanCSS(old, false);
      if (!sameCSS(old, next, false)) changed = true;
      el.textContent = next;
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.localName.toLowerCase(); const value = attr.value.trim();
      if (name === 'style') {
        const clean = cleanCSS(value, true); if (!sameCSS(value, clean, true)) changed = true;
        el.setAttribute('style', clean); continue;
      }
      if (name === 'href') {
        const safe = /^#[\w:.-]+$/.test(value) || (el.localName === 'image' && raster.test(value));
        if (!safe) { el.removeAttributeNode(attr); changed = true; }
      } else if (allowedCSS.has(name)) {
        // Presentation attributes are CSS too: parse escaped url() spellings,
        // rather than relying on a textual URL regex.
        if(!cleanCSS(name+':'+value,true)){el.removeAttributeNode(attr);changed=true;}
      } else if (name.startsWith('on') || name === 'base' || /url\s*\(/i.test(value) && !/^url\(\s*['"]?#[\w:.-]+['"]?\s*\)$/.test(value)) {
        el.removeAttributeNode(attr); changed = true;
      }
    }
  }
  // A cyclic/expanding use graph can consume unbounded rendering work.
  const byId = new Map(Array.from(doc.querySelectorAll('[id]')).map(e => [e.id, e]));
  let visits = 0;
  function check(el: Element, stack: Set<Element>, depth: number) {
    if (++visits > 100000 || depth > 64 || stack.has(el)) throw Error('references');
    const next = new Set(stack); next.add(el);
    if (el.localName === 'use') {
      const id = el.getAttribute('href') || el.getAttributeNS('http://www.w3.org/1999/xlink','href') || '';
      const ref = byId.get(id.slice(1)); if (ref) check(ref, next, depth + 1);
    }
    for (const child of el.children) check(child, next, depth + 1);
  }
  check(doc.documentElement, new Set(), 0);
  return { source: new XMLSerializer().serializeToString(doc.documentElement), changed };
}

const frameHTML = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src 'none'; script-src 'none'; base-uri 'none'; form-action 'none'"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}body>svg{display:block;width:100%;height:100%}</style></head><body></body></html>`;

export async function importArtwork(raw: string, name: string, host: HTMLElement, signal: AbortSignal): Promise<Artwork> {
  const safe = sanitizeSVG(raw);
  const frame = document.createElement('iframe');
  frame.title = name; frame.className = 'art-frame preparing';
  frame.setAttribute('sandbox','allow-same-origin'); frame.srcdoc = frameHTML;
  try {
    await new Promise<void>((resolve,reject) => {
      const abort = () => reject(new DOMException('Aborted','AbortError'));
      signal.addEventListener('abort', abort, {once:true});
      frame.onload = () => { signal.removeEventListener('abort',abort); resolve(); };
      host.append(frame); if(signal.aborted) abort();
    });
    signal.throwIfAborted();
    const doc = frame.contentDocument!;
    const xml = new DOMParser().parseFromString(safe.source,'image/svg+xml');
    const svg = doc.importNode(xml.documentElement,true) as unknown as SVGSVGElement;
    doc.body.append(svg);
    await new Promise(resolve => requestAnimationFrame(resolve));
    signal.throwIfAborted();
    let view = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    if(view.length !== 4 || !view.every(Number.isFinite) || view[2] <= 0 || view[3] <= 0) {
      const w = svg.width.baseVal.value, h = svg.height.baseVal.value;
      if(svg.hasAttribute('width') && svg.hasAttribute('height') && w > 0 && h > 0) view = [0,0,w,h];
      else { const b = svg.getBBox(); if(!b.width || !b.height) throw Error('empty'); const pad = Math.max(b.width,b.height)*.04; view = [b.x-pad,b.y-pad,b.width+2*pad,b.height+2*pad]; }
      svg.setAttribute('viewBox',view.join(' '));
    }
    const lines: string[] = []; const spans = new Map<Element,[number,number]>();
    const serializer = new XMLSerializer();
    function format(el: Element, depth: number) {
      const start = lines.length; const indent = '  '.repeat(Math.min(depth,16));
      if (!el.children.length || ['text','tspan','style','title','desc'].includes(el.localName)) {
        let serialized = serializer.serializeToString(el);
        if(depth>0)serialized=serialized.replace(/ xmlns="http:\/\/www.w3.org\/2000\/svg"/g,'');
        if(!el.childNodes.length && serialized.length>115){
          lines.push(indent+'<'+el.tagName);
          for(const attribute of serialized.matchAll(/([\w:.-]+)="([^"]*)"/g))lines.push(indent+'  '+attribute[0]);
          lines.push(indent+'/>');
        }else lines.push(...serialized.split(/\r?\n/).map(line => indent + line));
      } else {
        let shell = serializer.serializeToString(el.cloneNode(false)).replace(/\s*\/>$/, '>');
        if(depth>0)shell=shell.replace(/ xmlns="http:\/\/www.w3.org\/2000\/svg"/g,'');
        lines.push(indent + shell);
        for(const child of el.childNodes) {
          if(child.nodeType === 1) format(child as Element, depth+1);
          else if(child.nodeType === 3 && child.textContent?.trim()) lines.push(indent+'  '+serializer.serializeToString(child));
        }
        lines.push(indent + '</'+el.tagName+'>');
      }
      spans.set(el,[start,lines.length-1]);
    }
    format(svg,0);
    const source = lines.join('\n');
    const items: DrawingItem[] = []; const chapters: Artwork['chapters'] = [];
    let fade = false;
    // Trace-contract SVGs may keep a composition filter on their artwork
    // container. Their data-trace markers explicitly describe the leaves that
    // can be replayed, so effect-only containers must remain traversable.
    const traceDocument = !!svg.querySelector('[data-trace-chapter],[data-trace-order]');
    const win = frame.contentWindow!;
    function visit(el: SVGElement, chapter: number) {
      if(definitions.has(el.localName)) return;
      const cs = win.getComputedStyle(el);
      if(cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity)===0) return;
      if(el.localName==='image' && !(el.getAttribute('href')||el.getAttributeNS('http://www.w3.org/1999/xlink','href')))return;
      if(el.localName==='use'){
        const ref=el.getAttribute('href')||el.getAttributeNS('http://www.w3.org/1999/xlink','href')||'';
        if(!ref.startsWith('#')||!doc.getElementById(ref.slice(1)))return;
      }
      const traceRole = el.getAttribute('data-trace-role') || '';
      const traceExcluded = traceDocument && (traceRole === 'static' || el.getAttribute('data-trace-exclude') === 'true');
      const traceContainer = traceDocument && el.localName === 'g' && !!el.querySelector('[data-trace-chapter],[data-trace-order]');
      if(el.localName === 'g' && el.id && (!traceDocument || el.hasAttribute('data-trace-chapter'))) {
        chapter = chapters.length; chapters.push({name:el.id,first:items.length});
      }
      const markedTraceLeaf = traceDocument && chapter >= 0 && geometry.has(el.localName) && traceRoles.has(traceRole) && el.hasAttribute('data-trace-order');
      const fallbackLeaf = leaves.has(el.localName) && !traceExcluded && (!traceDocument || (!el.hasAttribute('data-trace-role') && !el.hasAttribute('data-trace-order')));
      const compound = el !== svg && el.children.length > 0 && !traceContainer && (cs.filter !== 'none' || cs.maskImage !== 'none' || Number(cs.opacity) < 1);
      if(markedTraceLeaf || fallbackLeaf || compound) {
        if(chapter < 0) {
          chapter=chapters.findIndex(c=>c.name==='—');
          if(chapter<0){chapter=chapters.length;chapters.push({name:'—',first:items.length});}
        }
        let length = 0;
        try { length = (el as SVGGeometryElement).getTotalLength(); } catch { /* non geometry */ }
        const trace = geometry.has(el.localName) && length > 0 && (markedTraceLeaf || (cs.filter === 'none' && cs.maskImage === 'none'));
        if(!trace) fade = true;
        const span = spans.get(el)!;
        items.push({el,startLine:span[0],endLine:span[1],chapter,length,weight:Math.min(4800,Math.max(300,350+Math.sqrt(length)*28)),trace,style:el.getAttribute('style'),opacity:Number(cs.opacity)});
      } else for(const child of el.children) visit(child as SVGElement, chapter);
    }
    visit(svg,-1);
    if(!items.length) throw Error('empty');
    const bounds=svg.getBBox();if(bounds.width<=0&&bounds.height<=0)throw Error('empty');
    const used=new Set(items.map(item=>item.chapter));
    const indexes=new Map<number,number>();
    const activeChapters=chapters.filter((_,i)=>{if(!used.has(i))return false;indexes.set(i,indexes.size);return true;});
    items.forEach(item=>item.chapter=indexes.get(item.chapter)!);
    const warnings = [...(safe.changed?['sanitized']:[]),...(fade?['fallback']:[])];
    return {frame,svg,source,lines,items,chapters:activeChapters,view,warnings,name};
  } catch(e) { frame.remove(); throw e; }
}
