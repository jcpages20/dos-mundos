import {drawPet,sprite} from './pet-assets.mjs';
import {BALL_HOME,BOWL,TREAT} from './care-session.mjs';
export class PetRenderer{
  constructor(canvas,art){this.canvas=canvas;this.g=canvas.getContext('2d');this.art=art;canvas.width=640;canvas.height=480;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.floor=document.createElement('canvas');this.floor.width=640;this.floor.height=480;this.background();}
  background(){
    const g=this.floor.getContext('2d');g.fillStyle='#d2ac7b';g.fillRect(0,0,640,480);
    for(let y=0;y<480;y+=32)for(let x=-80;x<640;x+=160){const off=y%64?80:0;g.strokeStyle='#a57c5375';g.strokeRect(x+off,y,160,32);g.fillStyle='#e7c49460';g.fillRect(x+off+5,y+4,149,2);g.fillStyle='#b98b5a60';g.fillRect(x+off+34,y+22,64,1);}
    g.fillStyle='#4a5d51';g.fillRect(0,0,640,65);g.fillStyle='#94a28a';g.fillRect(0,57,640,5);g.fillStyle='#6c4c3a';g.fillRect(0,64,640,9);
    g.fillStyle='#a2bba8';g.fillRect(81,26,98,8);g.fillStyle='#e5dcc3';g.fillRect(90,12,28,15);g.fillRect(132,5,28,22);g.fillStyle='#62855d';g.fillRect(98,2,13,11);g.fillRect(141,0,13,7);
    g.fillStyle='#e7dcc6';g.fillRect(506,6,55,43);g.fillStyle='#a4774e';g.fillRect(511,11,45,33);g.fillStyle='#cfc195';g.fillRect(518,18,30,20);
    g.fillStyle='#7d997e';g.fillRect(54,116,532,307);g.fillStyle='#c9ceaf';g.fillRect(62,124,516,291);g.fillStyle='#8ea58c';g.fillRect(69,131,502,277);
    g.strokeStyle='#c1ccb1';g.lineWidth=3;g.strokeRect(79,141,482,257);for(let x=94;x<560;x+=24){g.fillStyle='#b1c2a3';g.fillRect(x,126,12,3);g.fillRect(x,410,12,3);}
  }
  point(event,bounds){return {x:(event.clientX-bounds.left)*640/bounds.width,y:(event.clientY-bounds.top)*480/bounds.height};}
  item(key,x,y,size){sprite(this.g,this.art.items,key,x-size/2,y-size/2,size,size);}
  halo(x,y,r,now){const g=this.g;g.strokeStyle='#fff0c9b3';g.lineWidth=3;g.setLineDash([9,6]);g.beginPath();g.ellipse(x,y,r,r*.68,0,0,Math.PI*2);g.stroke();g.setLineDash([]);}
  draw(session,now,adopting=false){
    const g=this.g;g.imageSmoothingEnabled=false;g.drawImage(this.floor,0,0);this.item('basket',573,95,102);this.item('towel',54,95,75);
    const kind=session?.kind||'stroke',dog=session?.dog||{x:320,y:325,pose:'idle',face:'down'};
    if(kind==='rest')this.item('bed',320,332,332);
    drawPet(g,this.art,dog,now,270,this.reduced);
    if(['feed','drink'].includes(kind)){this.item(kind==='feed'?'food':'water',BOWL.x,BOWL.y,135);if(session.phase==='ready')this.halo(BOWL.x,BOWL.y,77,now);}
    if(kind==='fetch'){const b=session.ball;this.item('ball',b.x,b.y,62);if(session.phase==='ready')this.halo(BALL_HOME.x,BALL_HOME.y,54,now);}
    if(kind==='train'&&!session.completed){this.item('treat',TREAT.x,TREAT.y,108);if(session.phase==='reward')this.halo(TREAT.x,TREAT.y,62,now);}
    if(kind==='brush'){const c=session?.contact?.point;this.item('brush',c?.x||119,c?.y||380,103);}
    if(kind==='stroke'&&session?.contact){const p=session.contact.point;this.heart(p.x,p.y-24,now);}
    if(session?.completed||adopting){for(const [i,x] of [270,320,370].entries())this.heart(x,92-Math.sin(now/600+i)*(!this.reduced?5:0),now+i*120);}
    if(kind==='rest'){g.fillStyle='#f4e6c3';g.font='bold 24px Georgia';g.fillText('z',395,184);g.font='bold 17px Georgia';g.fillText('z',419,165);}
  }
  heart(x,y,now){const g=this.g;g.fillStyle='#ce756e';g.fillRect(x-8,y-7,6,6);g.fillRect(x+2,y-7,6,6);g.fillRect(x-10,y-2,20,7);g.fillRect(x-7,y+5,14,4);g.fillRect(x-3,y+9,6,4);}
}
