import test from 'node:test';
import assert from 'node:assert/strict';
import {GymRoutine,routineCodeFor,parseRoutineCode,choiceLabel,routineBreath} from '../src/gym-games/routine-model.mjs';
import {GYM_PROGRESS} from '../src/gym-games/progression.mjs';
import {exercisePose} from '../src/characters/exercise-actor.mjs';

const advance=(g,t,step=.01)=>{for(let n=0;n<t-1e-8;n+=step)g.update(Math.min(step,t-n));};
const tap=(g,k)=>{g.input(k,true);g.input(k,false);};
function play(g,risk='safe',step=.01){
  g.start();
  while(g.state.phase!=='done'){
    const s=g.state;
    if(s.phase==='choose')g.choose(risk);
    if(s.phase==='exercise'||s.phase==='finale'){
      if(s.type==='weights'){
        if(s.phase==='exercise'){
          if(s.cooldown<=0&&s.rep<3){if(s.power<s.plan[s.round].targets[s.rep])g.input('action',true);else g.input('action',false);}
        }else if(!s.finalDone)g.input('action',s.finalHold<2);
      }else if(s.type==='cardio'){
        const note=s.notes.find(n=>n.result===null&&s.phaseTime>=n.at);
        if(note)tap(g,note.side);
      }else if(s.type==='silks'){
        if(s.phase==='finale'){if(!s.finalDone)g.input('action',s.height>.08);}
        else if(s.phaseTime<3)g.input('action',s.height<(risk==='bold'?.82:.57));
        else if(s.phaseTime<6){g.input('action',false);g.input('left',s.balance>.02);g.input('right',s.balance<-.02);}
        else if(!s.secured)tap(g,'action');
      }else{
        g.input('action',routineBreath(s).inhale);
      }
    }
    g.update(step);
  }
  return g.result();
}

