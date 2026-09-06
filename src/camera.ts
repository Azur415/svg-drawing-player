import type { Artwork } from './model';
export type CameraMode = 'follow' | 'overview' | 'manual';
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export class Camera {
  mode:CameraMode='follow'; view=[0,0,1,1];
  private art:Artwork|null=null; private targets:number[][]=[]; private raf=0; private key='';
  constructor(private changed:(view:number[])=>void){}
  load(art:Artwork){
    cancelAnimationFrame(this.raf);this.art=art;this.mode='follow';this.key='';this.view=art.view.slice();
    const root=art.svg.getScreenCTM()!;
    const boxes=art.items.map(item=>{try{
      const el=item.el as SVGGraphicsElement,b=el.getBBox(),m=root.inverse().multiply(el.getScreenCTM()!);
      const pts=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m));
      const x=Math.min(...pts.map(p=>p.x)),y=Math.min(...pts.map(p=>p.y));return [x,y,Math.max(...pts.map(p=>p.x))-x,Math.max(...pts.map(p=>p.y))-y];
    }catch{return art.view.slice();}});
    // Spatially adjacent small marks share a camera target, avoiding leaf-by-leaf jitter.
    this.targets=[];
    for(let i=0;i<boxes.length;){let b=boxes[i].slice(),end=i;
      while(end+1<boxes.length&&end-i<23&&art.items[end+1].chapter===art.items[i].chapter){
        const n=boxes[end+1],x=Math.min(b[0],n[0]),y=Math.min(b[1],n[1]);
        const union=[x,y,Math.max(b[0]+b[2],n[0]+n[2])-x,Math.max(b[1]+b[3],n[1]+n[3])-y];
        if(union[2]>art.view[2]*.42||union[3]>art.view[3]*.42)break;b=union;end++;
      }
      const target=this.framing(b);for(let j=i;j<=end;j++)this.targets[j]=target;i=end+1;
    }
    this.apply();
  }
  private framing(b:number[]){
    const full=this.art!.view,ratio=full[2]/full[3];
    const w=clamp(Math.max(b[2]*1.65,b[3]*1.65*ratio),full[2]/2.6,full[2]),h=w/ratio;
    return [clamp(b[0]+b[2]/2-w/2,full[0],full[0]+full[2]-w),clamp(b[1]+b[3]/2-h/2,full[1],full[1]+full[3]-h),w,h];
  }
  follow(first:number,last:number,complete:boolean){
    if(!this.art||this.mode!=='follow')return;
    let target=complete?this.art.view:this.targets[first]||this.art.view;
    if(last!==first&&!complete){const other=this.targets[last];if(other){const x=Math.min(target[0],other[0]),y=Math.min(target[1],other[1]),w=Math.max(target[0]+target[2],other[0]+other[2])-x,h=Math.max(target[1]+target[3],other[1]+other[3])-y;target=this.framing([x+w*.15,y+h*.15,w*.7,h*.7]);}}
    const key=target.join(',');if(this.key===key)return;this.key=key;this.to(target);
  }
  setMode(mode:CameraMode){this.mode=mode;this.key='';if(mode==='overview'&&this.art)this.to(this.art.view);else if(mode==='manual')cancelAnimationFrame(this.raf);}
  setManual(view:number[]){this.setMode('manual');this.view=view.slice();this.apply();}
  private to(target:number[]){
    cancelAnimationFrame(this.raf);
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){this.view=target.slice();this.apply();return;}
    const from=this.view.slice(),start=performance.now();
    const tick=(now:number)=>{const f=clamp((now-start)/650,0,1),e=f*f*(3-2*f);this.view=f===1?target.slice():from.map((v,i)=>v+(target[i]-v)*e);this.apply();if(f<1)this.raf=requestAnimationFrame(tick);};
    this.raf=requestAnimationFrame(tick);
  }
  private apply(){if(!this.art)return;this.art.svg.setAttribute('viewBox',this.view.join(' '));const pen=this.art.svg.querySelector('[data-player-pen]'),m=this.art.svg.getScreenCTM();if(pen&&m)pen.setAttribute('r',String(3/Math.hypot(m.a,m.b)));this.changed(this.view);}
}
