import test from 'node:test';
import assert from 'node:assert/strict';
import {profileDefault,evolveProfile,activeMoods,emptyPlans,applyPlanCommand,progressFor,planMemory} from '../src/life/life-model.mjs';
import {LifeStore} from '../src/life/life-store.mjs';
import {PlanSync} from '../src/life/plan-sync.mjs';
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),data};};
let sequence=0;const command=(role,type,extra={},at=100000)=>({id:'test-'+(++sequence),at,role,type,...extra});
const apply=(s,c)=>{const r=applyPlanCommand(s,c,c.role);assert.ok(r.ok,r.message);return r.state;};
const event=(role,kind,at=100100)=>command(role,'event',{event:{kind,label:kind,day:2,time:600}},at);

test('unconfigured characters keep native rewards and mood time follows the game clock',()=>{
  let p=profileDefault();p=evolveProfile(p,{kind:'reading',clock:3000,at:100,energy:80}).profile;
  assert.equal(activeMoods(p,3001)[0].id,'focused');assert.equal(activeMoods(p,3120).length,0);assert.equal(activeMoods(p,2999).length,0);
  const r=evolveProfile(p,{kind:'reading',clock:3035,at:99999999,energy:80});assert.equal(r.bonus.fun,0);assert.equal(r.bonus.xp,0);
});
test('inspiration grants cooking XP once, favorite activities cap fun and editing grants nothing',()=>{
  let p={...profileDefault(),traits:['creative','homebody'],likes:['cook'],favoriteFood:'omelet'};
  p=evolveProfile(p,{kind:'reading',clock:3000,at:1,energy:80}).profile;
  const result=evolveProfile(p,{kind:'cook',room:'home',recipe:'omelet',clock:3030,at:2,energy:80});
  assert.deepEqual(result.bonus,{fun:3,xp:2,xpTarget:'cooking'});assert.equal(result.profile.moods.some(m=>m.id==='inspired'),false);
  assert.equal(evolveProfile(result.profile,{kind:'cook',clock:3060,at:3,energy:80}).bonus.xp,0);
});
test('relaxation and pride are consumed and tired mood can be relieved by rest',()=>{
  let p={...profileDefault(),traits:['active']};p=evolveProfile(p,{kind:'aerial',clock:3000,at:1,energy:20}).profile;
  assert.deepEqual(p.moods.map(m=>m.id),['proud','tired']);
  const social=evolveProfile(p,{kind:'social',clock:3015,at:2,energy:20});assert.equal(social.bonus.fun,1);assert.ok(!social.profile.moods.some(m=>m.id==='proud'));
  const rest=evolveProfile(social.profile,{kind:'rest',clock:3105,at:3,energy:60});assert.ok(!rest.profile.moods.some(m=>m.id==='tired'));assert.ok(rest.profile.moods.some(m=>m.id==='relaxed'));
});
test('profiles are isolated by role and name and never replace future or corrupt versions',()=>{
  const storage=memory(),jc=new LifeStore({name:'QA',role:'jc'},storage),gabi=new LifeStore({name:'QA',role:'gabi'},storage);
  assert.ok(jc.configure({traits:['creative'],likes:['cook'],favoriteFood:''},[]).ok);assert.deepEqual(gabi.profile.traits,[]);
  storage.setItem(jc.key,'{"version":99,"future":true}');const future=new LifeStore({name:'QA',role:'jc'},storage);
  assert.equal(future.write(profileDefault()).ok,false);assert.equal(storage.getItem(jc.key),'{"version":99,"future":true}');
  storage.setItem(jc.key,'{old raw');assert.equal(new LifeStore({name:'QA',role:'jc'},storage).readOnly,true);assert.equal(storage.getItem(jc.key),'{old raw');
});
test('storage failure cannot consume a mood or grant its bonus',()=>{
  const storage=memory(),store=new LifeStore({name:'QA',role:'jc'},storage);store.configure({traits:['creative'],likes:[],favoriteFood:''},[]);
  store.activity({kind:'reading',clock:3000,at:1,energy:80});const before=JSON.stringify(store.profile);storage.setItem=()=>{throw new Error('quota');};
  assert.equal(store.activity({kind:'cook',clock:3030,at:2,energy:80}).ok,false);assert.equal(JSON.stringify(store.profile),before);
});
test('only own role can join or contribute and a plan counts successful later activities',()=>{
  let s=emptyPlans();const spoof=command('gabi','join',{plan:'dinner'});assert.equal(applyPlanCommand(s,spoof,'jc').ok,false);
  s=apply(s,command('jc','join',{plan:'dinner'}));s=apply(s,event('gabi','cook'));assert.equal(s.plans.dinner.members.gabi,undefined);
  s=apply(s,event('jc','cook',99999));assert.equal(progressFor(s.plans.dinner,'jc').count,0);
  s=apply(s,event('jc','cook'));assert.equal(progressFor(s.plans.dinner,'jc').count,1);assert.equal(s.plans.dinner.status,'active');
});
test('a maximum of two active plans survives concurrent starts and resuming',()=>{
  let s=apply(emptyPlans(),command('jc','join',{plan:'dinner'}));s=apply(s,command('gabi','join',{plan:'madrid'}));
  assert.equal(applyPlanCommand(s,command('jc','join',{plan:'active'}),'jc').ok,false);
  s=apply(s,command('jc','leave',{plan:'dinner'}));s=apply(s,command('jc','join',{plan:'active'}));assert.equal(s.plans.dinner.status,'paused');
  assert.equal(applyPlanCommand(s,command('gabi','join',{plan:'dinner'}),'gabi').ok,false);
});
test('sports require three different activities per player and grant one deterministic memory',()=>{
  let s=apply(emptyPlans(),command('jc','join',{plan:'active'}));s=apply(s,command('gabi','join',{plan:'active'}));
  for(const role of ['jc','gabi']){s=apply(s,event(role,'aerial'));s=apply(s,event(role,'aerial'));assert.equal(progressFor(s.plans.active,role).count,1);s=apply(s,event(role,'strength'));s=apply(s,event(role,'mobility'));}
  assert.equal(s.plans.active.status,'completed');assert.equal(planMemory(s.plans.active).id,'vida-active');
  const again=apply(s,event('jc','cardio'));assert.deepEqual(again.plans.active,s.plans.active);assert.equal(applyPlanCommand(s,command('jc','join',{plan:'active'}),'jc').ok,false);
});
test('dinner needs both players ready and two fresh own confirmations at home',()=>{
  let s=apply(emptyPlans(),command('jc','join',{plan:'dinner'}));s=apply(s,command('gabi','join',{plan:'dinner'}));
  s=apply(s,event('jc','cook'));s=apply(s,event('gabi','cook'));
  assert.equal(applyPlanCommand(s,command('jc','confirm',{plan:'dinner',room:'cinema',peerAt:100100}),'jc').ok,false);
  assert.equal(applyPlanCommand(s,command('jc','confirm',{plan:'dinner',room:'home',peerAt:1}),'jc').ok,false);
  s=apply(s,command('jc','confirm',{plan:'dinner',room:'home',peerAt:100100},100100));assert.equal(s.plans.dinner.status,'active');
  s=apply(s,command('gabi','confirm',{plan:'dinner',room:'home',peerAt:100150,day:2},100150));assert.equal(s.plans.dinner.status,'completed');
  s=apply(s,command('gabi','rename',{plan:'dinner',title:'Nuestra cena'}));assert.equal(planMemory(s.plans.dinner).customTitle,'Nuestra cena');
});
test('retries use receipts and leaving preserves contributions while stopping new ones',()=>{
  let s=apply(emptyPlans(),command('jc','join',{plan:'madrid'}));const e=event('jc','park');s=apply(s,e);assert.deepEqual(apply(s,e),s);
  s=apply(s,command('jc','leave',{plan:'madrid'}));s=apply(s,event('jc','coffee'));assert.deepEqual(Object.keys(s.plans.madrid.members.jc.progress),['park']);
  s=apply(s,command('jc','join',{plan:'madrid'}));assert.equal(progressFor(s.plans.madrid,'jc').count,1);
});
test('future plans are rejected without normalization or loss of unknown fields',()=>{
  const raw={version:99,plans:{future:{anything:true}}};assert.throws(()=>applyPlanCommand(raw,command('jc','join',{plan:'dinner'}),'jc'));
  const s={...emptyPlans(),future:{keep:true}};assert.deepEqual(apply(s,command('jc','join',{plan:'dinner'})).future,{keep:true});
});

