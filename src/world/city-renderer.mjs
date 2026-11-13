import {CITY,streetProps,SPOT_SPRITES,createTraffic,stepTraffic,greenAxis} from './city-layout.mjs?huerto=6';

const ink='#344d4c',cream='#f4e4c4';
const random=(x,y)=>{const n=Math.sin(x*12.9898+y*78.233)*43758.5453;return n-Math.floor(n);};
const rect=(g,x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

export class CityRenderer {
  setFarmAssets(art){this.farmArt=art;}
  constructor(){
    this.atlases=new Map();this.props=streetProps();this.cars=createTraffic();this.last=0;
    this.motion=new Map();this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  async load(){
    const response=await fetch(new URL('../../assets/city/city-atlas.json',import.meta.url));
    if(!response.ok)throw new Error('No se encuentran las ilustraciones de Madrid.');
    this.manifest=await response.json();
    await Promise.all(Object.entries(this.manifest.atlases).map(async([key,data])=>{
      const image=new Image();image.src=new URL('../../assets/city/'+data.image,import.meta.url).href;
      await image.decode();
      if(image.naturalWidth!==data.width||image.naturalHeight!==data.height)throw new Error('Una lámina de Madrid está incompleta.');
      this.atlases.set(key,{...data,image});
    }));
  }
  sprite(g,atlas,key,x,y,h,w=null){
    const sheet=this.atlases.get(atlas),frame=sheet?.frames[key];if(!frame)return;
    w??=h*frame[2]/frame[3];
    g.drawImage(sheet.image,...frame,Math.round(x-w/2),Math.round(y-h),Math.round(w),Math.round(h));
  }
  stone(g,x,y,w,h){
    g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
    for(let py=y;py<y+h;py+=12)for(let px=x-24;px<x+w;px+=24){
      const sx=px+(Math.floor((py-y)/12)%2?12:0),n=Math.floor(random(px,py)*4);
      rect(g,sx,py,24,12,['#cfc4aa','#d8ccb4','#d6c8af','#cbbda2'][n]);
      rect(g,sx+1,py+1,22,1,'#e7dbc044');rect(g,sx,py+11,24,1,'#a99b813f');
      rect(g,sx+23,py+1,1,10,'#a99b813f');
      if(n===0)rect(g,sx+6,py+6,2,1,'#b6a78b66');
    }
    g.restore();
  }
  road(g,axis,center,length,width=56){
    const vertical=axis==='y';
    if(vertical){this.stone(g,center-29,0,width+54,length);rect(g,center-4,0,width+4,length,'#a99f8b');rect(g,center-1,0,width,length,'#526162');}
    else {this.stone(g,0,center-29,length,width+54);rect(g,0,center-4,length,width+4,'#a99f8b');rect(g,0,center-1,length,width,'#526162');}
    for(let i=0;i<length;i+=6){
      const c=i%12?'#3f555544':'#73807933';
      if(vertical){rect(g,center+1,i,2,4,c);rect(g,center+width-4,i,2,4,c);}
      else {rect(g,i,center+1,4,2,c);rect(g,i,center+width-4,4,2,c);}
    }
    for(let p=11;p<length;p+=40){
      if(vertical)rect(g,center+26,p,2,18,'#e8d9ae');else rect(g,p,center+26,18,2,'#e8d9ae');
    }
    if(vertical){rect(g,center-5,0,3,length,'#f2dfba');rect(g,center+width,0,3,length,'#e9d8b4');}
    else {rect(g,0,center-5,length,3,'#f2dfba');rect(g,0,center+width,length,3,'#e9d8b4');}
  }
  ground(places){
    const key=places.map(p=>[p.id,p.x,p.y,p.w,p.h].join(':')).join('|');
    if(this.groundKey===key)return this.groundCanvas;
    const c=canvas(CITY.width,CITY.height),g=c.getContext('2d');this.stone(g,0,0,c.width,c.height);
    // Small green verges soften the blocks while keeping existing footpaths.
    for(const p of places){
      rect(g,p.x-25,p.y-27,p.w+50,p.h+44,'#b9bb94');
      rect(g,p.x-17,p.y-19,p.w+34,p.h+33,'#c7c3a4');
      this.stone(g,p.x-10,p.y-15,p.w+20,p.h+38);
      if(p.id==='park'){
        rect(g,p.x-5,p.y-5,p.w+10,p.h+12,'#879c6e');
        for(let i=0;i<240;i++){const x=p.x+random(i,10)*p.w,y=p.y+random(i,22)*p.h;
          rect(g,x,y,2,1,i%2?'#a4b983':'#667e5b');}
        this.stone(g,p.x+p.w/2-11,p.y-5,22,p.h+28);this.stone(g,p.x-5,p.y+p.h*.6,p.w+10,17);
      }
      if(p.id==='plaza'){
        this.stone(g,p.x-5,p.y-5,p.w+10,p.h+20);
        g.strokeStyle='#a88d6c';g.lineWidth=2;g.beginPath();g.ellipse(p.x+p.w/2,p.y+53,37,24,0,0,Math.PI*2);g.stroke();
        for(let i=0;i<8;i++){const a=i*Math.PI/4;g.beginPath();g.moveTo(p.x+p.w/2,p.y+53);
          g.lineTo(p.x+p.w/2+Math.cos(a)*30,p.y+53+Math.sin(a)*19);g.stroke();}
      }
    }
    for(const x of CITY.roadsX)this.road(g,'y',x,CITY.height);
    for(const y of CITY.roadsY)this.road(g,'x',y,CITY.width);
    for(const x of CITY.roadsX)for(const y of CITY.roadsY){
      rect(g,x-1,y-1,56,56,'#526162');
      for(let i=0;i<5;i++){
        rect(g,x+3+i*10,y-17,6,13,'#ece1c8');rect(g,x+3+i*10,y+59,6,13,'#ece1c8');
        rect(g,x-17,y+3+i*10,13,6,'#ece1c8');rect(g,x+59,y+3+i*10,13,6,'#ece1c8');
      }
      for(const [px,py] of [[x-23,y-21],[x+61,y+63]]){
        rect(g,px,py,13,12,'#c5aa70');
        for(let i=0;i<3;i++)for(let j=0;j<3;j++)rect(g,px+2+i*4,py+2+j*3,1,1,'#f6e0a4');
      }
    }
    for(let row=0;row<3;row++)for(let col=0;col<4;col++){
      const x=242+col*272,y=137+row*268;
      rect(g,x,y,6,15,'#717770');for(let j=0;j<5;j++)rect(g,x+1,y+2+j*3,4,1,'#364c4b');
    }
    // Tiny grit, dry leaves and utility covers, all baked once.
    for(let i=0;i<130;i++){
      const x=Math.floor(random(i,42)*CITY.width),y=Math.floor(random(i,51)*CITY.height);
      rect(g,x,y,2,1,i%3?'#b8a07866':'#e5d7b655');
    }
    this.groundKey=key;this.groundCanvas=c;return c;
  }
  facade(g,p,s){
    const x=p.x+p.w/2,y=p.y+p.h+3,w=p.w+16,h=p.h+44;
    rect(g,p.x+3,p.y+4,p.w+16,p.h+9,'#394b4033');
    if(['museum','garden'].includes(p.id)&&this.farmArt){
      const sheet=this.farmArt.environment,frame=sheet.frames[p.id==='museum'?'museum':'greenhouse'];
      g.drawImage(sheet.image,...frame,Math.round(x-w/2),Math.round(y-h),w,h);
    }else this.sprite(g,'buildings',p.id==='museum'?'library':p.id==='garden'?'market':p.id,x,y,h,w);
    // The sign is a game label; the painted doorway remains completely visible.
    if(distance({x,y},s)<235){
      const name=p.id==='gym'?'CLUB ATLAS':p.id==='cafe'?'CAFÉ LUNA':p.id==='cinema'?'CINE ESTRELLA':p.name.toLocaleUpperCase('es');
      g.font='bold 8px monospace';const tw=Math.max(46,g.measureText(name).width+12);
      rect(g,x-tw/2,y+7,tw,14,'#2b4747');rect(g,x-tw/2,y+7,tw,1,'#e0c28b');
      g.fillStyle=cream;g.textAlign='center';g.fillText(name,x,y+17);
    }
  }
  prop(g,p,s,now){
    g.save();
    // Tall foliage becomes translucent when it would conceal the player.
    const frame=this.atlases.get('street-props').frames[p.sprite],w=p.h*frame[2]/frame[3];
    if(['plane-tree','jacaranda','cypress','terrace'].includes(p.sprite)&&Math.abs(s.x-p.x)<w*.48&&s.y+15<p.y&&s.y+15>p.y-p.h)g.globalAlpha=.48;
    this.sprite(g,'street-props',p.sprite,p.x,p.y,p.h,p.w);
    if(p.sprite==='traffic-light'){
      const green=p.axis===greenAxis(now),left=p.x-p.h*frame[2]/frame[3]/2;
      rect(g,left+p.h*.135,p.y-p.h*.81,3,3,green?'#4e5745':'#ed8d6d');
      rect(g,left+p.h*.135,p.y-p.h*.56,3,3,green?'#b9d58b':'#355448');
    }
    g.restore();
  }
  person(g,p,s,now){
    const motionKey=p.motionKey||p.id,previous=this.motion.get(motionKey);let face=previous?.face||'down';
    if(previous&&p.moving){const dx=p.x-previous.x,dy=p.y-previous.y;
      if(Math.hypot(dx,dy)>.04)face=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';}
    else if(distance(p,s)<90){const dx=s.x-p.x,dy=s.y-p.y;
      face=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';}
    this.motion.set(motionKey,{x:p.x,y:p.y,face});
    const bob=this.reduced?0:p.moving?Math.sin(now/110)*1.1:Math.sin(now/1000+p.x)*.25;
    g.fillStyle='#263f3c35';g.beginPath();g.ellipse(p.x,p.y+6,8,3,0,0,7);g.fill();
    this.sprite(g,'neighbors',(p.sprite||p.id)+'-'+face,p.x,p.y+7+bob,40);
    if(s.weather.isWet){
      g.strokeStyle='#42595c';g.lineWidth=1;g.beginPath();g.moveTo(p.x+8,p.y-15);g.lineTo(p.x+8,p.y-43);g.stroke();
      g.fillStyle=['#b68688','#7b9b9a','#c5ad84'][p.id.length%3];g.beginPath();g.arc(p.x+8,p.y-39,14,Math.PI,Math.PI*2);g.fill();
    }
    if(distance(p,s)<90){
      g.font='bold 9px system-ui';const w=g.measureText(p.name).width+12;
      rect(g,p.x-w/2,p.y-53,w,14,'#2b4549ee');g.fillStyle=cream;g.textAlign='center';g.fillText(p.name,p.x,p.y-43);
    }
  }
  spot(g,p,s,now){
    const sprite=SPOT_SPRITES[p.id],h={flores:44,banco:21,perro:20,librero:43,terraza:49,puesto:42,fuente:45}[p.id];
    if(sprite)this.prop(g,{...p,sprite,h},s,now);
    else if(p.id==='musico'){
      this.sprite(g,'neighbors','leo-down',p.x,p.y+7,40);
      rect(g,p.x+6,p.y-13,5,16,'#a67c4d');rect(g,p.x+8,p.y-10,10,10,'#c8a264');
    }else{
      rect(g,p.x-12,p.y-25,24,29,'#a08165');rect(g,p.x-10,p.y-23,20,25,'#d1bba1');
      for(let i=0;i<5;i++)rect(g,p.x-8+i*3,p.y-20+(i%3)*4,5,15,['#728d9b','#bc888d','#c8ae73'][i%3]);
    }
    if(p.id==='fuente'&&!this.reduced){
      for(let i=0;i<5;i++)rect(g,p.x-12+i*6,p.y-8+(now/80+i*3)%8,1,2,'#def0daaa');
    }
    if(distance(p,s)<85){
      g.fillStyle='#e4c58b';g.beginPath();g.arc(p.x,p.y-46,3,0,7);g.fill();
    }
  }
  car(g,c,s){
    const x=c.axis==='x'?c.position:c.lane,y=c.axis==='y'?c.position:c.lane;
    if(c.axis==='x')this.sprite(g,'street-props',c.sprite,x,y+10,23,33);
    else this.sprite(g,'street-props',c.sprite,x,y+14,31,19);
    if(s.time>=1200||s.time<360){
      g.fillStyle='#ffe5a749';g.beginPath();
      if(c.axis==='x'){const nose=x+c.direction*18;g.moveTo(nose,y-5);g.lineTo(nose+c.direction*23,y-13);g.lineTo(nose+c.direction*23,y+13);g.lineTo(nose,y+5);}
      else {const nose=y+c.direction*16;g.moveTo(x-5,nose);g.lineTo(x-12,nose+c.direction*21);g.lineTo(x+12,nose+c.direction*21);g.lineTo(x+5,nose);}
      g.closePath();g.fill();
    }
  }
  renderWorld(g,s,hooks,now,overview=false){
    g.imageSmoothingEnabled=false;g.drawImage(this.ground([...s.places,...(s.landmarks||[])]),0,0);
    // A subtle dotted route uses the actual native navigation result.
    if(!overview&&s.moving){for(let i=2;i<s.route.length;i+=2){const p=s.route[i];rect(g,p.x-1,p.y-1,3,3,'#faf0cc99');}}
    const items=[];
    for(const p of [...s.places,...(s.landmarks||[])]){if(!['park','plaza'].includes(p.id))items.push({y:p.y+p.h+3,draw:()=>this.facade(g,p,s)});}
    for(let i=0;i<4;i++){
      const p={x:61+i*272,y:831,w:174,h:75,id:i%2?'apartments-slate':'apartments-terracotta'};
      items.push({y:906,draw:()=>{rect(g,p.x+7,842,178,70,'#34473a22');this.sprite(g,'buildings',p.id,p.x+87,909,105,188);}});
    }
    const visible=(x,y,h=80)=>overview||(x>s.camera.x-80&&x<s.camera.x+s.viewWidth+80&&y>s.camera.y-h&&y<s.camera.y+s.viewHeight+h);
    for(const p of this.props)if(visible(p.x,p.y,p.h))items.push({y:p.y,draw:()=>this.prop(g,p,s,now)});
    for(const p of s.spots)if(visible(p.x,p.y))items.push({y:p.y,draw:()=>this.spot(g,p,s,now)});
    for(const p of s.people)if(!p.hidden&&visible(p.x,p.y))items.push({y:p.y+8,draw:()=>this.person(g,p,s,now)});
    // The older acquaintances keep identities, routes and friendship records.
    // Their former large block figures use the new NPC art at player scale.
    const citizenArt={dani:'leo',sam:'omar',lucia:'ines',marco:'dani',noa:'alma',alex:'omar',ines:'noa',luna:'ines'};
    for(const p of s.citizens)if(visible(p.x,p.y))items.push({y:p.y+15,draw:()=>{
      this.person(g,{...p,y:p.y+7,sprite:citizenArt[p.id],motionKey:'citizen-'+p.id,moving:p.walking},s,now);
      if(p.known)rect(g,p.x-2,p.y-37,4,3,'#f6d99c');}});
    const walkers=s.walkers.slice(0,s.time>=1320||s.time<360?4:10);
    walkers.forEach((p,i)=>{
      const t=this.reduced?0:now/1000,x=p.x+Math.sin(t*p.rate*4+i)*p.span*.44,y=p.y+Math.sin(t*1.1+i)*2+10;
      if(visible(x,y))items.push({y,draw:()=>this.sprite(g,'street-props',i%2?'walker-male':'walker-female',x,y,35)});
    });
    for(const c of this.cars){const x=c.axis==='x'?c.position:c.lane,y=c.axis==='y'?c.position:c.lane;
      if(visible(x,y))items.push({y:y+15,draw:()=>this.car(g,c,s)});}
    items.push({y:s.y+15,draw:()=>hooks.local(g)});
    items.sort((a,b)=>a.y-b.y);for(const item of items)item.draw();
    // Keep native online presence and district gates callable without cloning data.
    hooks.remote(g);hooks.gates(g);
  }
  atmosphere(g,s,now){
    const h=s.time/60,night=h>=20||h<6;
    if(night)rect(g,0,0,s.viewWidth,s.viewHeight,'#16283c88');
    else if(h>=18||h<8)rect(g,0,0,s.viewWidth,s.viewHeight,'#b2706740');
    if(night){
      for(const p of this.props.filter(p=>p.light)){
        const x=p.x-s.camera.x,y=p.y-p.h+5-s.camera.y;
        const halo=g.createRadialGradient(x,y,2,x,y,45);halo.addColorStop(0,'#ffd08a66');halo.addColorStop(1,'#ffd08a00');
        g.fillStyle=halo;g.fillRect(x-45,y-45,90,90);rect(g,x-1,y-2,3,3,'#ffe8b3');
      }
      for(const p of [...s.places,...(s.landmarks||[])].filter(p=>!['park','plaza'].includes(p.id))){
        const x=p.x+p.w/2-s.camera.x,y=p.y+p.h-25-s.camera.y;
        const halo=g.createRadialGradient(x,y,2,x,y,33);halo.addColorStop(0,'#ffd69c35');halo.addColorStop(1,'#ffd69c00');
        g.fillStyle=halo;g.fillRect(x-33,y-33,66,66);
      }
    }
    if(s.weather.isWet){
      rect(g,0,0,s.viewWidth,s.viewHeight,'#42637622');
      if(!this.reduced){
        g.strokeStyle='#d1e6e166';g.lineWidth=1;g.beginPath();
        for(let i=0;i<(s.weather.kind==='tormenta'?95:52);i++){
          const x=(i*71+now/22)%(s.viewWidth+28)-14,y=(i*137+now/8)%(s.viewHeight+22)-10;g.moveTo(x,y);g.lineTo(x-3,y+9);
        }g.stroke();
      }
      rect(g,55,395,19,2,'#9ac4c14d');rect(g,333,150,24,2,'#9ac4c14d');
    }else if(s.weather.kind==='nublado')rect(g,0,0,s.viewWidth,s.viewHeight,'#4b626c19');
    // Compact weather chip replaces the old stack of three atmospheric veils.
    rect(g,10,10,150,23,'#273f42e8');rect(g,10,10,150,1,'#c7ab7b');
    g.fillStyle=cream;g.textAlign='left';g.font='bold 10px system-ui';
    g.fillText(s.weather.temp+'° · '+s.weather.label,18,25);
  }
  draw(g,s,hooks){
    const now=performance.now(),dt=this.last?Math.min(.12,(now-this.last)/1000):0;this.last=now;
    if(!this.reduced)stepTraffic(this.cars,dt,now,s.time>=1200||s.time<360);
    g.save();g.clearRect(0,0,s.viewWidth,s.viewHeight);g.translate(-s.camera.x,-s.camera.y);
    this.renderWorld(g,s,hooks,now);g.restore();
    g.save();this.atmosphere(g,s,now);g.restore();
  }
  overview(g,s,hooks){
    if(!s)return;g.save();g.clearRect(0,0,CITY.width,CITY.height);
    this.renderWorld(g,s,hooks,performance.now(),true);
    g.fillStyle='#f7e5b9';g.strokeStyle='#3a5556';g.lineWidth=3;g.beginPath();g.arc(s.x,s.y+13,9,0,7);g.fill();g.stroke();
    for(const p of [...s.places,...(s.landmarks||[])]){
      const x=p.x+p.w/2,y=p.y+p.h+21;g.font='bold 14px system-ui';const w=g.measureText(p.name).width+18;
      rect(g,x-w/2,y-10,w,22,ink);g.fillStyle=cream;g.textAlign='center';g.fillText(p.name,x,y+6);
    }
    g.restore();
  }
  district(g,id,doors){
    g.imageSmoothingEnabled=false;this.stone(g,0,0,1080,760);
    if(id==='garden'){
      rect(g,0,0,1080,760,'#8d9f73');for(let i=0;i<700;i++)rect(g,random(i,32)*1080,random(i,73)*760,2,1,i%2?'#a7b384':'#71865f');
    }
    for(const x of [170,560,975])this.road(g,'y',x-28,760,56);
    for(const y of [360,692])this.road(g,'x',y-28,1080,56);
    const neutral={x:-10000,y:-10000,time:720};
    for(let i=0;i<15;i++){
      const x=35+i*71,y=i%2?566:270;
      if([170,560,975].some(v=>Math.abs(v-x)<65))continue;
      this.prop(g,{sprite:i%3?'plane-tree':'jacaranda',x,y,h:65},neutral,0);
      this.prop(g,{sprite:'lamp',x:x+24,y:y+9,h:44},neutral,0);
    }
    const sprites={museum:'library',gallery:'work',atelier:'shop',garden:'market',greenhouse:'clinic',bar:'cinema',stage:'gym',food:'cafe'};
    for(const d of doors){
      if(this.farmArt&&['museum','garden'].includes(d.id)){
        const a=this.farmArt.environment,f=a.frames[d.id==='museum'?'museum':'greenhouse'];
        g.drawImage(a.image,...f,d.x-5,d.y-42,d.w+10,d.h+42);
      }else this.sprite(g,'buildings',sprites[d.id]||'home',d.x+d.w/2,d.y+d.h,d.h+42,d.w+10);
      g.font='bold 12px system-ui';const w=g.measureText(d.name).width+18;
      rect(g,d.x+d.w/2-w/2,d.y+d.h+11,w,21,ink);g.fillStyle=cream;g.textAlign='center';g.fillText(d.name,d.x+d.w/2,d.y+d.h+26);
    }
    if(id==='garden')for(let i=0;i<5;i++){
      rect(g,48+i*180,515,108,60,'#b7aa86');rect(g,55+i*180,523,94,43,'#8a6a4a');
      for(let j=0;j<4;j++)this.sprite(g,'street-props','flower-planter',68+i*180+j*23,558,22);
    }
    if(id==='culture')this.sprite(g,'street-props','fountain',548,185,77);
    if(id==='night'){
      rect(g,0,0,1080,760,'#172b4366');
      for(let i=0;i<14;i++){const x=36+i*75,y=i%2?450:72;rect(g,x,y,3,3,'#ffe7af');}
    }
    const text=id==='culture'?'← CIUDAD LINEAL':id==='garden'?'CIUDAD LINEAL →':'↓ CIUDAD LINEAL';
    g.font='bold 14px system-ui';g.fillStyle=id==='night'?cream:ink;g.textAlign='center';
    g.fillText(text,id==='culture'?83:id==='garden'?990:550,id==='night'?742:380);
  }
}
