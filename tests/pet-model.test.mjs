import test from 'node:test';
import assert from 'node:assert/strict';
import {PET_KEY,CARE,emptyPet,parsePet,petAt,applyPetCommand} from '../src/pets/pet-model.mjs';
import {PetStore} from '../src/pets/pet-store.mjs';
import {CareSession,DOG_HOME,BALL_HOME,BOWL,TREAT} from '../src/pets/care-session.mjs';
import {PetWander,PET_CORNER} from '../src/pets/pet-wander.mjs';
import {HOUSE} from '../src/interiors/house-map.mjs';
import {canStand,clearSegment,distance} from '../src/engine/navigation.mjs';
// Unit tests use isolated storage. Real Web Locks are exercised in Chromium;
// Node's process-wide lock implementation is not the browser implementation.
Object.defineProperty(globalThis.navigator,'locks',{value:undefined,configurable:true});
const at=1000000;
const adopt=()=>applyPetCommand(emptyPet(),{id:'adoption',type:'adopt',name:'Canela',role:'jc',at,revision:0}).state;
const cmd=(doc,type,id='care-'+doc.revision,role='jc')=>({id,type,role,at:doc.updatedAt,revision:doc.revision,petId:doc.pet.id,result:{kind:type,completed:true,effort:1,returned:true,rewarded:true}});
const advance=(s,seconds)=>{for(let i=0;i<seconds*60;i++)s.update(1/60);return s;};
class Memory{constructor(){this.items=new Map();}getItem(k){return this.items.get(k)??null;}setItem(k,v){this.items.set(k,v);}}