const settle=()=>new Promise(r=>setTimeout(r,0));
function server(){let value=null;const listeners=new Set();const api=()=>({online:false,connected(){return this.online;},subscribe(fn){listeners.add(fn);fn(value);return ()=>listeners.delete(fn);},async transact(update){await settle();const next=update(value);if(next===undefined)return {committed:false};value=next;for(const fn of listeners)fn(value);return {committed:true,snapshot:{val:()=>value}};}});return {api,get:()=>value};}
test('two offline clients merge their own joins and contributions without overwriting the other',async()=>{
  const db=server(),a=db.api(),b=db.api(),sa=memory(),sb=memory();
  const jc=new PlanSync(a,{name:'QA JC',role:'jc'},()=>{},sa),gabi=new PlanSync(b,{name:'QA Gabi',role:'gabi'},()=>{},sb);
  jc.command('join',{plan:'active'});gabi.command('join',{plan:'active'});
  for(const kind of ['strength','cardio','aerial']){jc.event({kind,label:kind,day:2,time:600});gabi.event({kind,label:kind,day:2,time:600});}
  a.online=true;b.online=true;jc.connect();gabi.connect();for(let i=0;i<30;i++)await settle();
  assert.equal(jc.pending.length,0);assert.equal(gabi.pending.length,0);assert.equal(db.get().plans.active.status,'completed');assert.deepEqual(jc.view,gabi.view);
  assert.equal(Object.keys(db.get().plans.active.members.jc.progress).length,3);assert.equal(Object.keys(db.get().plans.active.members.gabi.progress).length,3);
  jc.destroy();gabi.destroy();
});
test('offline outbox survives reload, denial and retry without duplicate contributions',async()=>{
  const db=server(),api=db.api(),storage=memory();let client=new PlanSync(api,{name:'QA',role:'jc'},()=>{},storage);
  client.command('join',{plan:'madrid'});client.event({kind:'park',label:'Paseo',day:2,time:600});client.destroy();
  client=new PlanSync(api,{name:'QA',role:'jc'},()=>{},storage);assert.equal(progressFor(client.view.plans.madrid,'jc').count,1);
  const actual=api.transact;api.transact=async()=>{throw new Error('permission denied');};api.online=true;client.connect();await settle();await settle();assert.equal(client.pending.length,2);
  api.transact=actual;client.retry();for(let i=0;i<12;i++)await settle();assert.equal(client.pending.length,0);assert.equal(progressFor(client.view.plans.madrid,'jc').count,1);client.destroy();
});
test('quota failure rejects a new plan instead of displaying unpersisted progress',()=>{
  const storage=memory();storage.setItem=()=>{throw new Error('quota');};const sync=new PlanSync({connected:()=>false},{name:'QA',role:'jc'},()=>{},storage);
  assert.equal(sync.command('join',{plan:'dinner'}).ok,false);assert.deepEqual(sync.view,emptyPlans());assert.equal(sync.pending.length,0);
});
test('subscribing during an in-flight first command eventually clears the acknowledged outbox',async()=>{
  const db=server(),api=db.api();api.online=true;const client=new PlanSync(api,{name:'QA',role:'jc'},()=>{},memory());
  client.command('join',{plan:'dinner'});client.connect();for(let i=0;i<20;i++)await settle();
  assert.equal(client.pending.length,0);assert.equal(db.get().plans.dinner.members.jc.active,true);client.destroy();
});
test('a conflicting server limit exposes the blocked command for safe dismissal',async()=>{
  const db=server(),other=db.api();other.online=true;let root=apply(emptyPlans(),command('gabi','join',{plan:'dinner'}));root=apply(root,command('gabi','join',{plan:'madrid'}));await other.transact(()=>root);
  const api=db.api(),client=new PlanSync(api,{name:'QA',role:'jc'},()=>{},memory());client.command('join',{plan:'active'});api.online=true;client.connect();for(let i=0;i<8;i++)await settle();
  assert.ok(client.errors.length);assert.equal(client.pending.length,1);assert.ok(client.discard(client.pending[0].id));assert.equal(client.pending.length,0);assert.equal(db.get().plans.active,undefined);client.destroy();
});
