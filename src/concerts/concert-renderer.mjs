import {loadConcertAssets,loadConcertMotion} from './concert-assets.mjs?conciertos=17';
import {loadOutdoorAssets} from '../outdoors/outdoor-assets.mjs';
import {drawOriginalActor} from '../characters/original-actor.mjs';
const rect=(g,x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
export const AUDIENCE=[{x:220,y:436},{x:357,y:455},{x:622,y:435},{x:756,y:476},{x:256,y:555},{x:679,y:590}];
export class ConcertRenderer{
  constructor(canvas,artist){this.canvas=canvas;this.artist=artist;this.g=canvas.getContext('2d');this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.resize();}
  async load(){[this.art,this.park]=await Promise.all([loadConcertAssets(),loadOutdoorAssets()]);this.ground=this.background();loadConcertMotion(this.artist).then(motion=>{if(!this.destroyed)this.motion=motion;}).catch(()=>{});}
  resize(){const r=this.canvas.getBoundingClientRect();this.canvas.width=Math.max(160,Math.min(960,Math.round(r.width)));this.canvas.height=Math.max(120,Math.min(760,Math.round(r.height)));this.g.imageSmoothingEnabled=false;}
  sprite(g,id,x,y,w,h,art=this.art){const f=art.frames[id];if(f)g.drawImage(art.image,...f,Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  background(){
    const c=document.createElement('canvas');c.width=960;c.height=960;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
    const sky=g.createLinearGradient(0,0,0,960);sky.addColorStop(0,'#1c3440');sky.addColorStop(.4,'#304843');sky.addColorStop(1,'#526344');g.fillStyle=sky;g.fillRect(0,0,960,960);
    for(let y=335;y<960;y+=8)for(let x=0;x<960;x+=8){const n=(x*53+y*19)%17;rect(g,x,y,8,8,['#4e5c3c','#526340','#586744','#526041'][n%4]);if(n<2)rect(g,x+2,y+4,2,1,'#83936955');}
    for(const baseY of [590,870]){rect(g,100,baseY,760,90,'#b6a17b');for(let y=baseY+5;y<baseY+90;y+=12)for(let x=100;x<860;x+=26)rect(g,x+(y%24?0:12),y,24,10,'#c4b28c');}
    for(const [x,y,w,h] of [[-54,-68,270,350],[744,-73,295,378],[-120,200,260,333],[811,240,244,300]])this.sprite(g,'chestnut',x,y,w,h,this.park);
    this.sprite(g,'stage',112,160,736,225);this.sprite(g,'lights',130,14,700,276);
    // The atlas holds a pair of PA towers. Each half stays independent on stage.
    const f=this.art.frames.speakers;g.drawImage(this.art.image,f[0],f[1],f[2]/2,f[3],70,205,134,175);g.drawImage(this.art.image,f[0]+f[2]/2,f[1],f[2]/2,f[3],755,205,134,175);
    for(const x of [90,835])this.sprite(g,'lamp',x,400,34,130,this.park);
    this.sprite(g,'flower-urn',102,522,58,72,this.park);this.sprite(g,'flower-urn',803,540,58,72,this.park);
    this.sprite(g,'green-bench',124,738,180,100,this.park);this.sprite(g,'green-bench',665,738,180,100,this.park);
    for(const x of [117,812])this.sprite(g,'lamp',x,680,32,120,this.park);
    for(const [x,y] of [[-85,633],[822,626]])this.sprite(g,'chestnut',x,y,235,306,this.park);
    for(const [x,y] of [[336,799],[572,799]])this.sprite(g,'flower-urn',x,y,50,64,this.park);
    return c;
  }
  player(actor,now){
    const g=this.g,beat=this.reduced?0:Math.sin(now/60000*this.artist.bpm*Math.PI*2),dance=actor.pose==='dance',clap=actor.pose==='clap'||actor.pose==='encore';
    g.save();g.translate(actor.x,actor.y);g.scale(1.2,1.2);if(dance){g.translate(beat*3,-Math.abs(beat)*2);g.rotate(beat*.035);}drawOriginalActor(g,{...actor,x:0,y:0,pose:'stand',moving:actor.moving&&!this.reduced},now);
    if(clap){const d=this.reduced?0:Math.round(beat*2);rect(g,-15-d,-34,5,6,'#edc4a0');rect(g,10+d,-34,5,6,'#edc4a0');}
    g.restore();
  }
  render(actor,peer,now,encore=false,show=null){
    if(!this.art)return;const g=this.g,w=this.canvas.width,h=this.canvas.height,portrait=h>w;this.scale=Math.min(w/(portrait?700:960),h/(portrait?960:680));const baseY=(h-(portrait?960:680)*this.scale)/2,visibleBottom=(h-baseY)/this.scale,cameraY=Math.min(Math.max(0,960-visibleBottom),Math.max(0,actor.y-visibleBottom+70));this.offset={x:portrait&&960*this.scale>w?Math.max(w-960*this.scale,Math.min(0,w/2-actor.x*this.scale)):(w-960*this.scale)/2,y:baseY-cameraY*this.scale};
    rect(g,0,0,w,h,'#213932');g.save();g.translate(this.offset.x,this.offset.y);g.scale(this.scale,this.scale);g.drawImage(this.ground,0,0);
    // A slow fade rather than flashing lights; reduced-motion has a fixed wash.
    const sway=this.reduced?0:Math.sin(now/2600)*60;g.save();g.globalAlpha=.13;g.fillStyle=this.artist.color;g.beginPath();g.moveTo(269,93);g.lineTo(335+sway,376);g.lineTo(667+sway,376);g.closePath();g.fill();g.fillStyle=this.artist.light;g.beginPath();g.moveTo(696,93);g.lineTo(257-sway,376);g.lineTo(580-sway,376);g.closePath();g.fill();g.restore();
    const performing=show&&['live','show'].includes(show.phase),bob=this.reduced||!performing?0:Math.sin(now/480)*1.1,shared=this.art.shared.frames[this.artist.art];
    g.save();if(show?.phase==='intro'&&!this.reduced){g.globalAlpha=Math.min(1,show.intro/1.5);g.translate(0,Math.max(0,1-show.intro/3)*34);}
    const frame=this.motion?.frames[this.artist.id]?.[this.reduced?0:show?.phase==='finished'?2:show?.frame(this.artist.bpm)||0];
    if(frame){const scale=Math.min(512/frame[2],252/frame[3]),w=frame[2]*scale,h=frame[3]*scale;g.drawImage(this.motion.image,...frame,480-w/2,356-h+bob,w,h);}
    else if(shared){const h=252,w=h*shared[2]/shared[3];this.sprite(g,this.artist.art,480-w/2,106+bob,w,h,this.art.shared);}else this.sprite(g,this.artist.art,224,100+bob,512,256);g.restore();
    if(this.artist.art==='chemical'){for(let i=0;i<14;i++){const v=this.reduced?10:7+Math.abs(Math.sin(now/550+i*.7))*16;rect(g,353+i*17,226-v,8,v,i%2?this.artist.color:this.artist.light);}}
    g.font='bold 12px monospace';g.textAlign='center';g.fillStyle='#f6dfb0';g.fillText(show?.phase==='intro'?'SUBEN LOS MÚSICOS · '+Math.max(1,Math.ceil(3-show.intro)):show?.phase==='finished'?'GRACIAS, MADRID':encore?'UNA MÁS, BAJO LAS ESTRELLAS':show?.phase==='live'?'EN CONCIERTO · EL RETIRO':'LAS NOCHES DEL RETIRO',480,377);
    const items=AUDIENCE.map((p,i)=>({y:p.y,draw:()=>{const keys=Object.keys(this.park.neighbors.frames).filter(k=>k.endsWith('-up')),f=this.park.neighbors.frames[keys[i%keys.length]],beat=this.reduced?0:Math.sin(now/520+i),move=performing?beat*3:0,bounce=performing?Math.abs(beat)*2:0;g.drawImage(this.park.neighbors.image,...f,p.x-14+move,p.y-52-bounce,28,52);if(performing&&(encore||i%3===0)){rect(g,p.x-17,p.y-40+beat*3,4,7,'#dfb795');rect(g,p.x+13,p.y-40-beat*3,4,7,'#dfb795');}}}));
    items.push({y:actor.y,draw:()=>this.player(actor,now)});if(peer)items.push({y:peer.y,draw:()=>this.player(peer,now)});items.sort((a,b)=>a.y-b.y);for(const item of items)item.draw();
    if(show?.phase==='intro'){g.font='bold 54px monospace';g.textAlign='center';g.strokeStyle='#213932';g.lineWidth=7;const count=String(Math.max(1,Math.ceil(3-show.intro)));g.strokeText(count,480,457);g.fillStyle='#ffe5ac';g.fillText(count,480,457);}
    if(!this.reduced){g.fillStyle='#f3d3a1';for(let i=0;i<7;i++){const t=(now/9000+i*.163)%1;g.globalAlpha=Math.sin(t*Math.PI)*.65;g.fillRect(150+(i*137)%680+Math.sin(now/2200+i)*14,390+t*190,2,2);}g.globalAlpha=1;}
    g.restore();
  }
  point(event){const b=this.canvas.getBoundingClientRect();return {x:((event.clientX-b.left)*this.canvas.width/b.width-this.offset.x)/this.scale,y:((event.clientY-b.top)*this.canvas.height/b.height-this.offset.y)/this.scale};}
  destroy(){this.destroyed=true;this.observer.disconnect();}
}
