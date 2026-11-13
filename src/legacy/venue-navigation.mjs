// Explicit exits leave the building. Internal close calls and the dedicated
// classic-activities button retain their original meaning.
export function installLegacyVenueNavigation(){
  const originalOpen=dm56OpenVenue,originalClose=dm56Close,originalAct=dm56Act;
  let restore=null;
  function refreshClock(){
    const clock=dm56Scene?.overlay.querySelector('.dm-venue-clock');
    if(clock)clock.textContent='Día '+state.day+' · '+timeText(state.time);
  }
  dm56Act=function(action){const result=originalAct(action);refreshClock();return result;};
  dm56Close=function(){restore?.();restore=null;originalClose();};
  dm56OpenVenue=function(id){
    const result=originalOpen(id);
    if(!['cinema','gym'].includes(id)||dm56Scene?.id!==id)return result;
    const root=dm56Scene.overlay,interior=document.getElementById('interior');
    root.dataset.venue=id;stopRoomAnimation();
    const clock=document.createElement('small');clock.className='dm-venue-clock';clock.setAttribute('aria-live','polite');
    root.querySelector('.dm56-brand').append(clock);refreshClock();
    const wasInert=interior.inert;interior.inert=true;document.body.classList.add('dm-venue-active');
    restore=()=>{interior.inert=wasInert;root.inert=false;document.body.classList.remove('dm-venue-active');document.querySelector('#dm33-cinema-overlay[data-from-cinema]')?.remove();};
    const leave=()=>{dm56Close();closeInterior();document.getElementById('enter')?.focus({preventScroll:true});document.getElementById('world')?.scrollIntoView({block:'start'});};
    const exit=root.querySelector('.dm56-exit');exit.textContent='↩ Calle';
    exit.setAttribute('aria-label',id==='cinema'?'Salir del cine':'Salir del gimnasio');exit.onclick=leave;
    root.querySelector('.dm56-original').onclick=()=>{dm56Close();startRoomAnimation();document.getElementById('dm56-room-entry')?.focus({preventScroll:true});};
    root.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();leave();}
      if(event.key==='Tab'){
        const items=[...root.querySelectorAll('button,a[href]')].filter(el=>!el.disabled&&el.getClientRects().length),first=items[0],last=items.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    },true);
    exit.focus({preventScroll:true});return result;
  };
}
export function venueNavigationSource(){return `(${installLegacyVenueNavigation.toString()})();\n`;}
