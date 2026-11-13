import {drawCafe} from '../venues/cafe.mjs';

export function installLegacyCafeBridge(render){
  const originalOpen=dm37OpenCafe,originalArt=dm37CafeCanvas;
  let canvas=null,choice='coffee',frame=0,last=0,cleanup=null;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function draw(time){
    if(!canvas?.isConnected){frame=0;return;}
    if(time-last>32||!last){
      const g=canvas.getContext('2d');g.imageSmoothingEnabled=false;
      try{render(g,reduced?0:time,state.time,choice);dm52DrawActor(g,289,279,1,dm51LocalIdentity(),'down',0,false);}
      catch(error){console.warn('Cafetería: vista anterior recuperada',error);canvas.width=352;canvas.height=134;originalArt(canvas,choice);frame=0;return;}
      last=time;
    }
    frame=requestAnimationFrame(draw);
  }
  dm37CafeCanvas=function(target,selected='coffee'){
    canvas=target;choice=selected;target.width=512;target.height=320;target.dataset.activity=selected;last=0;
    if(!frame)draw(performance.now());
  };
  dm37OpenCafe=function(){
    if(indoor!=='cafe')return;
    const result=originalOpen(),root=document.getElementById('dm37-cafe-modal');
    if(!root||root.dataset.cafe)return result;
    root.dataset.cafe='';root.querySelector('.dm37-kicker').textContent='DOS MUNDOS · CAFÉ RECIÉN HECHO';
    root.querySelector('#dm37-title').textContent='Café Luna';
    root.querySelector('.dm37-art').setAttribute('aria-label','Café Luna: mesas, cafetera, pastelería y ventanas animadas');
    const interior=document.getElementById('interior'),wasInert=interior.inert;
    interior.inert=true;document.body.classList.add('dm-cafe-active');stopRoomAnimation();
    const x=root.querySelector('.dm37-close'),nativeClose=x.onclick;
    const observer=new MutationObserver(()=>{if(!root.isConnected)cleanup?.();});observer.observe(document.body,{childList:true});
    cleanup=()=>{cancelAnimationFrame(frame);frame=0;canvas=null;observer.disconnect();interior.inert=wasInert;document.body.classList.remove('dm-cafe-active');cleanup=null;};
    const close=()=>{nativeClose();cleanup?.();};
    const leave=()=>{close();closeInterior();document.getElementById('enter')?.focus({preventScroll:true});document.getElementById('world')?.scrollIntoView({block:'start'});};
    x.textContent='↩ Calle';x.setAttribute('aria-label','Salir del café');x.onclick=leave;
    const back=root.querySelector('.dm37-back');back.textContent='Ver interior clásico y sus actividades';
    back.onclick=()=>{close();startRoomAnimation();document.getElementById('roomTitle')?.scrollIntoView({block:'start'});};
    root.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();leave();}
      if(event.key==='Tab'){
        const items=[...root.querySelectorAll('button')].filter(el=>!el.disabled&&el.getClientRects().length),first=items[0],last=items.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    },true);
    root.addEventListener('click',event=>{if(event.target===root){event.preventDefault();event.stopImmediatePropagation();leave();}},true);
    x.focus({preventScroll:true});return result;
  };
}
export function cafeBridgeSource(){return `(${installLegacyCafeBridge.toString()})(${drawCafe.toString()});\n`;}
