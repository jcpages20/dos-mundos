export function installLegacyOutdoorBridge(){
  const valid=id=>id==='park'||id==='plaza',emit=type=>window.dispatchEvent(new CustomEvent('dos-mundos:outdoors',{detail:{type,id:indoor}}));
  const originalOpen=openPlace,originalClose=closeInterior,originalTabs=tabs,originalPresence=dm41Snapshot;
  let active=null,modern=false,previousInert=false;
  function restore(){const el=document.getElementById('interior');if(el)el.inert=previousInert;}
  function leave(){if(!active)return;emit('leave');restore();active=null;modern=false;}
  openPlace=function(id){
    const same=active===id;if(!same)leave();originalOpen(id);
    if(valid(indoor)&&tab==='world'){
      if(!same){active=indoor;modern=true;previousInert=!!document.getElementById('interior')?.inert;emit('enter');}
      else if(modern){window.DosMundosOutdoorLegacy.pause();emit('refresh');}
    }
  };
  closeInterior=function(){leave();originalClose();};
  tabs=function(id){if(id!=='world')leave();originalTabs(id);if(id==='world'&&valid(indoor)&&!active){active=indoor;modern=true;previousInert=!!document.getElementById('interior')?.inert;emit('enter');}};
  dm41Snapshot=function(){const value=originalPresence();if(value&&modern&&valid(indoor))value.face=roomFacing26;return value;};
  const clock=()=>state.day*1440+state.time;
  window.DosMundosOutdoorLegacy=Object.freeze({
    get open(){return !!state&&valid(indoor)&&tab==='world';},get room(){return indoor;},get modern(){return modern;},
    get role(){return dm51LocalIdentity();},
    snapshot(){
      if(!state)return null;const meta=interiorData[indoor],peer=dm41Online.connected&&dm41Online.other;
      return {name:state.name,role:dm51LocalIdentity(),room:indoor,day:state.day,time:state.time,money:state.money,
        energy:state.energy,fun:state.fun,social:state.social,x:state.x,y:state.y,weather:{...dm40Weather(state.day,state.time)},
        people:(meta?.npcs||[]).map((p,i)=>({index:i,name:p.name,role:p.role,line:p.line})),
        peer:peer&&peer.room===indoor?{name:peer.name,roomX:peer.roomX,roomY:peer.roomY,face:peer.face,updated:peer.updated}:null};
    },
    pause(){if(!valid(indoor))return;modern=true;stopRoomAnimation();const el=document.getElementById('interior');if(el)el.inert=true;},
    resume(){modern=false;restore();roomX=260;roomY=270;roomFacing26='down';if(valid(indoor))startRoomAnimation();},
    exit(){closeInterior();},
    position(p){if(!modern||!valid(indoor))return;roomX=p.roomX;roomY=p.roomY;roomFacing26=['up','down','left','right'].includes(p.face)?p.face:'down';},
    actions(){
      const ids=indoor==='park'?['walk','sport']:['music','talk'];
      const detailed=detailedActivities[indoor]?.[0];
      const result=detailed?detailed.options.map((o,i)=>({id:ids[i],title:o.title,minutes:detailed.minutes,xp:o.xp,skill:detailed.skill})):[];
      return result.concat(indoor==='park'?[{id:'stroll',title:'Paseo corto',minutes:30},{id:'rest',title:'Sentarte a descansar',minutes:20}]:[{id:'social',title:'Pasear y charlar',minutes:35},{id:'listen',title:'Sentarte a escuchar',minutes:20}]);
    },
    act(id){
      if(!state||!valid(indoor))return {ok:false,message:'Vuelve a entrar en el parque o la plaza.'};
      const before=clock(),items=this.actions(),selected=items.find(a=>a.id===id);if(!selected)return {ok:false,message:'Elige una actividad disponible.'};
      const n=items.indexOf(selected);
      if(n<2){const a=detailedActivities[indoor][0];performDetailed(a,a.options[n]);}
      else document.querySelectorAll('#roomActions button')[n-2]?.click();
      if(modern)this.pause();
      return {ok:clock()>before,message:clock()>before?selected.title+' · '+selected.minutes+' min'+(selected.xp?' · +'+selected.xp+' XP en '+selected.skill:''):document.getElementById('activityFeedback')?.textContent||'No se pudo realizar la actividad.'};
    },
    talk(index){if(valid(indoor)&&interiorData[indoor]?.npcs[index])talkRoomNpc(index);},
    closeTalk(){closeRelationship();},
    presence(){return dm41Snapshot();}
  });
}
export const outdoorBridgeSource=()=>`(${installLegacyOutdoorBridge.toString()})();\n`;
