import {DISHES,cutLine,servingSource,WORK_CENTER,clamp} from './recipes.mjs';
import {drawOriginalActor,loadOriginalActors} from '../characters/original-actor.mjs?cocina=11';

export class KitchenRenderer {
  constructor(canvas,houseRenderer){this.canvas=canvas;this.g=canvas.getContext('2d');this.house=houseRenderer;canvas.width=480;canvas.height=480;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas.parentElement);this.resize();}
  resize(){const b=this.canvas.parentElement.getBoundingClientRect(),size=Math.max(1,Math.min(b.width,b.height));this.canvas.style.width=size+'px';this.canvas.style.height=size+'px';}
  destroy(){this.resizeObserver.disconnect();}
  async load(){
    const r=await fetch(new URL('../../assets/kitchen/kitchen-atlas.json',import.meta.url));if(!r.ok)throw new Error('No se encuentra el material de cocina.');this.atlas=await r.json();
    const image=new Image();image.src=new URL('../../assets/kitchen/'+this.atlas.image,import.meta.url).href;await Promise.all([image.decode(),loadOriginalActors()]);
    if(image.width!==this.atlas.width||image.height!==this.atlas.height)throw new Error('El material de cocina está incompleto.');
    // Chroma key is applied once at load, as in a handheld sprite pipeline.
    // The generated source PNG is kept byte-for-byte with its manifest.
    const sheet=document.createElement('canvas');sheet.width=image.width;sheet.height=image.height;const g=sheet.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0);
    if(this.atlas.chroma==='magenta'){const data=g.getImageData(0,0,sheet.width,sheet.height);for(let i=0;i<data.data.length;i+=4){const r=data.data[i],green=data.data[i+1],b=data.data[i+2];if(r>80&&b>80&&green<Math.min(r,b)*.55)data.data[i+3]=0;}g.putImageData(data,0,0);}
    this.image=sheet;this.background=this.makeBackground();
  }
  sprite(g,key,x,y,w,h,sub=null){const f=this.atlas?.frames[key];if(!f||!this.image)return;let [sx,sy,sw,sh]=f;if(sub){sx+=sub[0]*sw;sy+=sub[1]*sh;sw*=sub[2];sh*=sub[3];}g.imageSmoothingEnabled=false;g.drawImage(this.image,sx,sy,sw,sh,x,y,w,h);}
  makeBackground(){
    const c=document.createElement('canvas');c.width=480;c.height=480;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
    g.fillStyle='#718b7b';g.fillRect(0,0,480,480);
    for(let y=15;y<145;y+=26)for(let x=0;x<480;x+=26){g.fillStyle=(x+y)%52?'#e3d7b9':'#d9d6b9';g.fillRect(x+1,y+1,24,24);g.fillStyle='#f4e7cb';g.fillRect(x+3,y+3,20,1);}
    for(const x of [6,102,302,398]){g.fillStyle='#344e48';g.fillRect(x+2,3,78,59);g.fillStyle='#77907b';g.fillRect(x,0,78,58);g.strokeStyle='#a9b096';g.strokeRect(x+5,5,67,45);g.fillStyle='#d3b577';g.fillRect(x+62,28,7,3);}
    g.fillStyle='#41595b';g.fillRect(191,6,92,96);g.fillStyle='#a7c4c1';g.fillRect(196,11,82,83);
    for(let i=0;i<5;i++){g.fillStyle=i%2?'#ab8370':'#8c9391';g.fillRect(197+i*17,64-i%3*7,15,29+i%3*7);g.fillStyle='#4d6561';g.fillRect(201+i*17,71-i%3*7,3,4);}
    g.fillStyle='#edddbd';g.fillRect(235,10,4,86);g.fillRect(195,49,84,4);g.fillRect(186,98,102,5);
    this.house?.sprite(g,'fridge',{x:6,y:63,w:54,h:91});this.house?.sprite(g,'counter',{x:305,y:78,w:87,h:79});this.house?.sprite(g,'plant',{x:407,y:78,w:49,h:65});
    g.fillStyle='#82674e';g.fillRect(0,149,480,331);g.fillStyle='#bd986f';g.fillRect(0,152,480,328);
    for(let y=154;y<480;y+=28){g.fillStyle=y%56?'#bd986f':'#c29d74';g.fillRect(0,y,480,27);g.fillStyle='#997858';g.fillRect(0,y+27,480,1);for(let x=9;x<480;x+=47){g.fillStyle='#d5b68b88';g.fillRect(x,y+8,23,1);g.fillStyle='#a07a5680';g.fillRect(x+9,y+17,16,1);}}
    g.fillStyle='#e3cca6';g.fillRect(0,149,480,4);g.fillStyle='#826449';g.fillRect(0,474,480,6);
    // Folded tea towel, utensil rail and herb pot complete the work station.
    g.fillStyle='#a4b6ac';g.fillRect(403,366,65,84);for(let x=407;x<466;x+=8){g.fillStyle='#d7dfce';g.fillRect(x,370,2,75);}
    g.strokeStyle='#8b7051';g.lineWidth=3;g.beginPath();g.moveTo(78,102);g.lineTo(173,102);g.stroke();
    this.sprite(g,'spoon',100,92,37,57);this.sprite(g,'knife',144,90,42,60);
    return c;
  }
  plate(g,x,y,r){g.fillStyle='#4f463733';g.beginPath();g.ellipse(x+3,y+7,r,r*.78,0,0,Math.PI*2);g.fill();g.fillStyle='#e9dfc6';g.beginPath();g.ellipse(x,y,r,r*.8,0,0,Math.PI*2);g.fill();g.strokeStyle='#b9b59c';g.lineWidth=3;g.stroke();g.strokeStyle='#fff1d2';g.beginPath();g.ellipse(x,y-1,r*.84,r*.66,0,0,Math.PI*2);g.stroke();}
  foodPieces(g,kind,x,y,count=10,progress=1){
    if(kind==='pasta'){g.strokeStyle='#e4c587';g.lineWidth=3;for(let i=0;i<10;i++){g.beginPath();g.ellipse(x+i%3*5-5,y+i%4*3-5,20-i%3*3,12+i%2*2,i*.45,0,Math.PI*1.8);g.stroke();}return;}
    if(kind==='omelet'){g.fillStyle='#d8ac4f';g.beginPath();g.ellipse(x,y,45,30,0,0,Math.PI*2);g.fill();this.foodPieces(g,'pepper',x,y,7);return;}
    for(let i=0;i<count;i++){const px=x+Math.cos(i*2.37)*((i%3)*15+18),py=y+Math.sin(i*2.37)*((i%4)*11+13);
      if(kind==='rice'){g.fillStyle='#f4e9c7';g.fillRect(px,py,6,3);g.fillStyle='#d5c7a6';g.fillRect(px+1,py+3,4,1);}
      else{g.fillStyle=kind==='sauce'?'#b54c36':kind==='chicken'?(progress>.65?'#c58b45':'#e0b4a0'):kind==='cheese'?'#ead795':'#6d8e48';g.fillRect(px,py,kind==='chicken'?18:7,kind==='chicken'?12:6);g.fillStyle=kind==='chicken'?'#efd09c':'#b5c46a';g.fillRect(px+2,py+2,kind==='chicken'?10:3,2);}
    }
  }
  preview(canvas,key){const g=canvas.getContext('2d');g.clearRect(0,0,canvas.width,canvas.height);this.sprite(g,key,0,0,canvas.width,canvas.height);}
  draw(game,role,clock=600){
    const g=this.g;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,480,480);if(!this.background)return;g.drawImage(this.background,0,0);
    g.save();g.translate(79,143);g.scale(.82,.82);drawOriginalActor(g,{role,x:0,y:0,face:'down',pose:'stand',moving:false},0);g.fillStyle='#e6d7b3';g.fillRect(-7,-22,14,12);g.fillStyle='#89a493';g.fillRect(-6,-21,12,2);g.restore();
    if(clock/60%24>=20||clock/60%24<6){g.fillStyle='#33475f';g.fillRect(198,12,79,34);g.fillStyle='#e9dfb7';g.fillRect(259,18,8,8);}
    if(!game){for(const [i,key] of ['omelet','pasta','chickenrice'].entries())this.sprite(g,key,19+i*152,219,145,152);this.sprite(g,'rice',183,155,68,65);return;}
    const s=game.state,step=game.step,kind=step.kind,p=game.pointer;
    if(s.phase==='done'){this.sprite(g,DISHES[s.recipe].plate,92,174,295,295);if(s.completed.some(r=>['pan','sauce','saute'].includes(r.kind)&&r.grade<.6))this.charred(g,240,318);return;}
    if(kind==='cut'){
      this.sprite(g,'board',35,146,410,302);
      const edges=[137,...s.cuts.map(i=>cutLine(step,i)*480),352];
      for(let i=0;i<edges.length-1;i++){const separated=i<s.cuts.length,dx=separated?-(s.cuts.length-i)*3:0,dy=separated?4+i*2:0;g.save();g.beginPath();g.rect(edges[i]+dx,174+dy,edges[i+1]-edges[i]-1,222);g.clip();this.sprite(g,step.food,137+dx,176+dy,215,218);g.restore();}
      // Cut seams and a growing pile are drawn in the scene, not baked into a concept image.
      for(let i=0;i<step.cuts;i++){const x=cutLine(step,i)*480;g.strokeStyle=i<s.cuts.length?'#714c35':i===s.cuts.length?'#f4e5b8':'#e1c9a4';g.lineWidth=i===s.cuts.length?3:1;g.setLineDash(i<s.cuts.length?[]:[5,5]);g.beginPath();g.moveTo(x,173);g.lineTo(x,405);g.stroke();}g.setLineDash([]);
      if(s.cuts.length)this.foodPieces(g,step.food==='chicken'?'chicken':step.food==='tomato'?'sauce':'pepper',113,401,s.cuts.length*2,0);
      if(p){g.save();g.translate(p.lastX*480,p.lastY*480);g.rotate(-.55);this.sprite(g,'knife',-45,-68,90,90);g.restore();}else this.sprite(g,'knife',350,190,98,117);
    }else if(kind==='mix'||kind==='wash'){
      this.sprite(g,kind==='wash'?'rice':'bowl',111,162,260,264);
      if(kind==='mix'&&s.eggs<2){for(let i=s.eggs;i<2;i++)this.sprite(g,'eggs',(i===0?.32:.68)*480-43,202,86,124,[i===0?0:.5,0,.5,1]);}
      else{
        g.fillStyle=kind==='wash'?'#bdd3cfbb':'#e9bd55';g.beginPath();g.ellipse(240,287,78,62,0,0,Math.PI*2);g.fill();
        if(kind==='wash')this.foodPieces(g,'rice',239,283,30);else{g.fillStyle='#f7d779';g.beginPath();g.ellipse(220,274,22,17,0,0,Math.PI*2);g.fill();}
        const a=s.turns*Math.PI*2,spoonX=p?p.lastX*480:240+Math.cos(a)*48,spoonY=p?p.lastY*480:287+Math.sin(a)*44;
        g.save();g.translate(spoonX,spoonY);g.rotate(a*.2);this.sprite(g,'spoon',-20,-15,92,134);g.restore();
        g.strokeStyle='#f1e4ba';g.lineWidth=2;g.beginPath();g.arc(240,288,99,-.7,.9);g.stroke();g.beginPath();g.moveTo(300,368);g.lineTo(308,352);g.lineTo(290,351);g.stroke();
      }
    }else if(['pan','boil','sauce','saute'].includes(kind)){
      g.fillStyle='#46625e';g.fillRect(74,169,319,281);g.strokeStyle='#243f40';g.lineWidth=6;g.beginPath();g.ellipse(232,301,112,96,0,0,Math.PI*2);g.stroke();
      if(s.heat>.05){g.strokeStyle=s.heat>.75?'#ce7844':'#d4b16d';g.lineWidth=5;g.beginPath();g.ellipse(234,314,102,86,0,0,Math.PI*2);g.stroke();}
      this.sprite(g,kind==='boil'?'pot':'pan',79,168,320,303);
      const cooked=clamp(s.cooked/(step.seconds||12));
      if(kind==='pan'){
        const flipTime=s.flipped?s.elapsed-(s.flipAt||s.elapsed):10,lift=flipTime<.8?Math.sin(flipTime/.8*Math.PI)*65:0;
        g.save();g.translate(235,291-lift);if(flipTime<.8)g.scale(1,Math.cos(flipTime/.8*Math.PI*2));g.fillStyle=cooked>.85?'#c99545':'#e1b74f';g.beginPath();g.ellipse(0,0,77,67,0,0,Math.PI*2);g.fill();this.foodPieces(g,'pepper',0,0,13);g.restore();
      }else if(kind==='boil'){g.strokeStyle='#e3cd8c';g.lineWidth=3;for(let i=0;i<10;i++){g.beginPath();g.moveTo(183+i*10,263);g.quadraticCurveTo(165+i*10,278,186+i*10,303);g.stroke();}this.sprite(g,'colander',367,246,107,123);if(s.drained)this.foodPieces(g,'rice',420,311,13);}
      else if(kind==='sauce'){g.fillStyle='#ab4934';g.beginPath();g.ellipse(234,288,76,62,0,0,Math.PI*2);g.fill();this.foodPieces(g,'sauce',231,286,18);}
      else this.foodPieces(g,'chicken',229,286,9,cooked);
      if(s.overheat>2&&kind!=='boil')this.charred(g,235,288,Math.min(1,s.overheat/8));
      if(step.turns){const a=s.turns*Math.PI*2;g.save();g.translate(p?p.lastX*480:236+Math.cos(a)*41,p?p.lastY*480:285+Math.sin(a)*36);g.rotate(.4);this.sprite(g,'spoon',-22,-7,88,129);g.restore();}
      if(s.temperature>.4&&!this.reduced){g.strokeStyle='#f1e4c677';g.lineWidth=2;for(let i=0;i<3;i++){const drift=Math.sin(s.elapsed*2+i)*5;g.beginPath();g.moveTo(199+i*34,208);g.lineTo(195+i*34+drift,189);g.lineTo(200+i*34,174);g.stroke();}}
    }else if(kind==='plate'){
      this.plate(g,240,325,135);
      if(s.plated.length===3)this.sprite(g,DISHES[s.recipe].plate,85,170,310,304);
      else{
        for(const i of s.plated)this.foodPieces(g,step.items[i],217+i*18,321,16,1);
        for(let i=0;i<3;i++)if(!s.plated.includes(i)){
          const source=servingSource(i),pos=p?.drag===i?{x:p.lastX,y:p.lastY}:source,key=step.items[i];
          if(['chicken','pasta','omelet'].includes(key))this.foodPieces(g,key,pos.x*480,pos.y*480+18,key==='chicken'?4:10,1);
          else if(['rice','pepper','cheese'].includes(key))this.sprite(g,key,pos.x*480-45,pos.y*480-30,90,90);
          else if(key==='herbs')this.foodPieces(g,'pepper',pos.x*480,pos.y*480+20,8);
          else if(key==='sauce'){this.sprite(g,'bowl',pos.x*480-45,pos.y*480-25,90,90);g.fillStyle='#af5036';g.beginPath();g.ellipse(pos.x*480,pos.y*480+21,24,19,0,0,Math.PI*2);g.fill();}
          else this.sprite(g,key,pos.x*480-45,pos.y*480-25,90,90,[.17,.17,.66,.66]);
        }
        g.strokeStyle='#f3e4c2';g.setLineDash([5,7]);g.lineWidth=2;g.beginPath();g.ellipse(240,324,112,88,0,0,Math.PI*2);g.stroke();g.setLineDash([]);
      }
    }
  }
  point(e){const b=this.canvas.getBoundingClientRect();return {x:(e.clientX-b.left)/b.width,y:(e.clientY-b.top)/b.height};}
  charred(g,x,y,amount=1){g.fillStyle='#654632';for(let i=0;i<Math.ceil(10*amount);i++)g.fillRect(x+Math.cos(i*2.4)*51,y+Math.sin(i*2.4)*38,5+i%4,3+i%3);}
}
