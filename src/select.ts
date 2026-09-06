// Keep native selects as the value/event interface, but use a consistent,
// keyboard-accessible popup rather than an operating-system menu.
export class SelectControl {
  private button=document.createElement('button');private menu=document.createElement('div');private open=false;
  constructor(private select:HTMLSelectElement){
    this.button.type='button';this.button.className='select-trigger';this.button.id=select.id+'Trigger';
    this.button.setAttribute('aria-haspopup','listbox');this.button.setAttribute('aria-expanded','false');
    this.menu.className='select-menu';this.menu.id=select.id+'Menu';this.menu.setAttribute('role','listbox');this.menu.hidden=true;
    this.button.setAttribute('aria-controls',this.menu.id);select.classList.add('native-value');select.tabIndex=-1;select.setAttribute('aria-hidden','true');select.after(this.button);document.body.append(this.menu);
    this.button.onclick=()=>this.open?this.close():this.show();
    this.button.onkeydown=e=>{if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();this.show();const all=Array.from(this.menu.querySelectorAll('button'));(e.key==='End'?all.at(-1):all[0])?.focus();}};
    this.menu.onkeydown=e=>{
      const options=Array.from(this.menu.querySelectorAll('button')),i=options.indexOf(document.activeElement as HTMLButtonElement);
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();this.close();this.button.focus();}
      else if(e.key==='Tab')this.close();
      else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?options.length-1:(i+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;options[n]?.focus();}
    };
    document.addEventListener('pointerdown',e=>{if(!this.button.contains(e.target as Node)&&!this.menu.contains(e.target as Node))this.close();});
    window.addEventListener('resize',()=>this.close());window.addEventListener('scroll',()=>this.close(),true);
    document.addEventListener('fullscreenchange',()=>this.close());
    select.addEventListener('change',()=>this.refresh());
    new MutationObserver(()=>this.refresh()).observe(select,{attributes:true,childList:true,subtree:true,characterData:true});
    this.refresh();
  }
  refresh(){
    this.button.textContent=this.select.selectedOptions[0]?.textContent||'';
    this.button.title=this.select.title||this.select.getAttribute('aria-label')||'';
    this.button.setAttribute('aria-label',this.button.title?this.button.title+': '+this.button.textContent:this.button.textContent);
    this.button.disabled=this.select.disabled;this.button.hidden=this.select.hidden;
    if(this.select.hidden)this.close();
  }
  private show(){
    // Opening one menu dismisses the other select menus.
    document.dispatchEvent(new Event('close-selects'));
    (document.fullscreenElement||document.body).append(this.menu);
    this.open=true;this.button.setAttribute('aria-expanded','true');this.menu.replaceChildren();
    Array.from(this.select.options).forEach(option=>{
      const b=document.createElement('button');b.type='button';b.setAttribute('role','option');b.setAttribute('aria-selected',String(option.selected));b.textContent=option.textContent;b.disabled=option.disabled;
      b.onclick=()=>{this.select.value=option.value;this.select.dispatchEvent(new Event('change',{bubbles:true}));this.refresh();this.close();this.button.focus();};this.menu.append(b);
    });
    this.menu.hidden=false;const b=this.button.getBoundingClientRect();const width=Math.max(128,b.width);this.menu.style.width=width+'px';
    const h=this.menu.offsetHeight;this.menu.style.left=Math.max(8,Math.min(innerWidth-width-8,b.left))+'px';
    this.menu.style.top=(b.top>h+16?b.top-h-8:Math.min(innerHeight-h-8,b.bottom+8))+'px';
    this.menu.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
    document.addEventListener('close-selects',this.dismiss,{once:true});
  }
  private dismiss=()=>this.close();
  private close(){this.open=false;this.menu.hidden=true;this.button.setAttribute('aria-expanded','false');document.removeEventListener('close-selects',this.dismiss);}
}
