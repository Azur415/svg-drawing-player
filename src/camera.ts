import type { Artwork } from './model';
export type CameraMode = 'follow' | 'overview' | 'manual';
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export class Camera {
  mode:CameraMode='follow'; view=[0,0,1,1];
  private art:Artwork|null=null; private targets:number[][]=[]; private raf=0; private key='';
  private bounds=new Map<number,number[]>();private resize:ResizeObserver|null=null;
  private lastFirst=0;private complete=false;private size=[0,0];
  constructor(private changed:(view:number[])=>void){}
  load(art:Artwork){
    cancelAnimationFrame(this.raf);this.resize?.disconnect();this.art=art;this.mode='follow';this.key='';this.view=art.view.slice();this.lastFirst=0;this.complete=false;
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
    this.bounds=chapters;this.size=[art.frame.clientWidth,art.frame.clientHeight];this.reframe();
    this.resize=new ResizeObserver(()=>{
      const w=art.frame.clientWidth,h=art.frame.clientHeight;
      if(!w||!h||(Math.abs(w-this.size[0])<1&&Math.abs(h-this.size[1])<1))return;
      this.size=[w,h];this.reframe();this.key='';this.follow(this.lastFirst,this.lastFirst,this.complete);
    });this.resize.observe(art.frame);
    this.apply();
  }
  private framing(b:number[]){
    const full=this.art!.view,ratio=this.size[0]>0&&this.size[1]>0?this.size[0]/this.size[1]:full[2]/full[3];
    // Fit the complete chapter into the actual canvas, with 10% padding on
    // each side. Only near-zero geometry needs a protective zoom floor.
    const fullWidth=Math.max(full[2],full[3]*ratio);
    const w=Math.max(b[2]*1.2,b[3]*1.2*ratio,fullWidth/20),h=w/ratio;
    // Do not clamp the center to the original document: edge chapters should
    // remain centered too, even when the camera extends outside the source.
    return [b[0]+b[2]/2-w/2,b[1]+b[3]/2-h/2,w,h];
  }
  private reframe(){this.targets=[];this.bounds.forEach((b,chapter)=>this.targets[chapter]=this.framing(b));}
  follow(first:number,_last:number,complete:boolean){
    this.lastFirst=first;this.complete=complete;
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
