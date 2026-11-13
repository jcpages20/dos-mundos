import {loadOutdoorAssets} from './outdoor-assets.mjs';
import {loadOriginalActors,drawOriginalActor} from '../characters/original-actor.mjs';
import {decodePosition,distanceToSeat} from './outdoor-seats.mjs';
const noise=(x,y)=>{const n=Math.sin(x*19.23+y*33.31)*41371.51;return n-Math.floor(n);};
const box=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
export class OutdoorRenderer{
  constructor(canvas,map){
    this.canvas=canvas;this.map=map;this.g=canvas.getContext('2d');this.camera={x:0,y:0};this.overview=false;this.scale=1;this.offset={x:0,y:0};
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.ground=this.makeGround();
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();
  }
  async load(){[this.art]=await Promise.all([loadOutdoorAssets(),loadOriginalActors()]);}
  resize(){const b=this.canvas.getBoundingClientRect();this.canvas.width=Math.max(160,Math.round(b.width/1.3));this.canvas.height=Math.max(100,Math.round(b.height/1.3));this.g.imageSmoothingEnabled=false;}
  sprite(g,key,x,y,w,h,sheet=this.art){const f=sheet?.frames[key];if(!f)return;g.drawImage(sheet.image,...f,Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  makeGround(){
    const c=document.createElement('canvas');c.width=this.map.width;c.height=this.map.height;const g=c.getContext('2d');
    const paving=(x,y,w,h)=>{g.save();g.beginPath();g.rect(x,y,w,h);g.clip();box(g,x,y,w,h,'#aaa18e');
      for(let py=y;py<y+h;py+=14)for(let px=x-24;px<x+w;px+=28){const sx=px+(Math.floor((py-y)/14)%2?14:0);
        box(g,sx+1,py+1,26,12,['#c9c1ab','#d2c9b4','#bfb8a6','#d8ceba'][Math.floor(noise(px,py)*4)]);box(g,sx+2,py+2,24,1,'#eee1c555');}g.restore();};
    if(this.map.id==='park'){
      for(let y=0;y<c.height;y+=8)for(let x=0;x<c.width;x+=8){box(g,x,y,8,8,['#7d9463','#859d6b','#8da371','#91a674'][Math.floor(noise(x,y)*4)]);
        if(noise(x+3,y)>.6)box(g,x+3,y+4,2,1,'#c3ca9466');}
      const path=(x,y,w,h)=>{box(g,x-3,y-3,w+6,h+6,'#baa67e');box(g,x,y,w,h,'#d3bb8b');
        for(let py=y+3;py<y+h;py+=7)for(let px=x+3;px<x+w;px+=9)if(noise(px,py)>.48)box(g,px,py,2,1,'#a9926c55');};
      path(568,18,144,924);path(27,318,1226,38);path(26,390,717,61);path(29,644,1225,57);path(246,296,66,432);path(352,682,85,161);path(495,725,337,65);path(924,301,158,42);path(717,329,37,303);path(736,601,456,38);
      const l=this.map.lake;box(g,l.x-8,l.y-8,l.w+16,l.h+16,'#b9ae8e');box(g,l.x-3,l.y-3,l.w+6,l.h+6,'#dfd0a9');
      for(let i=0;i<72;i++){const x=42+noise(i,4)*1160,y=30+noise(i,7)*860;if(x>560&&x<718)continue;
        if(noise(i,9)>.3){box(g,x,y,2,2,'#f3d5a2');box(g,x+1,y+2,2,1,'#cb7890');}}
    }else{
      paving(0,0,c.width,c.height);
      for(const y of [298,626,896]){box(g,20,y,1240,5,'#9c8a70');box(g,20,y+5,1240,2,'#eee0bd');}
      for(const x of [248,1028]){box(g,x,279,4,645,'#ad9980');box(g,x+4,279,2,645,'#e8d7b7');}
      g.strokeStyle='#a78f6e';g.lineWidth=5;g.beginPath();g.ellipse(640,518,154,111,0,0,Math.PI*2);g.stroke();
      g.lineWidth=1;g.beginPath();g.ellipse(640,518,163,119,0,0,Math.PI*2);g.stroke();
      for(let i=0;i<12;i++){const a=i*Math.PI/6;g.beginPath();g.moveTo(640+Math.cos(a)*110,518+Math.sin(a)*80);g.lineTo(640+Math.cos(a)*155,518+Math.sin(a)*112);g.stroke();}
      // Deep portico shade gives the red façades a grounded arcade edge.
      for(const o of this.map.objects.filter(o=>o.sprite?.includes('arcade')))box(g,o.x+7,o.y+o.h-20,o.w-14,30,'#54433e40');
    }
    return c;
  }
  water(g,now){
    const l=this.map.lake;if(!l)return;
    box(g,l.x,l.y,l.w,l.h,'#568b8a');
    for(let y=l.y+8;y<l.y+l.h-6;y+=12)for(let x=l.x+5;x<l.x+l.w-10;x+=37){
      const d=this.reduced?0:Math.sin(now/1300+x+y)*3;box(g,x+d,y,15+noise(x,y)*10,1,'#a7c3a855');box(g,x+8-d,y+5,8,1,'#314e5b33');}
    box(g,l.x+4,l.y+3,l.w-8,14,'#36575533');
    for(const [x,y,w] of [[814,408,91],[1016,494,101]]){const d=this.reduced?0:Math.sin(now/1800+x)*2;this.sprite(g,'rowboat',x,y+d,w,w*.53);}
  }
  person(g,p,i,now){
    const q=this.map.people[i%this.map.people.length],frames=this.art.neighbors.frames;
    const candidates=Object.keys(frames).filter(k=>k.endsWith('-down'));const key=candidates[i%candidates.length]||Object.keys(frames)[i%Object.keys(frames).length];
    const f=frames[key];if(!f)return;const w=48*f[2]/f[3];
    g.fillStyle='#2c334733';g.beginPath();g.ellipse(q.x,q.y,10,3,0,0,Math.PI*2);g.fill();
    this.sprite(g,key,q.x-w/2,q.y-48,w,48,this.art.neighbors);
    if(this.overview)return;g.font='bold 8px system-ui';g.textAlign='center';g.fillStyle='#f6e6c4';g.strokeStyle='#30483f';g.lineWidth=3;g.strokeText(p.name,q.x,q.y-53);g.fillText(p.name,q.x,q.y-53);
  }
  render(actor,data,target,now){
    const g=this.g,w=this.canvas.width,h=this.canvas.height,map=this.map;g.imageSmoothingEnabled=false;box(g,0,0,w,h,map.id==='park'?'#62795b':'#655346');
    this.scale=this.overview?Math.min(w/map.width,h/map.height):.86;
    if(this.overview)this.offset={x:(w-map.width*this.scale)/2,y:(h-map.height*this.scale)/2};
    else{this.offset={x:0,y:0};this.camera={x:Math.max(0,Math.min(map.width-w/this.scale,actor.x-w/this.scale/2)),y:Math.max(0,Math.min(map.height-h/this.scale,actor.y-h/this.scale*.62))};}
    g.save();g.translate(this.offset.x,this.offset.y);g.scale(this.scale,this.scale);if(!this.overview)g.translate(-this.camera.x,-this.camera.y);
    g.drawImage(this.ground,0,0);this.water(g,now);
    const items=[];for(const o of map.objects){if(!o.sprite)continue;items.push({y:o.depth,draw:()=>{
      this.sprite(g,o.sprite,o.x,o.y,o.w,o.h);
      if(o.label){g.fillStyle='#1e4761';g.textAlign='center';g.font='bold 5px serif';g.fillText(o.label,o.x+o.w/2,o.y+o.h*.38);}
      if(o.id===target?.id){g.strokeStyle='#ffe4a6';g.lineWidth=2;g.beginPath();g.ellipse(o.x+o.w/2,o.y+o.h-2,Math.min(40,o.w/2),7,0,0,Math.PI*2);g.stroke();}
    }});}
    data.people.forEach((p,i)=>items.push({y:map.people[i%map.people.length].y,draw:()=>this.person(g,p,i,now)}));
    const sitting=map.objects.find(o=>o.seats?.some(s=>Math.hypot(s.x-actor.x,s.y-actor.y)<4));
    items.push({y:sitting?sitting.depth+1:actor.y,draw:()=>drawOriginalActor(g,{...actor,moving:actor.moving&&!this.reduced},now)});
    if(data.peer&&Number.isFinite(data.peer.roomX)&&Number.isFinite(data.peer.roomY)){
      const p=decodePosition(data.peer,map),seat=distanceToSeat(p,map);if(p.x>=0&&p.x<=map.width&&p.y>=0&&p.y<=map.height){
        const owner=seat?.distance<10?seat.object:null;items.push({y:owner?owner.depth+2:p.y,draw:()=>drawOriginalActor(g,{...p,role:actor.role==='jc'?'gabi':'jc',face:['up','down','left','right'].includes(data.peer.face)?data.peer.face:'down',pose:owner?'sit':'stand',moving:false},now)});}
    }
    // Small living details; these are ambient birds, never substitute players.
    for(let i=0;i<5;i++){const cx=map.id==='park'?689:685,cy=map.id==='park'?522:760;
      const d=this.reduced?0:Math.sin(now/1700+i)*7,x=cx+(i-2)*26+d,y=cy+(i%2)*18;items.push({y,draw:()=>this.sprite(g,'pigeons',x,y-12,28,14)});}
    items.sort((a,b)=>a.y-b.y);for(const i of items)i.draw();
    if(map.id==='plaza'){
      const phase=this.reduced?0:Math.sin(now/330)*2;g.strokeStyle='#c9ece3bb';g.lineWidth=1;
      for(const x of [601,640,678]){g.beginPath();g.moveTo(x,486);g.quadraticCurveTo(x+7,450+phase,x+12,505);g.stroke();}
    }
    g.restore();const night=data.time>=1200||data.time<360;
    if(night)box(g,0,0,w,h,'#1d304b66');else if(data.weather.isWet)box(g,0,0,w,h,'#344e6322');
    if(night){g.save();g.translate(this.offset.x,this.offset.y);g.scale(this.scale,this.scale);if(!this.overview)g.translate(-this.camera.x,-this.camera.y);
      for(const o of map.objects.filter(o=>o.sprite==='lamp')){const x=o.x+o.w/2,y=o.y+o.h*.23;g.fillStyle='#f4ce8355';g.beginPath();g.ellipse(x,y,17,22,0,0,Math.PI*2);g.fill();box(g,x-3,y-4,6,8,'#ffe2a5');}g.restore();}
    if(data.weather.isWet&&!this.reduced){g.strokeStyle='#d3e3df66';g.beginPath();for(let i=0;i<36;i++){const x=(i*71+now/24)%(w+20)-10,y=(i*129+now/10)%(h+20)-10;g.moveTo(x,y);g.lineTo(x-2,y+7);}g.stroke();}
  }
  worldPoint(e){const b=this.canvas.getBoundingClientRect(),x=(e.clientX-b.left)*this.canvas.width/b.width,y=(e.clientY-b.top)*this.canvas.height/b.height;
    return {x:(x-this.offset.x)/this.scale+(this.overview?0:this.camera.x),y:(y-this.offset.y)/this.scale+(this.overview?0:this.camera.y)};}
  destroy(){this.observer.disconnect();}
}
