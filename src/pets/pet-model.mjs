export const PET_KEY='dos-mundos-mascota-v1';
export const NEEDS=['food','water','clean','energy','joy'];
export const CARE=['stroke','brush','feed','drink','fetch','train','rest'];
const copy=value=>JSON.parse(JSON.stringify(value));
const clamp=(n,lo=0,hi=100)=>Math.max(lo,Math.min(hi,n));
export const emptyPet=()=>({version:1,revision:0,pet:null,updatedAt:0,recent:[]});
export function parsePet(raw){
  if(raw==null)return emptyPet();const d=JSON.parse(raw);
  if(!d||d.version!==1||!Number.isInteger(d.revision)||d.revision<0||!Number.isFinite(d.updatedAt)||!Array.isArray(d.recent))throw new Error('El registro de la mascota se conserva, pero esta versión no puede modificarlo.');
  if(d.pet!==null){const p=d.pet;if(!p||typeof p.id!=='string'||typeof p.name!=='string'||!p.name||p.name.length>24||!Number.isFinite(p.adoptedAt)||NEEDS.some(k=>!Number.isFinite(p.needs?.[k])||p.needs[k]<0||p.needs[k]>100)||['jc','gabi'].some(k=>!Number.isFinite(p.bond?.[k]))||!Number.isInteger(p.training?.sit)||p.training.sit<0||p.training.sit>3||!p.care||!p.milestones)throw new Error('No se puede leer la mascota guardada. Su registro queda intacto.');}
  return d;
}
export function petAt(doc,now=Date.now()){
  const d=copy(doc);if(!d.pet)return d;
  const hours=Math.min(24,Math.max(0,(now-d.updatedAt)/3600000)),n=d.pet.needs;
  for(const [key,rate,floor] of [['food',4,25],['water',5,25],['clean',1.5,30],['joy',2,30]])n[key]=Math.min(n[key],clamp(n[key]-hours*rate,floor));n.energy=clamp(n.energy+hours*6);
  return d;
}
export function applyPetCommand(document,command){
  const c=command,d=parsePet(JSON.stringify(document)),fail=message=>({ok:false,message});
  if(!c||!['jc','gabi'].includes(c.role)||typeof c.id!=='string'||!c.id||c.id.length>100||!Number.isFinite(c.at))return fail('Este cuidado no corresponde a un personaje válido.');
  if(d.recent.includes(c.id))return {ok:true,already:true,state:d};
  if(c.revision!==d.revision)return fail('La mascota ha cambiado en otra ventana. Vuelve a elegir el cuidado.');
  const next=petAt(d,c.at);let message='';
  if(c.type==='adopt'){
    if(d.pet)return fail('Ya hay un podenco en este hogar. Se conserva su progreso.');
    const name=String(c.name||'').trim().replace(/[\u0000-\u001f\u007f]/g,'');if(!name||name.length>24)return fail('Escribe un nombre de 1 a 24 caracteres.');
    next.pet={id:c.petId||c.id,name,breed:'podenco',coat:'canela-blanco',adoptedAt:c.at,personality:'Curioso y juguetón',needs:{food:80,water:85,clean:80,energy:80,joy:75},bond:{jc:0,gabi:0},training:{sit:0},care:Object.fromEntries(CARE.map(k=>[k,0])),milestones:{adopted:{at:c.at,role:c.role}}};message=name+' ya tiene un hogar. Se acerca para conocerte.';
  }else{
    const p=next.pet;if(!p||c.petId!==p.id||!CARE.includes(c.type))return fail('Vuelve a acercarte a tu podenco.');
    if(c.result?.kind!==c.type||c.result.completed!==true||!Number.isFinite(c.result.effort)||c.result.effort<1)return fail('Termina el cuidado antes de guardarlo.');
    if(c.type==='fetch'&&!c.result.returned)return fail('Espera a que vuelva con la pelota.');
    if(c.type==='train'&&!c.result.rewarded)return fail('Felicítale con el premio cuando se siente.');
    const n=p.needs;
    if(c.type==='stroke'){n.joy=clamp(n.joy+7);message='Le encantan tus caricias.';}
    if(c.type==='brush'){n.clean=clamp(n.clean+22);n.joy=clamp(n.joy+5);message='Pelo limpio y un podenco contento.';}
    if(c.type==='feed'){n.food=clamp(n.food+30);message='Ha comido y se relame satisfecho.';}
    if(c.type==='drink'){n.water=clamp(n.water+35);message='Agua fresca. Mueve la cola para darte las gracias.';}
    if(c.type==='fetch'){n.joy=clamp(n.joy+12);n.energy=clamp(n.energy-4);n.water=clamp(n.water-2);p.milestones.firstFetch??={at:c.at,role:c.role};message='¡La ha traído! Otra vez cuando quieras.';}
    if(c.type==='train'){p.training.sit=Math.min(3,p.training.sit+1);n.joy=clamp(n.joy+6);if(p.training.sit===3){p.milestones.sitLearned??={at:c.at,role:c.role};message='¡Ha aprendido a sentarse!';}else message='Se ha sentado. Aprendizaje '+p.training.sit+' de 3.';}
    if(c.type==='rest'){n.energy=clamp(n.energy+25);message='Un descanso en su rincón. Energía recuperada.';}
    p.bond[c.role]=clamp(p.bond[c.role]+(['fetch','train'].includes(c.type)?3:2));p.care[c.type]=(Number(p.care[c.type])||0)+1;
  }
  next.revision++;next.updatedAt=Math.max(d.updatedAt,c.at);next.recent=[...d.recent.slice(-31),c.id];return {ok:true,state:next,message};
}
