let pending;
export function loadPetAssets(){
  if(!pending){let timer;const load=(async()=>{const response=await fetch(new URL('../../assets/pets/pet-atlas.json',import.meta.url));if(!response.ok)throw new Error('No se pudieron cargar los dibujos del podenco.');const manifest=await response.json(),result={};
    await Promise.all(Object.entries(manifest.atlases).map(async([id,sheet])=>{const image=new Image();image.src=new URL('../../assets/pets/'+sheet.image,import.meta.url).href;await image.decode();if(image.naturalWidth!==sheet.width||image.naturalHeight!==sheet.height)throw new Error('Los dibujos de la mascota están incompletos.');result[id]={...sheet,image};}));return result;
  })();pending=Promise.race([load,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Los dibujos están tardando. Puedes reintentar o volver a casa.')),20000);})]).catch(error=>{pending=null;throw error;}).finally(()=>clearTimeout(timer));}return pending;
}
export function petFrame(actor,now,reduced=false){
  const phase=reduced?0:Math.floor(now/180)%3;
  if(actor.pose==='walk')return ['up','down','left','right'].includes(actor.face)?actor.face+phase:'down'+phase;
  if(actor.pose==='sleep')return 'sleep'+(reduced?0:Math.floor(now/900)%2);
  if(actor.pose==='eat')return 'eat'+(reduced?0:Math.floor(now/260)%2);
  if(actor.pose==='sit')return 'sit'+(reduced?0:Math.floor(now/1100)%2);
  if(actor.pose==='paw')return 'paw'+(reduced?0:Math.floor(now/500)%2);
  if(actor.pose==='happy')return reduced?'idle0':Math.floor(now/350)%2?'happy':'idle0';
  return 'idle'+(reduced?0:Math.floor(now/900)%2);
}
export function sprite(g,sheet,key,x,y,w,h){const f=sheet?.frames[key];if(f)g.drawImage(sheet.image,...f,Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
export function drawPet(g,art,actor,now,size=44,reduced=false){if(!art)return;g.save();g.fillStyle='#27352c33';g.beginPath();g.ellipse(actor.x,actor.y-2,size*.26,3,0,0,Math.PI*2);g.fill();sprite(g,art.dog,petFrame(actor,now,reduced),actor.x-size/2,actor.y-size,size,size);g.restore();}