test('adoption is opt in, sanitizes the name and never replaces a pet',()=>{
  assert.equal(parsePet(null).pet,null);const d=adopt();assert.equal(d.pet.breed,'podenco');assert.equal(d.pet.name,'Canela');assert.equal(d.revision,1);
  assert.equal(applyPetCommand(d,{id:'other',type:'adopt',name:'Otro',revision:1,role:'gabi',at}).ok,false);
  for(const name of ['',' '.repeat(3),'x'.repeat(25)])assert.equal(applyPetCommand(emptyPet(),{id:'bad',type:'adopt',name,revision:0,role:'jc',at}).ok,false);
});
test('every complete activity has a real effect and separate JC/Gabi bonds',()=>{
  let d=adopt();d.pet.needs={food:40,water:40,clean:40,energy:40,joy:40};
  for(const type of CARE){const r=applyPetCommand(d,cmd(d,type,undefined,type==='brush'?'gabi':'jc'));assert.ok(r.ok,type);d=r.state;assert.equal(d.pet.care[type],1);}
  assert.ok(d.pet.needs.food>40);assert.ok(d.pet.needs.water>40);assert.ok(d.pet.needs.clean>40);assert.ok(d.pet.needs.energy>40);assert.ok(d.pet.needs.joy>40);assert.equal(d.pet.training.sit,1);assert.equal(d.pet.bond.gabi,2);assert.ok(d.pet.bond.jc>2);
});
test('replaying a completed action, stale tabs and older receipts cannot duplicate rewards',()=>{
  let d=adopt();const first=cmd(d,'train','first'),r=applyPetCommand(d,first);d=r.state;
  assert.equal(applyPetCommand(d,first).already,true);assert.deepEqual(applyPetCommand(d,first).state,d);
  assert.equal(applyPetCommand(d,{...first,id:'stale-tab'}).ok,false);
  for(let i=0;i<40;i++)d=applyPetCommand(d,cmd(d,'stroke','new-'+i)).state;
  assert.equal(d.recent.length,32);assert.equal(applyPetCommand(d,first).ok,false);assert.equal(d.pet.care.train,1);
});
test('incomplete, canceled, mismatched, NaN and unrewarded activities grant nothing',()=>{
  const d=adopt(),before=structuredClone(d);
  for(const changes of [{result:{}},{result:{kind:'stroke',completed:true}},{result:{kind:'stroke',completed:true,effort:NaN}},{role:'npc'},{petId:'wrong'},{result:{kind:'brush',completed:true,effort:1}}])assert.equal(applyPetCommand(d,{...cmd(d,'stroke'),...changes}).ok,false);
  assert.equal(applyPetCommand(d,{...cmd(d,'fetch'),result:{kind:'fetch',completed:true,effort:1}}).ok,false);
  assert.equal(applyPetCommand(d,{...cmd(d,'train'),result:{kind:'train',completed:true,effort:1}}).ok,false);assert.deepEqual(d,before);
});
test('three rewarded lessons teach sitting and later practice stays capped',()=>{
  let d=adopt();for(let i=0;i<5;i++)d=applyPetCommand(d,cmd(d,'train')).state;
  assert.equal(d.pet.training.sit,3);assert.ok(d.pet.milestones.sitLearned);assert.equal(d.pet.care.train,5);
});
test('offline needs are gentle, bounded and unaffected by moving the clock backwards',()=>{
  const d=adopt();assert.deepEqual(petAt(d,at-60000),d);const later=petAt(d,at+1000*3600*100);assert.equal(later.pet.needs.food,25);assert.equal(later.pet.needs.energy,100);assert.deepEqual(petAt(d,at+24*3600000),later);assert.equal(d.pet.needs.food,80);
  d.pet.needs.water=20;assert.equal(petAt(d,at).pet.needs.water,20);
});
test('unknown fields survive care and future or corrupt records are read only',async()=>{
  const storage=new Memory(),d=adopt();d.future={keep:['yes']};d.pet.future={keep:true};storage.setItem(PET_KEY,JSON.stringify(d));let store=new PetStore(storage);assert.ok((await store.execute(cmd(d,'brush'))).ok);assert.deepEqual(store.doc.future,d.future);assert.deepEqual(store.doc.pet.future,d.pet.future);
  for(const raw of ['{broken',JSON.stringify({...d,version:2}),JSON.stringify({...d,pet:false}),JSON.stringify({...d,pet:{...d.pet,needs:{}}})]){storage.setItem(PET_KEY,raw);store=new PetStore(storage);assert.ok(store.readOnly);assert.equal((await store.execute(cmd(d,'stroke'))).ok,false);assert.equal(storage.getItem(PET_KEY),raw);}
});
test('a failed storage write leaves the prior record intact and the exact action can retry once',async()=>{
  const storage=new Memory(),d=adopt();storage.setItem(PET_KEY,JSON.stringify(d));storage.setItem('dos-mundos-v29','legacy bytes');const store=new PetStore(storage),c=cmd(d,'fetch'),original=storage.setItem;storage.setItem=()=>{throw new Error('quota');};
  assert.equal((await store.execute(c)).ok,false);assert.deepEqual(store.doc,d);assert.deepEqual(JSON.parse(storage.getItem(PET_KEY)),d);storage.setItem=original;
  assert.ok((await store.execute(c)).ok);assert.ok((await store.execute(c)).already);assert.equal(store.doc.pet.care.fetch,1);assert.equal(storage.getItem('dos-mundos-v29'),'legacy bytes');
});
test('two stores reject a conflicting revision without losing the first completed care',async()=>{
  const storage=new Memory();storage.setItem(PET_KEY,JSON.stringify(adopt()));const a=new PetStore(storage),b=new PetStore(storage),first=cmd(a.doc,'feed'),second=cmd(b.doc,'drink','other','gabi');assert.ok((await a.execute(first)).ok);assert.equal((await b.execute(second)).ok,false);assert.equal(JSON.parse(storage.getItem(PET_KEY)).pet.care.feed,1);assert.equal(JSON.parse(storage.getItem(PET_KEY)).pet.care.drink,0);
});
test('carrying out real strokes or holding is easy; canceling an incomplete stroke rolls it back',()=>{
  const s=new CareSession('stroke');s.down({x:300,y:210});s.move({x:340,y:240});assert.ok(s.progress>0);s.cancel();assert.equal(s.progress,0);advance(s,3);assert.equal(s.completed,false);
  s.down({x:320,y:225});advance(s,1.8);assert.ok(s.completed);assert.ok(s.result().effort);const b=new CareSession('brush');b.down({x:300,y:240});for(let i=0;i<8;i++)b.move({x:i%2?370:260,y:240});assert.ok(b.completed);
});
test('offering food or a training reward requires a completed tap, not pointer cancel',()=>{
  const s=new CareSession('feed');s.down(BOWL);s.cancel();advance(s,3);assert.equal(s.completed,false);s.down(BOWL);s.up(BOWL);advance(s,2.4);assert.ok(s.completed);
  const t=new CareSession('train');advance(t,2);assert.equal(t.phase,'reward');assert.equal(t.completed,false);t.down(TREAT);t.cancel();advance(t,2);assert.equal(t.completed,false);t.down(TREAT);t.up(TREAT);advance(t,1);assert.ok(t.completed&&t.rewarded);
});
test('a ball throw respects the release position and succeeds only after chasing and returning',()=>{
  const s=new CareSession('fetch');s.down(BALL_HOME);s.move({x:220,y:300});s.up({x:195,y:205});assert.deepEqual(s.goal,{x:195,y:205});advance(s,.8);assert.equal(s.completed,false);advance(s,8);assert.ok(s.completed&&s.returned);assert.ok(distance(s.dog,DOG_HOME)<2);
  const canceled=new CareSession('fetch');canceled.down(BALL_HOME);canceled.move({x:490,y:200});canceled.cancel();advance(canceled,10);assert.equal(canceled.completed,false);assert.equal(canceled.phase,'ready');
});
test('the podenco follows through all rooms using existing collision paths without blocking the exit',()=>{
  const pet=new PetWander();assert.ok(canStand(PET_CORNER,HOUSE));
  for(const human of [{x:640,y:408},{x:204,y:160},{x:672,y:164},{x:352,y:508}]){
    pet.call(human);for(let i=0;i<1200;i++){const before={...pet.actor};pet.update(.05,{...human,moving:false},i*50);assert.ok(canStand(pet.actor,HOUSE));assert.ok(clearSegment(before,pet.actor,HOUSE));if(distance(pet.actor,human)<65)break;}
    assert.ok(distance(pet.actor,human)<65,JSON.stringify(human));assert.ok(pet.approach().approaches.length);
  }
});
