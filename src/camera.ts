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
    // One immutable framing per chapter, including all of its drawable items.
    // Element/batch changes within that chapter must never retarget the camera.
    const chapters=new Map<number,number[]>();
    boxes.forEach((n,i)=>{const chapter=art.items[i].chapter,b=chapters.get(chapter);
      if(!b){chapters.set(chapter,n.slice());return;}
      const x=Math.min(b[0],n[0]),y=Math.min(b[1],n[1]);
      chapters.set(chapter,[x,y,Math.max(b[0]+b[2],n[0]+n[2])-x,Math.max(b[1]+b[3],n[1]+n[3])-y]);
    });
    this.targets=[];chapters.forEach((bounds,chapter)=>this.targets[chapter]=this.framing(bounds));
    this.apply();
  }
  private framing(b:number[]){
    const full=this.art!.view,ratio=full[2]/full[3];
    const w=clamp(Math.max(b[2]*1.65,b[3]*1.65*ratio),full[2]/2.6,full[2]),h=w/ratio;
    return [clamp(b[0]+b[2]/2-w/2,full[0],full[0]+full[2]-w),clamp(b[1]+b[3]/2-h/2,full[1],full[1]+full[3]-h),w,h];
  }
  follow(first:number,_last:number,complete:boolean){
    if(!this.art||this.mode!=='follow')return;
    const chapter=this.art.items[first]?.chapter;
    const target=complete?this.art.view:this.targets[chapter??-1]||this.art.view;
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