test('routine codes reproduce a format, sport, difficulty, track and seed without importing score',()=>{
  for(const type of GYM_PROGRESS.sports)for(const level of ['suave','normal','reto'])for(const routine of ['base','flow']){
    const code=routineCodeFor(type,level,0xab1234,routine),spec=parseRoutineCode(code+' · 999/1000');
    assert.deepEqual(spec,{engine:'routine',type,level,routine,seed:0xab1234});
    assert.deepEqual(new GymRoutine(type,level,spec.seed,routine).snapshot(),new GymRoutine(type,level,spec.seed,routine).snapshot());
  }
  for(const code of ['ATLAS-T-N-000001','ATLAS2-T-N-Z-000001','ATLAS2-T-N-B-<script>'])assert.equal(parseRoutineCode(code),null);
});
test('all four routines finish in 45 active seconds and an unattended screen cannot claim progress',()=>{
  for(const type of GYM_PROGRESS.sports){const g=new GymRoutine(type);g.start();advance(g,50);assert.equal(g.result().elapsed,45);assert.equal(g.state.phase,'done');assert.equal(g.result().effort,false);assert.equal(g.state.rounds.length,3);}
});
test('safe and demanding decisions change the attainable points and actual movement requirements',()=>{
  for(const type of GYM_PROGRESS.sports){
    const safe=play(new GymRoutine(type,'normal',243),'safe'),bold=play(new GymRoutine(type,'normal',243),'bold');
    assert.equal(safe.effort,true,type);assert.equal(bold.effort,true,type);
    assert.ok(safe.score>=740&&safe.score<=760,JSON.stringify({type,safe}));
    assert.ok(bold.score>=970&&bold.score<=1000,JSON.stringify({type,bold}));
    assert.equal(safe.rounds.every(r=>r.risk==='safe'),true);assert.equal(bold.rounds.every(r=>r.risk==='bold'),true);
  }
  assert.match(choiceLabel('silks','base',0,'safe'),/Nudo/);assert.match(choiceLabel('silks','flow',0,'bold'),/Mariposa/);
});
test('missed strength lifts and wrong cardio steps score below controlled actions; taps cannot farm a note',()=>{
  const weights=new GymRoutine('weights');weights.start();advance(weights,7);for(let i=0;i<3;i++){tap(weights,'action');advance(weights,.5);}assert.equal(weights.state.reps.reduce((n,v)=>n+v,0),0);
  const cardio=new GymRoutine('cardio');cardio.start();advance(cardio,7.9);tap(cardio,'right');assert.equal(cardio.state.notes[0].result,0);const hits=cardio.state.hits;for(let i=0;i<30;i++)tap(cardio,'left');assert.equal(cardio.state.hits,hits);
});
test('silks figures and articulated poses reflect risk, height, balance and newly unlocked routine',()=>{
  const g=new GymRoutine('silks','normal',44,'flow');g.start();advance(g,5);g.choose('bold');advance(g,2);g.input('action',true);advance(g,2);g.input('action',false);advance(g,1.2);
  assert.equal(g.state.figure,'butterfly');assert.ok(g.state.height>.7);
  const first=exercisePose(g.state);assert.equal(first.figure,'butterfly');g.state.balance=.5;assert.notEqual(exercisePose(g.state).lean,first.lean);
  const w=new GymRoutine('weights');w.start();advance(w,7);const down=exercisePose(w.state);w.input('action',true);advance(w,.8);assert.ok(exercisePose(w.state).lift>down.lift);
});
test('pause and restore preserve decisions, score and timer while releasing all held controls',()=>{
  const g=new GymRoutine('silks','reto',55);g.start();advance(g,5.5);g.choose('bold');advance(g,2);g.input('action',true);advance(g,.5);g.pause();const saved=g.snapshot();advance(g,20);assert.deepEqual(g.snapshot(),saved);
  const restored=GymRoutine.restore(saved);assert.equal(restored.state.paused,true);assert.deepEqual(restored.state.held,[]);assert.equal(restored.state.choices[0],'bold');restored.resume();advance(restored,.2);assert.ok(restored.state.elapsed>saved.elapsed);
  for(const broken of [{...saved,version:3},{...saved,elapsed:46},{...saved,plan:[]},{...saved,notes:null},{...saved,balance:NaN},{...saved,choices:['weird',null,null]}])assert.throws(()=>GymRoutine.restore(broken));
});
test('30 Hz and 100 Hz routines keep the same clock and comparable achievable scores',()=>{
  for(const type of GYM_PROGRESS.sports){const a=play(new GymRoutine(type,'normal',85),'bold',.01),b=play(new GymRoutine(type,'normal',85),'bold',1/30);assert.equal(a.elapsed,b.elapsed);assert.ok(Math.abs(a.score-b.score)<30,JSON.stringify({type,a,b}));}
});
test('progression grants real routines and accessories incrementally, preserving unknown compatible fields',()=>{
  let data={...GYM_PROGRESS.empty(),future:'keep'};assert.equal(GYM_PROGRESS.unlocked(data,'silks','flow'),false);assert.throws(()=>GYM_PROGRESS.equip(data,'wraps'));
  const first=GYM_PROGRESS.award(data,'silks');data=first.data;assert.deepEqual(first.earned,['Muñequeras Atlas']);data=GYM_PROGRESS.equip(data,'wraps');assert.equal(data.equipped,'wraps');
  const second=GYM_PROGRESS.award(data,'silks');data=second.data;assert.ok(second.earned.includes('Vela y mariposa'));assert.equal(GYM_PROGRESS.unlocked(data,'silks','flow'),true);assert.equal(GYM_PROGRESS.unlocked(data,'weights','flow'),false);
  const third=GYM_PROGRESS.award(data,'weights');assert.ok(third.earned.includes('Muñequeras lavanda'));assert.equal(third.data.future,'keep');assert.equal(third.data.sessions,3);assert.equal(data.sessions,2);
  assert.throws(()=>GYM_PROGRESS.read({...data,version:2}));
});
test('advanced routines change the lift targets, intervals, silks figures and mobility cadence',()=>{
  for(const type of GYM_PROGRESS.sports){
    const a=new GymRoutine(type,'normal',21,'base'),b=new GymRoutine(type,'normal',21,'flow');a.start();b.start();advance(a,5);advance(b,5);a.choose('bold');b.choose('bold');advance(a,2);advance(b,2);
    if(type==='weights')assert.notDeepEqual(a.state.plan[0].targets,b.state.plan[0].targets);
    if(type==='cardio')assert.notDeepEqual(a.state.notes,b.state.notes);
    if(type==='silks')assert.notEqual(a.state.figure,b.state.figure);
    if(type==='stretch')assert.notEqual(routineBreath(a.state).period,routineBreath(b.state).period);
    const played=play(new GymRoutine(type,'normal',21,'flow'),'bold');assert.equal(played.effort,true,type);assert.ok(played.score>960,JSON.stringify({type,played}));
  }
});
test('warmup lets the original character try the movement without scoring or advancing rewards',()=>{
  const g=new GymRoutine('weights');g.start();g.input('action',true);advance(g,.5);assert.ok(exercisePose(g.state).lift>.4);assert.equal(g.state.score,0);assert.equal(g.state.inputs,0);assert.equal(g.state.engaged,0);advance(g,5);assert.deepEqual(g.state.held,[]);
});
