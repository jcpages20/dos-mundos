import {FARM} from './farm-map.mjs';
import {cropStatus} from './farm-model.mjs';
import {loadFarmAssets} from './farm-assets.mjs';
import {loadOriginalActors,drawOriginalActor} from '../characters/original-actor.mjs';

const noise=(x,y)=>{const n=Math.sin(x*19.23+y*33.31)*41371.51;return n-Math.floor(n);};
const box=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
export class FarmRenderer{
  constructor(canvas){
    this.canvas=canvas;this.g=canvas.getContext('2d');this.camera={x:0,y:0};this.overview=false;this.scale=1;this.offset={x:0,y:0};
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.ground=this.makeGround();
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();
  }
  async load(){[this.art]=await Promise.all([loadFarmAssets(),loadOriginalActors()]);}
  resize(){const b=this.canvas.getBoundingClientRect();this.canvas.width=Math.max(160,Math.round(b.width/1.3));this.canvas.height=Math.max(120,Math.round(b.height/1.3));this.g.imageSmoothingEnabled=false;}
  sprite(g,atlas,key,x,y,h,w=null){
    const sheet=this.art?.[atlas],f=sheet?.frames[key];if(!f)return;w??=h*f[2]/f[3];
    g.drawImage(sheet.image,...f,Math.round(x-w/2),Math.round(y-h),Math.round(w),Math.round(h));
  }
  makeGround(){
    const c=document.createElement('canvas');c.width=FARM.width;c.height=FARM.height;const g=c.getContext('2d');
    box(g,0,0,c.width,c.height,'#819761');
    for(let y=0;y<c.height;y+=8)for(let x=0;x<c.width;x+=8){
      box(g,x,y,8,8,['#849967','#899f6b','#7e9463','#8ca16e'][Math.floor(noise(x,y)*4)]);
      if(noise(x+3,y)>.7)box(g,x+3,y+4,2,1,'#bcc18b66');
    }
    const path=(x,y,w,h)=>{
      box(g,x-3,y-3,w+6,h+6,'#b8ab83');
      for(let py=y;py<y+h;py+=12)for(let px=x;px<x+w;px+=24){
        box(g,px,py,Math.min(23,x+w-px),Math.min(11,y+h-py),noise(px,py)>.5?'#d8c9a5':'#d1c19b');
        box(g,px+2,py+2,Math.max(0,Math.min(20,x+w-px-3)),1,'#e6d9b666');
      }
    };
    path(26,236,1068,45);path(26,704,1068,35);path(520,236,64,644);
    for(const x of [278,540,802])path(x,280,28,424);
    for(const y of [412,552])path(26,y,1068,22);
    path(26,846,1068,30);
    for(let i=0;i<120;i++){
      const x=36+Math.floor(noise(i,7)*1048),y=35+Math.floor(noise(i,93)*167);
      box(g,x,y,2,1,i%3?'#cfd69a':'#d5bd8a');
    }
    return c;
  }
  plot(g,p,data,selected,now){
    const unlocked=p.index<data.plants.length,plant=data.plants[p.index],status=cropStatus(plant,data.catalog);
    if(unlocked){
      box(g,p.x,p.y+5,p.w,p.h-3,'#b49a72');box(g,p.x+3,p.y+9,p.w-6,p.h-10,'#72513c');
      const wet=status&&!status.dry;
      for(let y=p.y+13;y<p.y+p.h-9;y+=10){
        box(g,p.x+8,y,p.w-16,5,wet?'#614a39':'#896044');box(g,p.x+9,y+5,p.w-18,2,wet?'#493d30':'#60442f');
        for(let x=p.x+12;x<p.x+p.w-10;x+=13)if(noise(x,y)>.5)box(g,x,y+1,2,1,'#b18a5f66');
      }
      if(status&&!status.unknown){
        const height=[17,31,47,59][status.stage];
        for(const y of [p.y+42,p.y+76])for(const x of [p.x+41,p.x+111,p.x+181]){
          this.sprite(g,'crops',plant.type+'-'+status.stage,x,y,height);
        }
        if(status.ready){g.strokeStyle='#e8ce83';g.lineWidth=2;g.strokeRect(p.x+2,p.y+5,p.w-4,p.h-5);}
      }
    }else{
      box(g,p.x,p.y+9,p.w,p.h-9,'#73875b');
      for(let i=0;i<8;i++){const x=p.x+15+i*26,y=p.y+39+(i%2)*26;this.sprite(g,'crops','cosmos-2',x,y,21);}
      box(g,p.x+87,p.y+29,48,26,'#5e6852');box(g,p.x+105,p.y+34,13,13,'#bcb18b');box(g,p.x+108,p.y+30,7,7,'#e2cf9f');
    }
    box(g,p.x+7,p.y+p.h-5,25,15,'#92754e');box(g,p.x+9,p.y+p.h-4,21,11,'#dac49a');
    g.fillStyle='#4a4a37';g.font='bold 9px monospace';g.textAlign='center';g.fillText(String(p.index+1).padStart(2,'0'),p.x+19,p.y+p.h+5);
    if(selected){g.strokeStyle='#ffe3a4';g.lineWidth=2;g.strokeRect(p.x-3,p.y+1,p.w+6,p.h+4);}
  }
  surroundings(g){
    for(let x=18;x<FARM.width-30;x+=100){
      this.sprite(g,'environment','fence',x+50,38,31,100);
      if(x<450||x>584)this.sprite(g,'environment','fence',x+50,883,31,100);
    }
    for(const [x,y] of [[30,272],[1080,274],[30,701],[1080,701]])this.sprite(g,'environment','apple-tree',x,y,105);
    for(let i=0;i<12;i++){
      const x=42+i*91;this.sprite(g,'crops',i%2?'cosmos-3':'wheat-3',x,302,25);
      this.sprite(g,'crops',i%2?'wheat-3':'cosmos-3',x,746,25);
    }
    this.sprite(g,'environment','gate',552,884,89,104);
  }
  actor(g,actor,working,now){
    g.save();const bending=working&&['plant','harvest','fertilize'].includes(working.type);
    if(bending){g.translate(actor.x,actor.y);g.scale(1,.88);drawOriginalActor(g,{...actor,x:0,y:0,pose:'stand',moving:false},now);}
    else drawOriginalActor(g,{...actor,pose:'stand',moving:actor.moving&&!this.reduced},now);
    g.restore();if(!working)return;
    const t=now-working.started;
    if(working.type==='water'){
      box(g,actor.x+7,actor.y-39,13,10,'#8ca1a0');box(g,actor.x+18,actor.y-41,9,3,'#c4cfba');
      for(let i=0;i<9;i++){const y=this.reduced?i*2:(t/28+i*5)%20;box(g,actor.x+25+i%3*3,actor.y-39+y,1,3,'#b9e3db');}
    }else{
      for(let i=0;i<7;i++){
        const phase=this.reduced?.5:(t/600+i/7)%1,x=actor.x+(i-3)*6,y=actor.y-12-Math.sin(phase*Math.PI)*27;
        box(g,x,y,2,2,working.type==='harvest'?'#dfc275':'#a98553');
      }
    }
  }
  render(actor,data,target,working,now){
    const g=this.g,w=this.canvas.width,h=this.canvas.height;g.imageSmoothingEnabled=false;g.clearRect(0,0,w,h);
    if(this.overview){this.scale=Math.min(w/FARM.width,h/FARM.height);this.offset={x:(w-FARM.width*this.scale)/2,y:(h-FARM.height*this.scale)/2};}
    else{this.scale=1;this.offset={x:0,y:0};this.camera={x:Math.max(0,Math.min(FARM.width-w,actor.x-w/2)),y:Math.max(0,Math.min(FARM.height-h,actor.y-h*.58))};}
    g.save();if(this.overview){g.translate(this.offset.x,this.offset.y);g.scale(this.scale,this.scale);}else g.translate(-this.camera.x,-this.camera.y);
    g.drawImage(this.ground,0,0);this.surroundings(g);
    const items=[];
    for(const p of FARM.plots)items.push({y:p.depth,draw:()=>this.plot(g,p,data,target?.id===p.id,now)});
    for(const object of FARM.objects)items.push({y:object.depth,draw:()=>this.sprite(g,'environment',object.sprite,object.x+object.w/2,object.y+object.h,object.h,object.w)});
    items.push({y:actor.y,draw:()=>this.actor(g,actor,working,now)});items.sort((a,b)=>a.y-b.y);for(const i of items)i.draw();g.restore();
    const hour=data.time/60;if(hour>=20||hour<6){box(g,0,0,w,h,'#19374666');}
    else if(data.weather.isWet)box(g,0,0,w,h,'#39565322');
    if(data.weather.isWet&&!this.reduced){g.strokeStyle='#d1e5dc55';g.beginPath();for(let i=0;i<38;i++){
      const x=(i*71+now/24)%(w+20)-10,y=(i*129+now/10)%(h+20)-10;g.moveTo(x,y);g.lineTo(x-2,y+8);}g.stroke();}
  }
  worldPoint(event){
    const b=this.canvas.getBoundingClientRect(),x=(event.clientX-b.left)*this.canvas.width/b.width,y=(event.clientY-b.top)*this.canvas.height/b.height;
    return this.overview?{x:(x-this.offset.x)/this.scale,y:(y-this.offset.y)/this.scale}:{x:x+this.camera.x,y:y+this.camera.y};
  }
  destroy(){this.observer.disconnect();}
}
