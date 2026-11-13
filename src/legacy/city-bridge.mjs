// Installed inside the historical closure. Coordinates, routing, collisions,
// NPC schedules, economy, saves and Firebase remain owned by the existing game.
export function installLegacyCityBridge() {
  const historicalDraw = dm50DrawMap;
  const historicalDistrict = dm59Background;
  const historicalCamera = viewOffset;
  let renderer = null, enabled = true, failed = false,farmArt=null;
  const landmarks=()=>window.DosMundosFarmLegacy?.landmarks||[];
  const destinations=()=>[...mapPlaces,...landmarks()];
  let viewport={width:VIEW_W,height:VIEW_H},requested={...viewport};
  const copyPlace = p => ({id:p.id,name:p.name,x:p.x,y:p.y,w:p.w,h:p.h});
  const publish = () => window.dispatchEvent(new CustomEvent('dos-mundos:city-state'));

  function configureViewport(width=VIEW_W,height=VIEW_H) {
    requested={width:VIEW_W,height:Math.max(96,Math.min(WORLD_H,Math.round(Number(height)||VIEW_H)))};
    const size=renderer&&enabled&&!failed?requested:{width:VIEW_W,height:VIEW_H};
    const map=document.getElementById('map');
    if(map&&(map.width!==size.width||map.height!==size.height)){
      map.width=size.width;map.height=size.height;viewport={...size};drawMap();
    }
    return {...viewport};
  }
  viewOffset=function(){
    if(viewport.height===VIEW_H)return historicalCamera();
    return {x:Math.max(0,Math.min(WORLD_W-viewport.width,Math.round(state.x-viewport.width/2))),
      y:Math.max(0,Math.min(WORLD_H-viewport.height,Math.round(state.y-viewport.height/2)))};
  };

  function snapshot() {
    if (!state) return null;
    return {
      width:WORLD_W,height:WORLD_H,viewWidth:viewport.width,viewHeight:viewport.height,
      street:!indoor && tab === 'world' && !dm59Scene && !document.getElementById('dm58-overlay'),
      room:indoor,tab,role:dm51LocalIdentity(),name:state.name,
      x:state.x,y:state.y,face:streetFacing26,moving:!!walkRAF,
      day:state.day,time:state.time,money:state.money,
      city:state.city,district:state.district,weather:{...dm40Weather(state.day,state.time)},
      camera:viewOffset(),places:mapPlaces.map(copyPlace),landmarks:landmarks().map(copyPlace),
      route:route.map(p=>({x:p.x,y:p.y})),
      people:DM54_PEOPLE.map((p,i)=>({id:p.id,name:p.name,...dm57Position(p,i)})),
      citizens:citizenPlans.map(p=>({id:p.id,name:p.name,look:{...p.look},...citizenLocation(p),
        known:!!(state.friends[p.name]||state.friends[p.id])})),
      walkers:DM43_PEDESTRIANS.map(p=>({...p})),
      spots:dm43Spots().map(p=>({id:p.id,name:p.name,icon:p.icon,x:p.pos.x,y:p.pos.y}))
    };
  }

  const hooks = {
    local(g) { dm52DrawActor(g,state.x,state.y,1,dm51LocalIdentity(),streetFacing26,
      walkRAF?Math.floor(performance.now()/130):0,false); },
    remote(g) { dm41DrawOther(g); },
    citizen(g,p) { sprite25(g,p.x,p.y,1.05,p.look,p.walking?streetFrame:0,'down'); },
    gates(g) { dm59DrawGates(g); }
  };
  dm50DrawMap = function() {
    if (!renderer || !enabled || failed) { historicalDraw(); return; }
    if (!state || indoor || tab !== 'world') return;
    try { renderer.draw(ctx,snapshot(),hooks); }
    catch (error) {
      failed = true;
      console.warn('Madrid conserva su vista anterior:',error);
      // A failed Canvas drawing may leave a transform or a clip on the stack.
      // Resizing clears both before the historical renderer takes over.
      ctx.canvas.width=VIEW_W;ctx.canvas.height=VIEW_H;
      viewport={width:VIEW_W,height:VIEW_H};
      configureViewport(VIEW_W,VIEW_H);
      historicalDraw(); publish();
    }
  };
  dm59Background = function(g,id,now) {
    if (!renderer || !enabled || failed) return historicalDistrict(g,id,now);
    const zone=DM59_ZONES[id];
    try { renderer.district(g,id,zone.doors,zone.spawn); }
    catch (_) { historicalDistrict(g,id,now); }
  };
  // Native listeners keep resolving these bindings, including the design toggle.
  for (const name of ['open','close','tabs','district','return']) {
    if (name==='open') { const base=openPlace;openPlace=function(id){base(id);publish();}; }
    if (name==='close') { const base=closeInterior;closeInterior=function(){base();publish();}; }
    if (name==='tabs') { const base=tabs;tabs=function(id){base(id);publish();}; }
    if (name==='district') { const base=dm59Open;dm59Open=function(id){base(id);publish();}; }
    if (name==='return') { const base=dm59Return;dm59Return=function(){base();publish();}; }
  }
  window.DosMundosCityLegacy = Object.freeze({
    snapshot,
    get ready() { return !!renderer && !failed; },
    get enabled() { return enabled; },
    install(candidate) { renderer=candidate;renderer.setFarmAssets?.(farmArt);failed=false;drawMap();publish(); },
    installFarmArt(art) { farmArt=art;renderer?.setFarmAssets?.(art);drawMap(); },
    setEnabled(value) { enabled=!!value;configureViewport(requested.width,requested.height);drawMap();publish(); },
    configureViewport,
    drawOverview(g) { if(renderer && !failed) renderer.overview(g,snapshot(),hooks); },
    entrances() { return destinations().map(p=>({...copyPlace(p),entrance:routeToEntrance(p)})); },
    planTo(id) {
      if(!state)return null;
      const place=destinations().find(p=>p.id===id);if(!place)return null;
      const entrance=routeToEntrance(place);
      return {entrance,path:routeTo(entrance.x,entrance.y)};
    },
    walkTo(id) {
      if(!state||indoor||tab!=='world'||dm59Scene)return false;
      const p=destinations().find(p=>p.id===id);if(!p)return false;
      const entrance=routeToEntrance(p);walkToward(entrance.x,entrance.y,p.id);return true;
    },
    walk(x,y) { if(!state||indoor||tab!=='world'||dm59Scene)return false;walkToward(x,y);return true; },
    move(dx,dy) { if(state&&!indoor&&tab==='world'&&!dm59Scene)move(dx,dy); },
    nearby() {
      if(!state||indoor||tab!=='world')return null;
      const landmark=landmarks().find(p=>{const q=routeToEntrance(p);return Math.hypot(state.x-q.x,state.y-q.y)<38;});
      if(landmark)return {kind:'place',id:landmark.id,name:landmark.name,label:'Entrar en '+landmark.name};
      const p=currentNearby();
      if(p)return {kind:'place',id:p.id,name:p.name,label:'Entrar en '+p.name};
      const s=dm43Nearest();
      if(s)return {kind:'spot',id:s.id,name:s.name,label:s.name};
      let best=null,distance=65;
      DM54_PEOPLE.forEach((p,i)=>{const q=dm57Position(p,i),d=Math.hypot(state.x-q.x,state.y-q.y);
        if(!q.hidden&&d<distance){distance=d;best={kind:'person',id:p.id,name:p.name,label:'Hablar con '+p.name};}});
      return best;
    },
    interact() {
      const near=this.nearby();if(!near)return false;
      if(near.kind==='place')openPlace(near.id);
      else if(near.kind==='spot'){const p=dm43Spots().find(p=>p.id===near.id);if(p)dm43Interact(p);}
      else {const p=DM54_PEOPLE.find(p=>p.id===near.id);if(p)dm54Speak(p);}
      return true;
    }
  });
}

export const cityBridgeSource=()=>`(${installLegacyCityBridge.toString()})();\n`;
