import type { Artwork, DrawingItem, Mode, Segment } from './model';
export const speeds = [.25,.5,1,2,4,8,16];
const clamp = (n:number,min=0,max=1) => Math.max(min,Math.min(max,n));
interface Active {item: DrawingItem; overlay?: SVGGeometryElement; opacity: number;}
export class Player extends EventTarget {
  art: Artwork | null = null;
  mode: Mode = 'quick'; target = 60; speed = 1; time = 0; total = 0; playing = false;
  segments: Segment[] = []; current = -1; first = 0; last = 0;
  private active: Active[] = []; private frame = 0; private lastTime = 0;
  private pen: SVGCircleElement | null = null;
  private boundary: number | null = null;
  get progress(){if(this.time>=this.total)return 1;if(this.boundary!==null)return 0;const s=this.segments[this.current];return s?clamp((this.time-s.start)/s.duration):0;}
  load(art: Artwork) {
    this.pause(); this.clear(); this.art?.frame.remove(); this.art = art;
    art.frame.classList.remove('preparing'); this.rebuild(); this.seek(0); this.play();
  }
  private rebuild() {
    if(!this.art) return;
    const {items} = this.art; const groups: {first:number;last:number;weight:number}[] = [];
    for(let i=0;i<items.length;) {
      let last=i;
      if(this.mode==='quick' && items.length>150 && items[i].length < 130) {
        while(last+1<items.length && last-i<23 && items[last+1].length<130 && items[last+1].chapter===items[i].chapter) last++;
      }
      let weight=0;for(let j=i;j<=last;j++)weight+=items[j].weight;
      groups.push({first:i,last,weight:this.mode==='quick'?Math.sqrt(weight):weight});i=last+1;
    }
    const sum=groups.reduce((n,g)=>n+g.weight,0); let start=0;
    this.segments=groups.map(g=>{const duration=this.mode==='quick'?g.weight/sum*this.target*1000:g.weight;const s={start,duration,first:g.first,last:g.last};start+=duration;return s;});
    this.total=start;
  }
  configure(mode: Mode,target=this.target) {
    if(!this.art){this.mode=mode;this.target=target;return;}
    const complete=this.time>=this.total;
    const old=this.segments[this.current];
    const item=this.first; const frac=old?clamp((this.time-old.start)/old.duration):0;
    this.mode=mode;this.target=target;this.clear();this.rebuild();
    const next=this.segments.find(s=>item>=s.first&&item<=s.last);
    this.seek(complete?this.total:next?next.start+frac*next.duration:0);
  }
  setSpeed(value:number){this.speed=speeds.includes(value)?value:1;this.emit();}
  play(){
    if(!this.art)return;
    if(this.time>=this.total)this.seek(0);
    if(this.boundary!==null){this.boundary=null;this.current=-1;this.render(this.time);}
    if(this.playing)return;
    this.playing=true;this.lastTime=performance.now();this.emit();
    const tick=(now:number)=>{
      if(!this.playing)return;
      this.render(Math.min(this.total,this.time+Math.min(now-this.lastTime,250)*this.speed));this.lastTime=now;
      if(this.time>=this.total){this.pause();return;}
      this.frame=requestAnimationFrame(tick);
    };
    this.frame=requestAnimationFrame(tick);
  }
  pause(){this.playing=false;cancelAnimationFrame(this.frame);this.emit();}
  seek(time:number){this.boundary=null;this.current=-1;this.render(clamp(time,0,this.total));}
  restart(){this.seek(0);this.play();}
  step(delta:number){
    if(!this.art)return;this.pause();
    const next=clamp((this.boundary??(this.time>=this.total?this.art.items.length:this.first))+delta,0,this.art.items.length);
    this.showBoundary(next);
  }
  jump(index:number){this.pause();this.showBoundary(index);}
  private showBoundary(index:number){
    if(!this.art)return;
    this.clear();this.boundary=index;this.current=-1;
    this.art.items.forEach((item,i)=>i<index?this.restore(item):this.hide(item));
    this.first=this.last=Math.min(index,this.art.items.length-1);
    const s=this.segments.find(s=>index>=s.first&&index<=s.last);
    this.time=s?s.start+s.duration*(index-s.first)/(s.last-s.first+1):this.total;
    this.emit();
  }
  private restore(item:DrawingItem){if(item.style===null)item.el.removeAttribute('style');else item.el.setAttribute('style',item.style);}
  private hide(item:DrawingItem){this.restore(item);item.el.style.setProperty('opacity','0','important');}
  private clear(){for(const a of this.active){a.overlay?.remove();this.restore(a.item);}this.pen?.remove();this.pen=null;this.active=[];this.current=-1;}
  private locate(t:number){let lo=0,hi=this.segments.length;while(lo<hi){const m=(lo+hi)>>1;if(this.segments[m].start+this.segments[m].duration<=t)lo=m+1;else hi=m;}return lo;}
  private render(t:number){
    if(!this.art)return;this.time=t;
    const pos=this.locate(t);
    if(pos!==this.current){
      const previous=this.current;this.clear();this.current=pos;
      if(pos>=this.segments.length){this.art.items.forEach(i=>this.restore(i));this.first=this.last=this.art.items.length-1;this.emit();return;}
      const seg=this.segments[pos];this.first=seg.first;this.last=seg.last;
      if(previous!==pos-1 || previous<0) this.art.items.forEach((item,i)=>i<seg.first?this.restore(item):this.hide(item));
      for(let i=seg.first;i<=seg.last;i++){
        const item=this.art.items[i];this.restore(item);
        const cs=this.art.frame.contentWindow!.getComputedStyle(item.el);
        const opacity=item.opacity;let overlay:SVGGeometryElement|undefined;
        if(item.trace){
          overlay=item.el.cloneNode(true) as SVGGeometryElement;
          overlay.removeAttribute('id');overlay.removeAttribute('class');overlay.removeAttribute('style');
          for(const name of ['transform','transform-origin','transform-box','clip-path','vector-effect','stroke-linecap','stroke-linejoin']) overlay.style.setProperty(name,cs.getPropertyValue(name),'important');
          const stroke=cs.stroke==='none'?'#a13d32':cs.stroke;
          overlay.style.setProperty('fill','none','important');overlay.style.setProperty('stroke',stroke,'important');
          overlay.style.setProperty('stroke-opacity',cs.stroke==='none'?'1':cs.strokeOpacity,'important');
          overlay.style.setProperty('stroke-width',cs.stroke==='none'?'1.3':cs.strokeWidth,'important');
          if(cs.stroke==='none')overlay.style.setProperty('vector-effect','non-scaling-stroke','important');
          overlay.style.setProperty('stroke-dasharray',`${item.length} ${item.length}`,'important');
          overlay.style.setProperty('pointer-events','none','important');
          overlay.setAttribute('data-player-overlay','');item.el.after(overlay);
        }
        this.hide(item);this.active.push({item,overlay,opacity});
      }
      if(this.active.some(a=>a.overlay)){
        this.pen=this.art.svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg','circle');
        this.pen.setAttribute('data-player-overlay','');
        this.pen.setAttribute('data-player-pen','');
        this.pen.style.cssText='fill:#a03d32!important;stroke:#f8f7f0!important;stroke-width:1.5px!important;vector-effect:non-scaling-stroke!important;pointer-events:none!important';
        this.art.svg.append(this.pen);
      }
    }
    const seg=this.segments[pos];if(!seg){this.emit();return;}
    const f=clamp((t-seg.start)/seg.duration);
    if(this.pen)this.pen.style.setProperty('visibility','hidden','important');
    this.active.forEach((a,i)=>{
      // Stagger batches, while keeping each sub-element at a deterministic time.
      const local=this.active.length>1?clamp(f*1.5-i/this.active.length*.5):f;
      const fill=a.overlay?clamp((local-.7)/.3):local;
      a.item.el.style.setProperty('opacity',String(a.opacity*fill),'important');
      if(a.overlay){a.overlay.style.setProperty('stroke-dashoffset',String(a.item.length*(1-clamp(local/.78))),'important');a.overlay.style.setProperty('opacity',String(a.opacity*(1-fill)),'important');}
      if(a.overlay&&this.pen&&local>0&&local<.78){
        const root=this.art!.svg.getScreenCTM()!, matrix=root.inverse().multiply(a.overlay.getScreenCTM()!);
        const point=a.overlay.getPointAtLength(a.item.length*clamp(local/.78)).matrixTransform(matrix);
        this.pen.setAttribute('cx',String(point.x));this.pen.setAttribute('cy',String(point.y));this.pen.setAttribute('r',String(3/Math.hypot(root.a,root.b)));this.pen.style.setProperty('visibility','visible','important');
      }
    });
    this.emit();
  }
  private emit(){this.dispatchEvent(new Event('change'));}
}
