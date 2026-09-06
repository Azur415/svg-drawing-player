export class CodeView {
  private lines:string[]=[];private first=-1;private last=-1;private start=-1;
  following=true; private rowHeight=25;
  constructor(private host:HTMLElement,private onFollow:(following:boolean)=>void){
    host.addEventListener('scroll',()=>this.draw());
    for(const event of ['wheel','touchstart','pointerdown'])host.addEventListener(event,()=>this.setFollow(false),{passive:true});
    host.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End'].includes(e.key))this.setFollow(false);});
    new ResizeObserver(()=>{this.start=-1;this.draw();}).observe(host);
  }
  load(lines:string[]){this.lines=lines;this.first=this.last=-1;this.start=-1;this.host.scrollTop=0;this.following=true;this.onFollow(true);this.draw();}
  setFollow(value:boolean){this.following=value;this.onFollow(value);if(value)this.scrollToActive();}
  highlight(first:number,last:number){if(first===this.first&&last===this.last)return;this.first=first;this.last=last;this.start=-1;if(this.following)this.scrollToActive();this.draw();}
  private scrollToActive(){if(this.first<0)return;const y=this.first*this.rowHeight;if(y<this.host.scrollTop+40||y>this.host.scrollTop+this.host.clientHeight-70)this.host.scrollTop=Math.max(0,y-this.host.clientHeight*.35);}
  private draw(){
    const start=Math.max(0,Math.floor(this.host.scrollTop/this.rowHeight)-8);
    if(start===this.start)return;this.start=start;
    const end=Math.min(this.lines.length,start+Math.ceil(this.host.clientHeight/this.rowHeight)+18);
    const space=document.createElement('div');space.className='code-space';space.style.height=`${this.lines.length*this.rowHeight}px`;
    const rows=document.createElement('div');rows.className='code-rows';rows.style.top=`${start*this.rowHeight}px`;
    for(let i=start;i<end;i++){
      const row=document.createElement('div');row.className='code-line'+(i>=this.first&&i<=this.last?' active':'');
      const num=document.createElement('span');num.className='line-number';num.textContent=String(i+1);
      const text=document.createElement('span');text.className='source-text';
      const parts=this.lines[i].split(/("[^"]*"|'[^']*'|<\/?[\w:-]+|\b[\w:-]+(?==))/g);
      for(const part of parts){const token=document.createElement('span');token.textContent=part;token.className=/^["']/.test(part)?'string':part.startsWith('<')?'tag':/^[\w:-]+$/.test(part)?'attribute':'';text.append(token);}
      row.append(num,text);rows.append(row);
    }
    space.append(rows);this.host.replaceChildren(space);
  }
}
