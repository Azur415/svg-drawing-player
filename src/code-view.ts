export class CodeView {
  private lines:string[]=[];private first=-1;private last=-1;private start=-1;
  private prefix:number[]=[0];private progress=0;private writingLine=-1;
  private complete=false;
  following=true; private rowHeight=25;
  constructor(private host:HTMLElement,private onFollow:(following:boolean)=>void){
    host.addEventListener('scroll',()=>this.draw());
    for(const event of ['wheel','touchstart','pointerdown'])host.addEventListener(event,()=>this.setFollow(false),{passive:true});
    host.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End'].includes(e.key))this.setFollow(false);});
    new ResizeObserver(()=>{this.start=-1;this.draw();}).observe(host);
  }
  load(lines:string[]){this.lines=lines;this.prefix=[0];for(const line of lines)this.prefix.push(this.prefix.at(-1)!+line.length+1);this.first=this.last=-1;this.start=-1;this.progress=0;this.complete=false;this.host.scrollTop=0;this.following=true;this.onFollow(true);this.draw();}
  setFollow(value:boolean){this.following=value;this.onFollow(value);if(value)this.scrollToActive();}
  highlight(first:number,last:number,progress=1,complete=false){
    const changed=first!==this.first||last!==this.last||complete!==this.complete;this.complete=complete;this.progress=Math.max(0,Math.min(1,progress));
    if(changed){this.first=first;this.last=last;this.start=-1;this.host.scrollLeft=0;}
    const n=this.prefix[first]+Math.floor((this.prefix[last+1]-this.prefix[first])*this.progress);
    let lo=first,hi=last;while(lo<hi){const m=(lo+hi+1)>>1;if(this.prefix[m]<=n)lo=m;else hi=m-1;}this.writingLine=lo;
    if(this.following)this.scrollToActive();this.draw();this.paint();
  }
  private scrollToActive(){if(this.first<0)return;const y=Math.max(this.first,this.writingLine)*this.rowHeight;if(y<this.host.scrollTop+40||y>this.host.scrollTop+this.host.clientHeight-70)this.host.scrollTop=Math.max(0,y-this.host.clientHeight*.35);}
  private paint(){
    if(this.first<0)return;
    const count=Math.floor((this.prefix[this.last+1]-this.prefix[this.first])*this.progress);
    this.host.querySelectorAll<HTMLElement>('.code-line.active').forEach(row=>{
      const index=Number(row.dataset.line),length=Math.max(0,Math.min(this.lines[index].length,count-(this.prefix[index]-this.prefix[this.first])));
      row.style.setProperty('--lit',length+'ch');row.dataset.revealed=String(length);
      row.classList.toggle('writing',index===this.writingLine&&this.progress<1);
      if(index===this.writingLine&&this.following){const text=row.querySelector<HTMLElement>('.source-text')!,size=parseFloat(getComputedStyle(text).fontSize)*.602;const x=length*size+54;if(x>this.host.scrollLeft+this.host.clientWidth-45)this.host.scrollLeft=x-this.host.clientWidth+65;else if(x<this.host.scrollLeft+54)this.host.scrollLeft=Math.max(0,x-80);}
    });
  }
  private draw(){
    const start=Math.max(0,Math.floor(this.host.scrollTop/this.rowHeight)-8);
    if(start===this.start)return;this.start=start;
    const end=Math.min(this.lines.length,start+Math.ceil(this.host.clientHeight/this.rowHeight)+18);
    const space=document.createElement('div');space.className='code-space';space.style.height=`${this.lines.length*this.rowHeight}px`;
    const rows=document.createElement('div');rows.className='code-rows';rows.style.top=`${start*this.rowHeight}px`;
    for(let i=start;i<end;i++){
      const row=document.createElement('div');row.className='code-line'+(i>=this.first&&i<=this.last?' active':'');
      if(!this.complete&&i>this.last)row.classList.add('future');
      row.dataset.line=String(i);
      const num=document.createElement('span');num.className='line-number';num.textContent=String(i+1);
      const text=document.createElement('span');text.className='source-text';
      const parts=this.lines[i].split(/("[^"]*"|'[^']*'|<\/?[\w:-]+|\b[\w:-]+(?==))/g);
      for(const part of parts){const token=document.createElement('span');token.textContent=part;token.className=/^["']/.test(part)?'string':part.startsWith('<')?'tag':/^[\w:-]+$/.test(part)?'attribute':'';text.append(token);}
      if(i>=this.first&&i<=this.last){const ink=document.createElement('span');ink.className='code-ink';ink.setAttribute('aria-hidden','true');for(const child of text.childNodes)ink.append(child.cloneNode(true));text.append(ink);}
      row.append(num,text);rows.append(row);
    }
    space.append(rows);this.host.replaceChildren(space);
    this.paint();
  }
}
