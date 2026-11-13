import {GYM} from './gym-map.mjs';
import {drawOriginalActor,loadOriginalActors} from '../characters/original-actor.mjs';

const noise=(x,y)=>{const n=Math.sin(x*17.1+y*37.2)*43758.54;return n-Math.floor(n);};

export class GymRenderer{
  constructor(canvas){
    this.canvas=canvas;this.g=canvas.getContext('2d');this.camera={x:0,y:0};this.overview=false;
    this.ground=this.makeGround();this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();
  }
  async load(){
    const response=await fetch(new URL('../../assets/gym/gym-atlas.json',import.meta.url));
    if(!response.ok)throw new Error('No se ha podido cargar el material de Atlas.');
    this.atlas=await response.json();this.image=new Image();
    this.image.src=new URL('../../assets/gym/'+this.atlas.image,import.meta.url).href;
    await Promise.all([this.image.decode(),loadOriginalActors()]);
    if(this.image.naturalWidth!==this.atlas.width||this.image.naturalHeight!==this.atlas.height)throw new Error('El atlas del gimnasio está incompleto.');
  }
  resize(){
    const box=this.canvas.getBoundingClientRect();this.canvas.width=Math.max(160,Math.round(box.width/1.5));
    this.canvas.height=Math.max(120,Math.round(box.height/1.5));this.g.imageSmoothingEnabled=false;
  }
  makeGround(){
    const canvas=document.createElement('canvas');canvas.width=GYM.width;canvas.height=GYM.height;
    const g=canvas.getContext('2d');g.fillStyle='#d3c3a5';g.fillRect(0,0,canvas.width,canvas.height);
    for(let y=64;y<792;y+=16)for(let x=24;x<1032;x+=16){
      g.fillStyle=(x+y)%32?'#cfbea2':'#d9c8a9';g.fillRect(x,y,16,16);
      g.fillStyle='#b7aa913d';g.fillRect(x,y+15,16,1);
    }
    for(const zone of GYM.zones.filter(zone=>zone.id!=='lobby')){
      g.save();g.beginPath();g.rect(zone.x,zone.y,zone.w,zone.h);g.clip();
      if(zone.floor==='rubber'){
        for(let y=zone.y;y<zone.y+zone.h;y+=24)for(let x=zone.x;x<zone.x+zone.w;x+=24){
          g.fillStyle=['#466064','#4b6666','#435e63'][Math.floor(noise(x,y)*3)];g.fillRect(x,y,24,24);
          g.fillStyle='#2d454a';g.fillRect(x,y+23,24,1);g.fillRect(x+23,y,1,24);
          for(let k=0;k<5;k++){g.fillStyle=k%2?'#71837c55':'#263e4655';g.fillRect(x+3+Math.floor(noise(x+k,y)*17),y+4+k*3,1,1);}
        }
      }else{
        for(let y=zone.y;y<zone.y+zone.h;y+=16)for(let x=zone.x-32;x<zone.x+zone.w;x+=48){
          const px=x+(y%32?24:0);g.fillStyle=['#bf9169','#ba875e','#c8986d'][Math.floor(noise(x,y)*3)];g.fillRect(px,y,48,16);
          g.fillStyle='#e4b98477';g.fillRect(px+1,y+1,46,1);g.fillStyle='#8c644c88';g.fillRect(px,y+15,48,1);g.fillRect(px+47,y,1,16);
          for(let i=0;i<3;i++){g.fillStyle='#986d5140';g.fillRect(px+6+i*9,y+5+i*3,12,1);}
        }
      }
      g.restore();g.strokeStyle='#d0b686';g.lineWidth=3;g.strokeRect(zone.x+2,zone.y+2,zone.w-4,zone.h-4);
    }
    // Woven mats and the broad circulation aisles are part of the floor.
    for(const rug of [{x:44,y:622,w:376,h:130,c:'#bb9ba3'},{x:608,y:594,w:336,h:100,c:'#8a9f87'}]){
      g.fillStyle='#55454b30';g.fillRect(rug.x+3,rug.y+5,rug.w,rug.h);g.fillStyle=rug.c;g.fillRect(rug.x,rug.y,rug.w,rug.h);
      g.strokeStyle='#e4d1af';g.lineWidth=2;g.strokeRect(rug.x+6,rug.y+6,rug.w-12,rug.h-12);
      for(let y=rug.y+14;y<rug.y+rug.h-10;y+=8)for(let x=rug.x+14;x<rug.x+rug.w-10;x+=8){g.fillStyle='#eedcc922';g.fillRect(x,y,2,1);}
    }
    for(const [label,x,y,color] of [['FUERZA',254,98,'#c8d8bd'],['CARDIO',812,98,'#c8d8bd'],['TELAS · GABI',248,514,'#603e50'],['MOVILIDAD',812,514,'#526b59']]){
      g.font='bold 12px monospace';g.textAlign='center';g.fillStyle=color;g.fillText(label,x,y);
    }
    g.fillStyle='#385758';g.fillRect(482,778,60,24);g.fillStyle='#d1ad79';g.fillRect(486,782,52,4);
    return canvas;
  }
  sprite(g,key,box){
    const frame=this.atlas?.frames[key];if(!frame||!this.image?.complete)return;
    g.drawImage(this.image,...frame,Math.round(box.x),Math.round(box.y),box.w,box.h);
  }
  walls(g){
    for(const wall of GYM.walls){
      g.fillStyle='#374f4d';g.fillRect(wall.x,wall.y-24,wall.w,wall.h+24);
      g.fillStyle='#d6bd93';g.fillRect(wall.x+1,wall.y-22,wall.w-2,wall.h+18);
      g.fillStyle='#eed6ac';g.fillRect(wall.x+1,wall.y-22,wall.w-2,3);
      g.fillStyle='#9b7855';g.fillRect(wall.x,wall.y+wall.h-5,wall.w,5);
      if(wall.w>wall.h)for(let x=wall.x+12;x<wall.x+wall.w;x+=24){g.fillStyle='#a7927166';g.fillRect(x,wall.y-18,1,wall.h+9);}
    }
  }
  window(g,box,state,now){
    const h=(state.time/60)%24,night=h>=20||h<6;
    g.fillStyle='#6c6656';g.fillRect(box.x-3,box.y-3,box.w+6,box.h+6);
    g.fillStyle=night?'#32465e':'#9fc6c6';g.fillRect(box.x,box.y,box.w,box.h);
    if(night){g.fillStyle='#e6ddba';g.fillRect(box.x+box.w-31,box.y+9,12,12);}
    else{g.fillStyle='#f2dfb0';g.fillRect(box.x+box.w-38,box.y+10,20,18);const drift=this.reduced?0:Math.floor(Math.sin(now/14000)*8);g.fillStyle='#e5e4cb';g.fillRect(box.x+14+drift,box.y+16,40,3);}
    for(let i=0;i<6;i++){const x=box.x+i*box.w/6;g.fillStyle=i%2?'#7b8e8e':'#b79880';g.fillRect(x,box.y+box.h-20-i%3*7,box.w/6-2,28);}
    g.fillStyle='#e8d6b6';g.fillRect(box.x+box.w/2-2,box.y,4,box.h);g.fillRect(box.x,box.y+box.h-3,box.w,5);
  }
  animatedEquipment(g,object,now){
    if(object.sprite==='treadmill'){
      const x=object.x+object.w*.3,y=object.y+object.h*.64,w=object.w*.42,h=object.h*.23;
      g.fillStyle='#283a3a';g.fillRect(x,y,w,h);g.fillStyle='#4c605a';
      for(let i=0;i<5;i++){const offset=this.reduced?0:Math.floor(now/180)%7;g.fillRect(x+2,y+(i*7+offset)%h,w-4,1);}
      g.fillStyle='#edc782';g.fillRect(object.x+object.w*.36,object.y+object.h*.11,object.w*.23,2);
    }
    if(object.sprite==='spin-bike'&&!this.reduced){
      const x=object.x+object.w*.53,y=object.y+object.h*.65,a=now/600;
      g.strokeStyle='#b9bca5';g.lineWidth=2;g.beginPath();g.moveTo(x-Math.cos(a)*6,y-Math.sin(a)*6);g.lineTo(x+Math.cos(a)*6,y+Math.sin(a)*6);g.stroke();
    }
    if(object.action==='silks'&&!this.reduced){
      g.fillStyle=object.id==='silks-burgundy'?'#ce889b55':'#d4b6e455';
      g.fillRect(object.x+object.w*.5+Math.floor(Math.sin(now/1400)*2),object.y+object.h*.3,1,object.h*.4);
    }
  }
  actor(g,actor,training,now){
    if(!training){drawOriginalActor(g,actor,now);return;}
    const elapsed=now-training.started;
    const object=training.object;
    if(training.type==='silks'){
      const lift=Math.sin(Math.min(1,elapsed/1000)*Math.PI/2)*43;
      g.fillStyle='#3d304733';g.beginPath();g.ellipse(actor.x,object.y+object.h-12,17,5,0,0,Math.PI*2);g.fill();
      g.strokeStyle=object.id==='silks-burgundy'?'#79364e':'#9476ac';g.lineWidth=4;
      g.beginPath();g.moveTo(object.x+object.w*.5,object.y+15);g.lineTo(actor.x+2,actor.y-lift-27);g.stroke();
      g.save();g.translate(actor.x,actor.y-lift);g.rotate(this.reduced?-.6:-.6+Math.sin(elapsed/900)*.11);
      drawOriginalActor(g,{...actor,x:0,y:0,face:'right',pose:'stand',moving:false},now);
      g.strokeStyle=object.id==='silks-burgundy'?'#b35b78':'#b69acb';g.lineWidth=4;g.beginPath();g.moveTo(-12,-25);g.lineTo(12,-20);g.stroke();g.restore();
    }else if(training.type==='stretch'){
      g.save();g.translate(actor.x,actor.y);g.rotate(-Math.PI/2+(this.reduced?0:Math.sin(elapsed/1000)*.025));
      drawOriginalActor(g,{...actor,x:0,y:0,pose:'stand',moving:false},now);g.restore();
    }else{
      const seated=training.type==='rest'||['bike','rower','legpress','bench'].includes(object.id);
      const bob=!this.reduced&&seated?Math.sin(elapsed/420)*1.2:0;
      drawOriginalActor(g,{...actor,y:actor.y+bob,pose:seated?'sit':'stand',moving:training.type==='cardio'&&!seated},this.reduced?0:now);
      if(training.type==='weights'){
        const lift=this.reduced?0:Math.sin(elapsed/240)*4,x=actor.x,y=actor.y-28+lift;
        if(object.id==='cables'){
          g.strokeStyle='#bfc5af';g.lineWidth=1;g.beginPath();g.moveTo(object.x+13,object.y+28);g.lineTo(x-15,y+7);g.moveTo(object.x+object.w-13,object.y+28);g.lineTo(x+15,y+7);g.stroke();
          g.fillStyle='#253c43';g.fillRect(x-18,y+5,6,4);g.fillRect(x+12,y+5,6,4);
        }else if(object.id==='dumbbells'||object.id==='bench'){
          for(const dx of [-18,14]){g.fillStyle='#c8c8ad';g.fillRect(x+dx-4,y+4,12,2);g.fillStyle='#283d48';g.fillRect(x+dx-6,y,4,10);g.fillRect(x+dx+6,y,4,10);}
        }else if(object.id!=='legpress'){
          g.fillStyle='#d3cfb6';g.fillRect(x-21,y,42,3);g.fillStyle='#283d48';for(const dx of [-24,-20,17,21])g.fillRect(x+dx,y-5,4,13);
        }
      }else if(training.type==='water'){
        g.fillStyle='#e7dfc1';g.fillRect(actor.x+12,actor.y-30,7,9);g.fillStyle='#a2c9c6';g.fillRect(actor.x+13,actor.y-30,5,2);
      }
    }
  }
  draw(actor,state,target,training,now){
    if(!this.atlas)return;
    const g=this.g,canvas=this.canvas;g.setTransform(1,0,0,1,0,0);g.fillStyle='#243e40';g.fillRect(0,0,canvas.width,canvas.height);
    if(this.overview){const scale=Math.min(canvas.width/GYM.width,canvas.height/GYM.height);this.transform={x:(canvas.width-GYM.width*scale)/2,y:(canvas.height-GYM.height*scale)/2,scale};}
    else{
      const targetX=Math.max(0,Math.min(GYM.width-canvas.width,actor.x-canvas.width/2));
      const targetY=Math.max(0,Math.min(GYM.height-canvas.height,actor.y-canvas.height*.6));
      this.camera.x+=(targetX-this.camera.x)*.16;this.camera.y+=(targetY-this.camera.y)*.16;
      this.transform={x:-Math.round(this.camera.x),y:-Math.round(this.camera.y),scale:1};
    }
    const t=this.transform;g.save();g.translate(t.x,t.y);g.scale(t.scale,t.scale);g.drawImage(this.ground,0,0);this.walls(g);
    for(const box of GYM.windows)this.window(g,box,state,now);
    for(const box of GYM.mirrors)this.sprite(g,'mirror',box);
    const queue=GYM.objects.map(object=>({depth:object.depth,draw:()=>{this.sprite(g,object.sprite,object);this.animatedEquipment(g,object,now);}}));
    queue.push({depth:training?training.object.depth+1:actor.y+.1,draw:()=>this.actor(g,actor,training,now)});
    queue.sort((a,b)=>a.depth-b.depth).forEach(item=>item.draw());
    if(target&&!training){
      const point=target.approaches[0];g.strokeStyle='#fff2ceaa';g.lineWidth=1;
      g.beginPath();g.ellipse(point.x,point.y,10,4,0,0,Math.PI*2);g.stroke();
    }
    if((state.time/60)%24>=20||(state.time/60)%24<6){g.fillStyle='#24365330';g.fillRect(0,64,GYM.width,752);}
    // Warm pendant pools soften the steel and mark the circulation aisle.
    for(const [x,y] of [[512,300],[512,488],[180,500],[828,500]]){
      for(let ring=4;ring>0;ring--){g.fillStyle='#ffdda309';g.fillRect(x-ring*12,y-ring*9,ring*24,ring*18);}
      g.fillStyle='#e3c694';g.fillRect(x-9,y-8,18,3);g.fillStyle='#fff0bc';g.fillRect(x-6,y-5,12,2);
    }
    g.restore();
  }
  worldPoint(event){const box=this.canvas.getBoundingClientRect(),t=this.transform;if(!t)return null;return{x:((event.clientX-box.left)*this.canvas.width/box.width-t.x)/t.scale,y:((event.clientY-box.top)*this.canvas.height/box.height-t.y)/t.scale};}
  destroy(){this.observer.disconnect();}
}
